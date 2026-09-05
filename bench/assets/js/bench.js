document.addEventListener('DOMContentLoaded', function () {
  let html2canvasPromise = null;

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (html2canvasPromise) return html2canvasPromise;

    html2canvasPromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = function () {
        if (window.html2canvas) {
          resolve(window.html2canvas);
        } else {
          reject(new Error('html2canvas loaded without exposing window.html2canvas'));
        }
      };
      script.onerror = function () {
        reject(new Error('Failed to load html2canvas'));
      };
      document.head.appendChild(script);
    });

    return html2canvasPromise;
  }

  function waitForImages(root) {
    const images = Array.from(root.querySelectorAll('img'));
    return Promise.all(images.map(function (image) {
      return new Promise(function (resolve) {
        if (image.complete && image.naturalWidth > 0) {
          resolve();
          return;
        }
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  function slugifyValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'leaderboard';
  }

  function triggerBlobDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }

  const table = document.getElementById('leaderboard-table');
  if (table) {
    const tbody = table.querySelector('tbody');
    const allRows = Array.from(tbody.querySelectorAll('tr'));
    const openRows = allRows.filter(function (row) {
      return row.dataset.dataset === 'open';
    });
    const closedRows = allRows.filter(function (row) {
      return row.dataset.dataset === 'closed';
    });
    const closedRowsByParent = new Map();
    const closedOnlyRows = [];
    const openRowsByModelId = new Map();
    openRows.forEach(function (row) {
      openRowsByModelId.set(row.dataset.modelId || '', row);
    });
    closedRows.forEach(function (row) {
      const parentId = row.dataset.parentId || '';
      if (parentId) {
        if (!closedRowsByParent.has(parentId)) closedRowsByParent.set(parentId, []);
        closedRowsByParent.get(parentId).push(row);
      } else {
        closedOnlyRows.push(row);
      }
    });
    const headers = Array.from(table.querySelectorAll('th[data-sort-key]'));
    const exportHeaders = Array.from(table.querySelectorAll('thead th'));
    const requiredColumnIndices = new Set([0, 1]);
    const leaderboardDatasetFilter = document.getElementById('leaderboard-dataset-filter');
    const leaderboardSectionHead = document.getElementById('leaderboard-section-head');
    const leaderboardCard = document.getElementById('leaderboard-card');
    const leaderboardTableWrap = document.getElementById('leaderboard-table-wrap');
    const leaderboardTopScrollbar = document.getElementById('leaderboard-top-scrollbar');
    const leaderboardTopScrollbarTrack = document.getElementById('leaderboard-top-scrollbar-track');
    const leaderboardTopScrollbarInner = document.getElementById('leaderboard-top-scrollbar-inner');
    const leaderboardStickyHead = document.getElementById('leaderboard-sticky-head');
    const leaderboardStickyHeadViewport = document.getElementById('leaderboard-sticky-head-viewport');
    const leaderboardStickyHeadTable = document.getElementById('leaderboard-sticky-head-table');
    const siteHeader = document.querySelector('.site-header');
    const leaderboardNote = document.querySelector('.bench-leaderboard-note');
    const leaderboardDownloadButton = document.getElementById('leaderboard-download-image');
    const leaderboardDownloadLabel = leaderboardDownloadButton ? leaderboardDownloadButton.querySelector('.bench-button-label') : null;
    const leaderboardShareButton = document.getElementById('leaderboard-share-x');
    const leaderboardExportPanel = document.getElementById('leaderboard-export-panel');
    const leaderboardExportColumns = document.getElementById('leaderboard-export-columns');
    const leaderboardExportSelectAll = document.getElementById('leaderboard-export-select-all');
    const leaderboardExportCancel = document.getElementById('leaderboard-export-cancel');
    const leaderboardExportConfirm = document.getElementById('leaderboard-export-confirm');
    const defaultDownloadLabel = leaderboardDownloadLabel ? leaderboardDownloadLabel.textContent : 'Image';
    const defaultExportSortKeys = new Set([
      'final_score',
      'pass3',
      'pass_at_3',
      'overall_score',
      'avg_latency_seconds',
      'cost_usd'
    ]);
    const columnOptions = exportHeaders.map(function (header, index) {
      return {
        index: index,
        label: header.textContent.replace(/[↕↑↓]/g, '').trim(),
        sortKey: header.dataset.sortKey || '',
        required: requiredColumnIndices.has(index)
      };
    });
    let currentKey = 'final_score';
    let currentDirection = 'desc';
    let currentDatasetView = 'all';
    let syncingTopScrollbar = false;
    let syncingTableWrap = false;
    let syncingStickyViewport = false;

    function releaseHorizontalSyncFlag(flagName) {
      window.requestAnimationFrame(function () {
        if (flagName === 'top') syncingTopScrollbar = false;
        if (flagName === 'table') syncingTableWrap = false;
        if (flagName === 'sticky') syncingStickyViewport = false;
      });
    }

    function syncLeaderboardHorizontalScroll(left, source) {
      if (leaderboardTableWrap && source !== 'table') {
        syncingTableWrap = true;
        leaderboardTableWrap.scrollLeft = left;
        releaseHorizontalSyncFlag('table');
      }

      if (leaderboardTopScrollbarTrack && source !== 'top') {
        syncingTopScrollbar = true;
        leaderboardTopScrollbarTrack.scrollLeft = left;
        releaseHorizontalSyncFlag('top');
      }

      if (leaderboardStickyHeadViewport && source !== 'sticky') {
        syncingStickyViewport = true;
        leaderboardStickyHeadViewport.scrollLeft = left;
        releaseHorizontalSyncFlag('sticky');
      }
    }

    function buildStickyHeader() {
      if (!leaderboardStickyHeadTable || !table.tHead) return;
      leaderboardStickyHeadTable.innerHTML = '';
      leaderboardStickyHeadTable.appendChild(table.tHead.cloneNode(true));
      Array.from(leaderboardStickyHeadTable.querySelectorAll('th[data-sort-key]')).forEach(function (stickyHeader) {
        stickyHeader.classList.add('bench-sortable');
        stickyHeader.addEventListener('click', function () {
          const sourceHeader = headers.find(function (header) {
            return header.dataset.sortKey === stickyHeader.dataset.sortKey;
          });
          if (sourceHeader) sourceHeader.click();
        });
      });
    }

    function syncStickyHeaderWidths() {
      if (!leaderboardStickyHeadTable || !leaderboardStickyHeadViewport) return;
      const sourceHeadRow = table.tHead ? table.tHead.rows[0] : null;
      const stickyHeadRow = leaderboardStickyHeadTable.tHead ? leaderboardStickyHeadTable.tHead.rows[0] : null;
      if (!sourceHeadRow || !stickyHeadRow) return;
      let colgroup = leaderboardStickyHeadTable.querySelector('colgroup');

      if (!colgroup) {
        colgroup = document.createElement('colgroup');
        leaderboardStickyHeadTable.insertBefore(colgroup, leaderboardStickyHeadTable.firstChild);
      }

      if (colgroup.children.length !== sourceHeadRow.cells.length) {
        colgroup.innerHTML = '';
        Array.from(sourceHeadRow.cells).forEach(function () {
          colgroup.appendChild(document.createElement('col'));
        });
      }

      const stickyCols = Array.from(colgroup.children);

      Array.from(sourceHeadRow.cells).forEach(function (cell, index) {
        const stickyCell = stickyHeadRow.cells[index];
        const stickyCol = stickyCols[index];
        if (!stickyCell) return;
        const width = Math.ceil(cell.getBoundingClientRect().width);
        if (stickyCol) {
          stickyCol.style.width = width + 'px';
          stickyCol.style.minWidth = width + 'px';
          stickyCol.style.maxWidth = width + 'px';
        }
        stickyCell.style.width = width + 'px';
        stickyCell.style.minWidth = width + 'px';
        stickyCell.style.maxWidth = width + 'px';
      });

      leaderboardStickyHeadViewport.style.width = leaderboardTableWrap ? leaderboardTableWrap.clientWidth + 'px' : '';
      leaderboardStickyHeadTable.style.width = table.scrollWidth + 'px';
      leaderboardStickyHeadTable.style.tableLayout = 'fixed';
      syncLeaderboardHorizontalScroll(leaderboardTableWrap ? leaderboardTableWrap.scrollLeft : 0, 'table');
    }

    function setStickyOffsets() {
      if (!leaderboardTableWrap) return;
      const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 64;
      const scrollbarHeight = leaderboardTopScrollbar && leaderboardTopScrollbar.classList.contains('is-visible')
        ? leaderboardTopScrollbar.getBoundingClientRect().height
        : 0;
      const stickyHeadHeight = leaderboardStickyHead && leaderboardStickyHead.classList.contains('is-visible')
        ? leaderboardStickyHead.getBoundingClientRect().height
        : 0;
      const rankCell = table.querySelector('thead th:first-child');
      const rankWidth = rankCell ? Math.ceil(rankCell.getBoundingClientRect().width) : 84;
      leaderboardTableWrap.style.setProperty('--bench-sticky-table-top', Math.ceil(headerHeight + scrollbarHeight + 8) + 'px');
      leaderboardTableWrap.style.setProperty('--bench-sticky-rank-width', rankWidth + 'px');
      if (leaderboardTopScrollbar) {
        leaderboardTopScrollbar.style.top = Math.ceil(headerHeight + 8) + 'px';
      }
      if (leaderboardStickyHead) {
        leaderboardStickyHead.style.top = Math.ceil(headerHeight + scrollbarHeight + 8) + 'px';
      }
      if (leaderboardTableWrap) {
        leaderboardTableWrap.style.setProperty('--bench-sticky-table-body-top', Math.ceil(headerHeight + scrollbarHeight + stickyHeadHeight + 8) + 'px');
      }
    }

    function syncTopScrollbarWidth() {
      if (!leaderboardTableWrap || !leaderboardTopScrollbarInner || !leaderboardTopScrollbarTrack || !leaderboardTopScrollbar) return;
      leaderboardTopScrollbar.style.width = leaderboardTableWrap.clientWidth + 'px';
      leaderboardTopScrollbarInner.style.width = table.scrollWidth + 'px';
      syncLeaderboardHorizontalScroll(leaderboardTableWrap.scrollLeft, 'table');
      syncStickyHeaderWidths();
      setStickyOffsets();
    }

    function updateTopScrollbarVisibility() {
      if (!leaderboardTableWrap || !leaderboardTopScrollbar || !leaderboardTopScrollbarTrack || !leaderboardCard) return;

      const canScrollX = table.scrollWidth - leaderboardTableWrap.clientWidth > 2;
      const cardRect = leaderboardCard.getBoundingClientRect();
      const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 64;
      const shouldShow = canScrollX && cardRect.top <= headerHeight + 20 && cardRect.bottom >= headerHeight + 84;
      const headRect = leaderboardTableWrap.getBoundingClientRect();
      const stickyHeadTop = headerHeight + (shouldShow ? (leaderboardTopScrollbar ? leaderboardTopScrollbar.getBoundingClientRect().height : 0) : 0) + 8;
      const shouldShowStickyHead = headRect.top <= stickyHeadTop && cardRect.bottom >= stickyHeadTop + 56;

      leaderboardTopScrollbar.hidden = !shouldShow;
      leaderboardTopScrollbar.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
      leaderboardTopScrollbar.classList.toggle('is-visible', shouldShow);
      if (leaderboardStickyHead) {
        leaderboardStickyHead.hidden = !shouldShowStickyHead;
        leaderboardStickyHead.setAttribute('aria-hidden', shouldShowStickyHead ? 'false' : 'true');
        leaderboardStickyHead.classList.toggle('is-visible', shouldShowStickyHead);
      }
      syncStickyHeaderWidths();
      setStickyOffsets();
    }

    function parseDateValue(value) {
      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function parseValue(row, key, index) {
      const cell = row.children[index];
      if (key === 'released_at' || key === 'updated_at') {
        return parseDateValue(cell.dataset.value || cell.innerText.trim());
      }
      if (key === 'model_name' || key === 'platform' || key === 'openclaw_version') {
        return cell.innerText.trim().toLowerCase();
      }
      const parsed = Number(cell.dataset.value || cell.textContent.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function updateRanks(sortedRows) {
      sortedRows.forEach(function (row, idx) {
        setRankCell(row, idx + 1);
      });
    }

    function setRankCell(row, rank) {
      if (!row || !row.children.length) return;
      const cell = row.children[0];
      cell.dataset.value = rank;
      if (row.dataset.dataset === 'closed') {
        row.dataset.closedRank = String(rank);
        const badge = cell.querySelector('.bench-closed-rank');
        if (badge) {
          badge.textContent = '#' + rank;
        } else {
          cell.textContent = '#' + rank;
        }
      } else {
        row.dataset.openRank = String(rank);
        cell.textContent = rank;
      }
    }

    function rowIsVisible(row) {
      return row.style.display !== 'none';
    }

    function visibleRows() {
      return allRows.filter(rowIsVisible);
    }

    function compareRows(key, index, direction) {
      return function (a, b) {
        const av = parseValue(a, key, index);
        const bv = parseValue(b, key, index);
        if (typeof av === 'string' || typeof bv === 'string') {
          return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return direction === 'asc' ? av - bv : bv - av;
      };
    }

    function finalScoreIndex() {
      return headers.findIndex(function (header) {
        return header.dataset.sortKey === 'final_score';
      }) + 1;
    }

    function pairedOpenRows() {
      return openRows.filter(function (row) {
        return row.dataset.hasClosed === 'true';
      });
    }

    function pairedClosedRows() {
      return closedRows.filter(function (row) {
        return row.dataset.parentId;
      });
    }

    function rankRowsByFinalScore(sourceRows) {
      const index = finalScoreIndex();
      return sourceRows.slice().sort(compareRows('final_score', index, 'desc'));
    }

    function currentBenchLanguage() {
      if (window.ClawProBenchI18n && window.ClawProBenchI18n.language) {
        return window.ClawProBenchI18n.language();
      }
      return document.documentElement.getAttribute('data-bench-lang') || 'en';
    }

    function pairedRankText(openPairedRank, closedPairedRank, openGlobalRank, closedGlobalRank) {
      const delta = closedPairedRank - openPairedRank;
      const openPairedTotal = pairedOpenRows().length;
      const closedPairedTotal = pairedClosedRows().length;
      if (currentBenchLanguage() === 'zh') {
        let movement = '持平';
        if (delta > 0) movement = '下降 ' + delta;
        if (delta < 0) movement = '上升 ' + Math.abs(delta);
        return (
          'Open+Closed 可比排名：开源 #' + openPairedRank +
          '/' + openPairedTotal +
          ' -> 闭源 #' + closedPairedRank +
          '/' + closedPairedTotal +
          '（' + movement + '）；全榜：开源 #' + openGlobalRank +
          '/' + openRows.length +
          '，闭源 #' + closedGlobalRank + '/' + closedRows.length
        );
      }

      let movement = 'unchanged';
      if (delta > 0) movement = 'down ' + delta;
      if (delta < 0) movement = 'up ' + Math.abs(delta);
      return (
        'Open+Closed ranks: open #' + openPairedRank +
        '/' + openPairedTotal +
        ' -> closed #' + closedPairedRank +
        '/' + closedPairedTotal +
        ' (' + movement + '); full: open #' + openGlobalRank +
        '/' + openRows.length +
        ', closed #' + closedGlobalRank + '/' + closedRows.length
      );
    }

    function syncPairedRankData() {
      const openPairedRankByModel = new Map();
      rankRowsByFinalScore(pairedOpenRows()).forEach(function (row, index) {
        openPairedRankByModel.set(row.dataset.modelId || '', index + 1);
      });

      const closedPairedRankByModel = new Map();
      rankRowsByFinalScore(pairedClosedRows()).forEach(function (row, index) {
        closedPairedRankByModel.set(row.dataset.parentId || '', index + 1);
      });

      pairedClosedRows().forEach(function (row) {
        const modelId = row.dataset.parentId || '';
        const target = row.querySelector('.bench-paired-rank-data');
        if (!target) return;
        const openPairedRank = openPairedRankByModel.get(modelId);
        const closedPairedRank = closedPairedRankByModel.get(modelId);
        if (!openPairedRank || !closedPairedRank) {
          target.textContent = '';
          return;
        }
        target.textContent = pairedRankText(
          openPairedRank,
          closedPairedRank,
          row.dataset.openRank || '?',
          row.dataset.closedRank || '?'
        );
      });
    }

    function closedRankValue(row) {
      const parsed = Number(row.dataset.closedRank || row.children[0].dataset.value || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function restoreOpenRankCell(row) {
      const openRank = row.dataset.openRank || row.children[0].dataset.value || row.children[0].textContent;
      setRankCell(row, openRank);
    }

    function syncCanonicalRanks() {
      rankRowsByFinalScore(openRows).forEach(function (row, index) {
        setRankCell(row, index + 1);
      });
      rankRowsByFinalScore(closedRows).forEach(function (row, index) {
        setRankCell(row, index + 1);
      });
      syncPairedRankData();
    }

    function appendVisibleRow(row) {
      row.style.display = '';
      tbody.appendChild(row);
    }

    function shouldUseClosedRankDefault(key, direction) {
      return currentDatasetView === 'all' && key === 'final_score' && direction === 'desc';
    }

    function appendAllRowsByClosedRank(key, index, direction) {
      const appendedOpenRows = new Set();
      closedRows
        .slice()
        .sort(function (a, b) {
          return closedRankValue(a) - closedRankValue(b);
        })
        .forEach(function (closedRow) {
          const parentId = closedRow.dataset.parentId || '';
          const openRow = parentId ? openRowsByModelId.get(parentId) : null;
          if (openRow && !appendedOpenRows.has(openRow)) {
            restoreOpenRankCell(openRow);
            appendVisibleRow(openRow);
            appendedOpenRows.add(openRow);
          }
          appendVisibleRow(closedRow);
        });

      openRows
        .filter(function (row) {
          return !appendedOpenRows.has(row);
        })
        .sort(compareRows(key, index, direction))
        .forEach(function (row) {
          restoreOpenRankCell(row);
          appendVisibleRow(row);
        });
    }

    function appendOpenRowWithClosed(row) {
      row.style.display = '';
      tbody.appendChild(row);
      if (currentDatasetView !== 'all' && currentDatasetView !== 'paired') return;
      const attachedClosedRows = closedRowsByParent.get(row.dataset.modelId || '') || [];
      attachedClosedRows
        .slice()
        .sort(function (a, b) {
          return closedRankValue(a) - closedRankValue(b);
        })
        .forEach(function (closedRow) {
          closedRow.style.display = '';
          tbody.appendChild(closedRow);
        });
    }

    function appendClosedOnlyRows() {
      closedOnlyRows
        .slice()
        .sort(function (a, b) {
          return closedRankValue(a) - closedRankValue(b);
        })
        .forEach(function (row) {
          row.style.display = '';
          tbody.appendChild(row);
        });
    }

    function updateSortIndicators() {
      headers.forEach(function (header) {
        const indicator = header.querySelector('.bench-sort-indicator');
        header.classList.remove('bench-sort-active', 'bench-sort-asc', 'bench-sort-desc');
        if (!indicator) return;
        indicator.textContent = '↕';
        if (header.dataset.sortKey === currentKey) {
          header.classList.add('bench-sort-active', currentDirection === 'asc' ? 'bench-sort-asc' : 'bench-sort-desc');
          indicator.textContent = currentDirection === 'asc' ? '↑' : '↓';
        }
      });

      if (leaderboardStickyHeadTable) {
        Array.from(leaderboardStickyHeadTable.querySelectorAll('th[data-sort-key]')).forEach(function (header) {
          const indicator = header.querySelector('.bench-sort-indicator');
          header.classList.remove('bench-sort-active', 'bench-sort-asc', 'bench-sort-desc');
          if (!indicator) return;
          indicator.textContent = '↕';
          if (header.dataset.sortKey === currentKey) {
            header.classList.add('bench-sort-active', currentDirection === 'asc' ? 'bench-sort-asc' : 'bench-sort-desc');
            indicator.textContent = currentDirection === 'asc' ? '↑' : '↓';
          }
        });
      }
    }

    function sortRows(key, direction) {
      const index = headers.findIndex(function (header) {
        return header.dataset.sortKey === key;
      }) + 1;
      const activeHeader = headers[index - 1];
      const primaryRows = currentDatasetView === 'closed'
        ? closedRows
        : (currentDatasetView === 'paired' ? pairedOpenRows() : openRows);

      const sorted = primaryRows.slice().sort(compareRows(key, index, direction));

      allRows.forEach(function (row) {
        row.style.display = 'none';
      });

      if (currentDatasetView === 'closed') {
        updateRanks(sorted);
        sorted.forEach(function (row) {
          row.style.display = '';
          tbody.appendChild(row);
        });
      } else if (shouldUseClosedRankDefault(key, direction)) {
        syncCanonicalRanks();
        appendAllRowsByClosedRank(key, index, direction);
      } else {
        updateRanks(sorted);
        sorted.forEach(appendOpenRowWithClosed);
        if (currentDatasetView === 'all') appendClosedOnlyRows();
      }

      table.dataset.sortKey = key;
      table.dataset.sortDirection = direction;
      table.dataset.sortLabel = activeHeader ? activeHeader.textContent.replace(/[↕↑↓]/g, '').trim() : key;
      table.dataset.datasetView = currentDatasetView;
      updateSortIndicators();
      syncTopScrollbarWidth();
      updateTopScrollbarVisibility();
    }

    headers.forEach(function (header) {
      header.classList.add('bench-sortable');
      header.addEventListener('click', function () {
        const key = header.dataset.sortKey;
        if (currentKey === key) {
          currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentKey = key;
          currentDirection = key === 'model_name' || key === 'platform' || key === 'updated_at' ? 'asc' : 'desc';
        }
        sortRows(currentKey, currentDirection);
      });
    });

    buildStickyHeader();
    syncCanonicalRanks();
    document.addEventListener('clawprobench:languagechange', syncPairedRankData);

    if (leaderboardDatasetFilter) {
      const datasetButtons = Array.from(leaderboardDatasetFilter.querySelectorAll('button[data-dataset-view]'));
      datasetButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          currentDatasetView = button.dataset.datasetView || 'all';
          datasetButtons.forEach(function (item) {
            item.classList.toggle('is-active', item === button);
          });
          sortRows(currentKey, currentDirection);
        });
      });
    }

    function openLeaderboardRow(row) {
      const href = row.dataset.href;
      if (!href) return;
      const nextHref = window.ClawProBenchI18n && window.ClawProBenchI18n.url
        ? window.ClawProBenchI18n.url(href)
        : href;
      window.location.href = nextHref;
    }

    allRows.forEach(function (row) {
      if (row.dataset.href) {
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'link');
        row.setAttribute('aria-label', '打开模型详情页');
        row.addEventListener('click', function () {
          openLeaderboardRow(row);
        });
        row.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            openLeaderboardRow(row);
          }
        });
      }
    });

    if (leaderboardTableWrap && leaderboardTopScrollbarTrack) {
      leaderboardTableWrap.addEventListener('scroll', function () {
        if (syncingTableWrap) return;
        syncLeaderboardHorizontalScroll(leaderboardTableWrap.scrollLeft, 'table');
      }, { passive: true });

      leaderboardTopScrollbarTrack.addEventListener('scroll', function () {
        if (syncingTopScrollbar) return;
        syncLeaderboardHorizontalScroll(leaderboardTopScrollbarTrack.scrollLeft, 'top');
      }, { passive: true });

      if (leaderboardStickyHeadViewport) {
        leaderboardStickyHeadViewport.addEventListener('scroll', function () {
          if (syncingStickyViewport) return;
          syncLeaderboardHorizontalScroll(leaderboardStickyHeadViewport.scrollLeft, 'sticky');
        }, { passive: true });
      }

      window.addEventListener('scroll', updateTopScrollbarVisibility, { passive: true });
      window.addEventListener('resize', function () {
        syncTopScrollbarWidth();
        updateTopScrollbarVisibility();
      }, { passive: true });
      window.addEventListener('load', function () {
        syncTopScrollbarWidth();
        updateTopScrollbarVisibility();
      });

      if (window.ResizeObserver) {
        const resizeObserver = new window.ResizeObserver(function () {
          syncTopScrollbarWidth();
          updateTopScrollbarVisibility();
        });
        resizeObserver.observe(leaderboardTableWrap);
        resizeObserver.observe(table);
      }
    }

    function setLeaderboardExportState(isLoading, label) {
      if (!leaderboardDownloadButton) return;
      leaderboardDownloadButton.disabled = isLoading;
      leaderboardDownloadButton.classList.toggle('is-loading', isLoading);
      if (leaderboardDownloadLabel) {
        leaderboardDownloadLabel.textContent = label || defaultDownloadLabel;
      }
      if (leaderboardExportConfirm) {
        leaderboardExportConfirm.disabled = isLoading;
        leaderboardExportConfirm.textContent = isLoading ? 'Rendering...' : 'Download';
      }
    }

    function getSelectedColumnIndices() {
      if (!leaderboardExportColumns) return columnOptions.map(function (option) { return option.index; });
      return Array.from(leaderboardExportColumns.querySelectorAll('input[type="checkbox"]'))
        .filter(function (input) { return input.checked; })
        .map(function (input) { return Number(input.value); });
    }

    function renderExportColumnOptions() {
      if (!leaderboardExportColumns) return;
      leaderboardExportColumns.innerHTML = columnOptions.map(function (option) {
        const requiredNote = option.required ? '<span class="bench-export-required-note">Required</span>' : '';
        const defaultSelected = option.required || defaultExportSortKeys.has(option.sortKey);
        return (
          '<label class="bench-export-column-item' + (option.required ? ' is-required' : '') + '">' +
            '<input type="checkbox" value="' + option.index + '"' + (option.required ? ' checked disabled' : (defaultSelected ? ' checked' : '')) + ' />' +
            '<span>' +
              '<span>' + option.label + '</span>' +
              requiredNote +
            '</span>' +
          '</label>'
        );
      }).join('');
    }

    function openExportPanel() {
      if (!leaderboardExportPanel) return;
      renderExportColumnOptions();
      leaderboardExportPanel.hidden = false;
      if (leaderboardDownloadButton) {
        leaderboardDownloadButton.setAttribute('aria-expanded', 'true');
      }
    }

    function closeExportPanel() {
      if (!leaderboardExportPanel) return;
      leaderboardExportPanel.hidden = true;
      if (leaderboardDownloadButton) {
        leaderboardDownloadButton.setAttribute('aria-expanded', 'false');
      }
    }

    function pruneExportTableColumns(tableNode, selectedColumnIndices) {
      if (!tableNode) return;
      const selected = new Set(selectedColumnIndices);
      Array.from(tableNode.querySelectorAll('tr')).forEach(function (row) {
        Array.from(row.children).forEach(function (cell, index) {
          if (!selected.has(index)) {
            cell.remove();
          }
        });
      });
    }

    function buildLeaderboardExportSurface(selectedColumnIndices) {
      if (!leaderboardSectionHead || !leaderboardCard) return null;

      const exportHost = document.createElement('div');
      exportHost.style.position = 'absolute';
      exportHost.style.left = '0';
      exportHost.style.top = '0';
      exportHost.style.opacity = '0';
      exportHost.style.pointerEvents = 'none';
      exportHost.style.zIndex = '-1';
      exportHost.style.width = 'auto';
      exportHost.style.padding = '0';
      exportHost.style.boxSizing = 'border-box';

      const exportSurface = document.createElement('div');
      exportSurface.className = 'bench-export-surface';
      exportSurface.style.display = 'inline-block';
      exportSurface.style.padding = '22px 18px 30px';
      exportSurface.style.boxSizing = 'border-box';
      exportSurface.style.borderRadius = '28px';
      exportSurface.style.background = 'linear-gradient(180deg, #faf6ef 0%, #f2ecdf 100%)';
      exportSurface.style.color = '#191918';
      exportSurface.style.fontFamily = window.getComputedStyle(document.body).fontFamily;

      const headClone = leaderboardSectionHead.cloneNode(true);
      headClone.style.marginBottom = '10px';
      const clonedHeadCopy = headClone.querySelector('.bench-head-copy');
      if (clonedHeadCopy) {
        clonedHeadCopy.style.maxWidth = 'none';
      }
      const clonedActions = headClone.querySelector('.bench-section-actions');
      if (clonedActions) clonedActions.remove();

      const cardClone = leaderboardCard.cloneNode(true);
      cardClone.classList.add('bench-export-card');
      const clonedStickyHead = cardClone.querySelector('.bench-table-sticky-head');
      const clonedTopScrollbar = cardClone.querySelector('.bench-table-top-scrollbar');
      if (clonedStickyHead) clonedStickyHead.remove();
      if (clonedTopScrollbar) clonedTopScrollbar.remove();
      const clonedTable = cardClone.querySelector('#leaderboard-table');
      const clonedTbody = clonedTable ? clonedTable.querySelector('tbody') : null;
      const clonedTableWrap = cardClone.querySelector('#leaderboard-table-wrap');
      if (clonedTable) clonedTable.removeAttribute('id');
      if (clonedTableWrap) {
        clonedTableWrap.style.overflow = 'visible';
        clonedTableWrap.style.maxWidth = 'none';
        clonedTableWrap.style.padding = '0';
      }
      cardClone.style.padding = '8px 14px 0';
      if (clonedTbody) {
        clonedTbody.innerHTML = '';
        visibleRows().forEach(function (row) {
          const clone = row.cloneNode(true);
          clone.removeAttribute('data-href');
          clonedTbody.appendChild(clone);
        });
      }
      pruneExportTableColumns(clonedTable, selectedColumnIndices);
      if (clonedTable) {
        clonedTable.style.tableLayout = 'auto';
        clonedTable.style.width = '100%';
        Array.from(clonedTable.querySelectorAll('.bench-pass-bar')).forEach(function (bar) {
          bar.remove();
        });
        Array.from(clonedTable.querySelectorAll('.bench-pass-cell')).forEach(function (cell) {
          cell.style.display = 'block';
          cell.style.minWidth = '0';
          cell.style.gap = '0';
          cell.style.gridTemplateColumns = 'none';
        });
        const exportedColumnKinds = selectedColumnIndices.map(function (originalIndex) {
          if (originalIndex === 0) return 'rank';
          if (originalIndex === 1) return 'model';
          return 'metric';
        });
        if (clonedTable.tHead) {
          const exportHeaderLabels = {
            final_score: 'Final',
            pass3: 'Pass^3',
            pass_at_3: 'Pass@3',
            overall_score: 'Avg',
            avg_latency_seconds: 'Runtime',
            cost_usd: 'Cost',
            total_tokens: 'Tokens',
            price_usd_input: 'Price',
            openclaw_version: 'OC Ver',
            released_at: 'Released',
            updated_at: 'Updated'
          };
          Array.from(clonedTable.tHead.querySelectorAll('.bench-sort-indicator')).forEach(function (indicator) {
            indicator.remove();
          });
          Array.from(clonedTable.tHead.querySelectorAll('th')).forEach(function (cell) {
            const sortKey = cell.dataset.sortKey;
            if (sortKey && exportHeaderLabels[sortKey]) {
              cell.textContent = exportHeaderLabels[sortKey];
            }
          });
        }
        Array.from(clonedTable.querySelectorAll('tr')).forEach(function (row) {
          const isHeaderRow = row.parentElement && row.parentElement.tagName.toLowerCase() === 'thead';
          Array.from(row.children).forEach(function (cell, index) {
            const originalIndex = selectedColumnIndices[index];
            const originalHeader = exportHeaders[originalIndex];
            const kind = exportedColumnKinds[index] || 'metric';
            const sortKey = originalHeader ? (originalHeader.dataset.sortKey || '') : (cell.dataset.sortKey || '');
            if (kind === 'rank') {
              cell.style.width = '24px';
              cell.style.minWidth = '24px';
              cell.style.maxWidth = '24px';
              cell.style.paddingLeft = '4px';
              cell.style.paddingRight = '4px';
              cell.style.textAlign = 'center';
            } else if (kind === 'model') {
              cell.style.width = '152px';
              cell.style.minWidth = '152px';
              cell.style.maxWidth = '152px';
              cell.style.paddingLeft = '8px';
              cell.style.paddingRight = '8px';
              cell.style.textAlign = 'left';
              cell.style.whiteSpace = 'normal';
              cell.style.wordBreak = 'break-word';
            } else {
              const metricWidth = sortKey === 'final_score' ? '96px' : '58px';
              cell.style.width = metricWidth;
              cell.style.minWidth = metricWidth;
              cell.style.maxWidth = metricWidth;
              cell.style.paddingLeft = '5px';
              cell.style.paddingRight = '5px';
              cell.style.textAlign = 'center';
              cell.style.whiteSpace = isHeaderRow ? 'normal' : 'nowrap';
              cell.style.wordBreak = isHeaderRow ? 'break-word' : 'normal';
              cell.style.lineHeight = isHeaderRow ? '1.15' : '';
            }
          });
        });
      }

      exportSurface.appendChild(headClone);
      exportSurface.appendChild(cardClone);
      exportHost.appendChild(exportSurface);
      document.body.appendChild(exportHost);

      const exportWidth = exportSurface.getBoundingClientRect().width;
      exportHost.style.width = exportWidth + 'px';

      return {
        host: exportHost,
        surface: exportSurface
      };
    }

    async function exportLeaderboardImage(selectedColumnIndices) {
      const exportNodes = buildLeaderboardExportSurface(selectedColumnIndices);
      if (!exportNodes) return;

      try {
        setLeaderboardExportState(true, 'Rendering...');
        const html2canvas = await loadHtml2Canvas();
        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : Promise.resolve();
        await Promise.all([fontsReady, waitForImages(exportNodes.surface)]);

        const exportRect = exportNodes.surface.getBoundingClientRect();
        const canvas = await html2canvas(exportNodes.surface, {
          backgroundColor: '#f2ecdf',
          scale: Math.min(2, window.devicePixelRatio || 1),
          useCORS: true,
          logging: false,
          width: Math.ceil(exportRect.width),
          height: Math.ceil(Math.max(exportRect.height, exportNodes.surface.scrollHeight)),
          scrollX: 0,
          scrollY: 0
        });

        const sortKey = slugifyValue(table.dataset.sortKey || 'final_score');
        const sortDirection = slugifyValue(table.dataset.sortDirection || 'desc');
        const datasetView = slugifyValue(table.dataset.datasetView || 'all');
        const modelCount = visibleRows().length;
        const filename = 'clawprobench-leaderboard-' + datasetView + '-' + sortKey + '-' + sortDirection + '-' + modelCount + '-rows.png';

        await new Promise(function (resolve, reject) {
          canvas.toBlob(function (blob) {
            if (!blob) {
              reject(new Error('Failed to render leaderboard image'));
              return;
            }
            triggerBlobDownload(blob, filename);
            resolve();
          }, 'image/png');
        });
      } catch (error) {
        console.error(error);
        window.alert('Failed to download the leaderboard image. Please try again.');
      } finally {
        exportNodes.host.remove();
        setLeaderboardExportState(false, defaultDownloadLabel);
      }
    }

    if (leaderboardDownloadButton) {
      leaderboardDownloadButton.addEventListener('click', function () {
        if (leaderboardExportPanel && !leaderboardExportPanel.hidden) {
          closeExportPanel();
        } else {
          openExportPanel();
        }
      });
    }

    if (leaderboardExportSelectAll) {
      leaderboardExportSelectAll.addEventListener('click', function () {
        if (!leaderboardExportColumns) return;
        Array.from(leaderboardExportColumns.querySelectorAll('input[type="checkbox"]')).forEach(function (input) {
          input.checked = true;
        });
      });
    }

    if (leaderboardExportCancel) {
      leaderboardExportCancel.addEventListener('click', function () {
        closeExportPanel();
      });
    }

    if (leaderboardExportConfirm) {
      leaderboardExportConfirm.addEventListener('click', function () {
        const selectedColumnIndices = getSelectedColumnIndices();
        closeExportPanel();
        exportLeaderboardImage(selectedColumnIndices);
      });
    }

    if (leaderboardShareButton) {
      leaderboardShareButton.addEventListener('click', function () {
        closeExportPanel();
        const shareText = 'Check out ClawProBench — a transparent benchmark for true intelligence in real-world AI agents. Explore it here: https://suyoumo.github.io/bench/';
        window.open(
          'https://x.com/intent/tweet?text=' + encodeURIComponent(shareText),
          '_blank',
          'noopener,noreferrer'
        );
      });
    }

    document.addEventListener('click', function (event) {
      if (!leaderboardExportPanel || leaderboardExportPanel.hidden) return;
      const withinActions = event.target.closest('.bench-section-actions');
      if (!withinActions) {
        closeExportPanel();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeExportPanel();
      }
    });

    sortRows(currentKey, currentDirection);
    syncTopScrollbarWidth();
    updateTopScrollbarVisibility();
  }

  let currentChartDataset = 'open';
  const chartRenderers = [];
  const chartDatasetFilters = Array.from(document.querySelectorAll('.leaderboard-chart-dataset-filter'));
  const chartDatasetButtons = chartDatasetFilters.reduce(function (buttons, filter) {
    return buttons.concat(Array.from(filter.querySelectorAll('button[data-chart-dataset]')));
  }, []);

  function updateChartDatasetButtons() {
    chartDatasetButtons.forEach(function (button) {
      button.classList.toggle('is-active', (button.dataset.chartDataset || 'open') === currentChartDataset);
    });
  }

  function renderDatasetCharts() {
    chartRenderers.forEach(function (render) {
      render();
    });
  }

  function selectedDatasetForChart(element) {
    const chartCard = element && element.closest ? element.closest('.bench-chart-card') : null;
    const activeButton = chartCard
      ? chartCard.querySelector('.leaderboard-chart-dataset-filter button.is-active[data-chart-dataset]')
      : null;
    if (activeButton) return activeButton.dataset.chartDataset === 'closed' ? 'closed' : 'open';
    return currentChartDataset;
  }

  chartDatasetButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      currentChartDataset = button.dataset.chartDataset === 'closed' ? 'closed' : 'open';
      updateChartDatasetButtons();
      renderDatasetCharts();
    });
  });
  updateChartDatasetButtons();

  const leaderboardChart = document.getElementById('leaderboard-chart-bars');
  const leaderboardMetric = document.getElementById('leaderboard-chart-metric');
  if (leaderboardChart && leaderboardMetric) {
    const leaderboardLimit = document.getElementById('leaderboard-chart-limit');
    const bars = Array.from(leaderboardChart.querySelectorAll('.bench-chart-item'));

    function parseChartNumber(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function parseVersion(value) {
      return String(value || '')
        .split('.')
        .reduce(function (total, part, index) {
          return total + parseChartNumber(part) / Math.pow(1000, index);
        }, 0);
    }

    function parseDate(value) {
      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function metricValue(bar, metric) {
      const raw = bar.dataset[metric] || '';
      if (metric === 'openclaw_version') return parseVersion(raw);
      if (metric === 'released_at' || metric === 'updated_at') return parseDate(raw);
      return parseChartNumber(raw);
    }

    function formatMetricValue(metric, format, bar) {
      const raw = bar.dataset[metric] || '';
      const value = metricValue(bar, metric);
      if (format === 'percent') return (value * 100).toFixed(1) + '%';
      if (format === 'decimal2') return value.toFixed(2);
      if (format === 'runtime') return value.toFixed(2) + 's';
      if (format === 'tokens') return Math.round(value).toLocaleString('en-US');
      if (format === 'currency') return '$' + value.toFixed(4);
      if (format === 'decimal4') return value.toFixed(4);
      if (format === 'version') return 'v' + raw;
      if (format === 'date') return String(raw).slice(0, 10);
      return raw;
    }

    function chartLimit(activeCount) {
      if (!leaderboardLimit || leaderboardLimit.value === 'all') return activeCount;
      const parsed = Number(leaderboardLimit.value);
      return Number.isFinite(parsed) ? parsed : activeCount;
    }

    function renderChart() {
      const selectedOption = leaderboardMetric.options[leaderboardMetric.selectedIndex];
      const metric = selectedOption.value;
      const direction = selectedOption.dataset.direction || 'desc';
      const format = selectedOption.dataset.format || 'percent';
      const activeDataset = selectedDatasetForChart(leaderboardChart);
      const activeBars = bars.filter(function (bar) {
        return (bar.dataset.dataset || 'open') === activeDataset;
      });
      const sorted = activeBars.slice().sort(function (a, b) {
        const av = metricValue(a, metric);
        const bv = metricValue(b, metric);
        return direction === 'asc' ? av - bv : bv - av;
      });
      const visibleBars = sorted.slice(0, chartLimit(activeBars.length));
      const values = visibleBars.map(function (bar) {
        return metricValue(bar, metric);
      });
      const max = values.length ? Math.max.apply(null, values) : 0;
      const min = values.length ? Math.min.apply(null, values) : 0;
      const range = max - min || 1;

      bars.forEach(function (bar) {
        bar.style.display = 'none';
      });

      sorted.forEach(function (bar, index) {
        const isVisible = index < visibleBars.length;
        const value = metricValue(bar, metric);
        const normalized = direction === 'asc' ? (max - value) / range : (value - min) / range;
        const height = 72 + normalized * 188;
        const fill = bar.querySelector('.bench-chart-fill');
        const rank = bar.querySelector('.bench-chart-rank');
        const valueNode = bar.querySelector('.bench-chart-value');
        const label = bar.querySelector('.bench-chart-label');
        if (fill) fill.style.height = height + 'px';
        if (rank) rank.textContent = isVisible ? index + 1 : '';
        if (valueNode) {
          valueNode.textContent = isVisible ? formatMetricValue(metric, format, bar) : '';
          valueNode.style.top = '';
          valueNode.style.bottom = (height + 2) + 'px';
        }
        bar.style.order = index;
        bar.dataset.activeMetric = metric;
        bar.style.display = isVisible ? '' : 'none';
        if (label) label.title = (bar.dataset.modelName || '') + ' · ' + (bar.dataset.provider || '') + ' · ' + (bar.dataset.platform || '');
      });
    }

    leaderboardMetric.addEventListener('change', renderChart);
    if (leaderboardLimit) leaderboardLimit.addEventListener('change', renderChart);
    chartRenderers.push(renderChart);
    renderChart();
  }

  function toSnakeCase(key) {
    return String(key || '')
      .replace(/([A-Z])/g, '_$1')
      .replace(/-/g, '_')
      .toLowerCase()
      .replace(/^_/, '');
  }

  function toCamelCase(key) {
    return toSnakeCase(key).replace(/_([a-z0-9])/g, function (_, letter) {
      return letter.toUpperCase();
    });
  }

  function toKebabCase(key) {
    return toSnakeCase(key).replace(/_/g, '-');
  }

  function readDataValue(element, key) {
    const snakeKey = toSnakeCase(key);
    const camelKey = toCamelCase(key);
    const kebabKey = toKebabCase(key);

    if (element.dataset[key] !== undefined) return element.dataset[key];
    if (element.dataset[snakeKey] !== undefined) return element.dataset[snakeKey];
    if (element.dataset[camelKey] !== undefined) return element.dataset[camelKey];

    const kebabAttr = element.getAttribute('data-' + kebabKey);
    if (kebabAttr !== null) return kebabAttr;

    const snakeAttr = element.getAttribute('data-' + snakeKey);
    if (snakeAttr !== null) return snakeAttr;

    return '';
  }

  function scatterValue(point, key) {
    const parsed = Number(readDataValue(point, key) || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function scatterFormat(value, format) {
    if (format === 'percent') return (value * 100).toFixed(1) + '%';
    if (format === 'currency') return '$' + value.toFixed(4);
    return String(value);
  }

  function renderScatterXAxisTicks(xAxis, minX, maxX, visibleMaxX, tickFormatter, tickValues) {
    let ticks = [];
    const rangeX = maxX - minX || 1;

    if (Array.isArray(tickValues) && tickValues.length) {
      ticks = tickValues.map(function (value) {
        return {
          value: value,
          left: ((value - minX) / rangeX) * 100
        };
      });
    } else {
      const tickCount = 6;
      const step = (visibleMaxX - minX) / (tickCount - 1 || 1);

      for (let value = minX; value < maxX; value += step) {
        ticks.push({
          value: value,
          left: ((value - minX) / rangeX) * 100
        });
      }

      if (!ticks.length || ticks[ticks.length - 1].value < maxX) {
        ticks.push({
          value: maxX,
          left: 100
        });
      }
    }

    xAxis.innerHTML = ticks.map(function (tick, index) {
      const classes = ['bench-scatter-x-tick'];
      if (index === 0) classes.push('is-edge-left');
      if (index === ticks.length - 1) classes.push('is-edge-right');
      return '<span class="' + classes.join(' ') + '" style="left:' + tick.left + '%">' + tickFormatter(tick.value) + '</span>';
    }).join('');
  }

  function initScatterChart(options) {
    const scatterPlot = document.getElementById(options.plotId);
    const scatterMetric = document.getElementById(options.metricId);
    const scatterTitle = document.getElementById(options.titleId);
    const scatterXAxis = document.getElementById(options.xAxisId);
    if (!scatterPlot || !scatterMetric || !scatterTitle || !scatterXAxis) return;

    const points = Array.from(scatterPlot.querySelectorAll('.bench-scatter-point'));
    const scatterViewport = scatterPlot.parentElement;
    const xMetric = options.xMetric;
    const xAxisFormatter = options.xAxisFormatter || function (value) { return String(Math.round(value)); };
    const xValueFormatter = options.xValueFormatter || function (value) { return String(value); };
    let scatterResizeFrame = 0;

    function optionValue(key, activeDataset) {
      const datasetKey = activeDataset + key.charAt(0).toUpperCase() + key.slice(1);
      return options[datasetKey] !== undefined ? options[datasetKey] : options[key];
    }

    function renderScatter() {
      const selected = scatterMetric.options[scatterMetric.selectedIndex];
      const metric = selected.value;
      const format = selected.dataset.format || 'percent';
      const activeDataset = selectedDatasetForChart(scatterPlot);
      scatterTitle.textContent = selected.text;

      const activePoints = points.filter(function (point) {
        return (point.dataset.dataset || 'open') === activeDataset;
      });
      points.forEach(function (point) {
        point.style.display = activePoints.includes(point) ? '' : 'none';
      });
      if (!activePoints.length) return;

      const xs = activePoints.map(function (point) { return scatterValue(point, xMetric); }).sort(function (a, b) { return a - b; });
      const ys = activePoints.map(function (point) { return scatterValue(point, metric); });
      const minX = optionValue('minX', activeDataset);
      const visibleMaxX = optionValue('visibleMaxX', activeDataset);
      const roundStep = optionValue('roundStep', activeDataset) || 10;
      const fixedMaxX = optionValue('fixedMaxX', activeDataset);
      const tickValues = optionValue('tickValues', activeDataset) || null;
      const maxDataX = xs[xs.length - 1] || visibleMaxX;
      const maxX = fixedMaxX !== undefined && fixedMaxX !== null
        ? fixedMaxX
        : Math.max(visibleMaxX, Math.ceil(maxDataX / roundStep) * roundStep);
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const minVisibleWidth = isMobile ? 760 : 980;
      const visibleWidth = Math.max((scatterViewport && scatterViewport.clientWidth) || 0, minVisibleWidth);
      const visibleRangeX = visibleMaxX - minX || 1;
      const plotWidth = Math.max(visibleWidth, Math.round(visibleWidth * ((maxX - minX) / visibleRangeX)));
      const minY = Math.min.apply(null, ys);
      const maxY = Math.max.apply(null, ys);
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;
      const overlapGroups = new Map();
      const leftEdgeEpsilon = rangeX === 0 ? 0 : Math.max(rangeX * 0.001, 0.0001);

      scatterPlot.style.width = plotWidth + 'px';
      scatterXAxis.style.width = plotWidth + 'px';
      renderScatterXAxisTicks(scatterXAxis, minX, maxX, visibleMaxX, xAxisFormatter, tickValues);

      activePoints.forEach(function (point) {
        const x = scatterValue(point, xMetric);
        const key = x.toFixed(4);
        if (!overlapGroups.has(key)) overlapGroups.set(key, []);
        overlapGroups.get(key).push(point);
      });

      const overlapOffsets = new Map();
      overlapGroups.forEach(function (group, key) {
        const count = group.length;
        const groupX = Number(key);
        const isLeftEdgeGroup = Number.isFinite(groupX) && groupX <= minX + leftEdgeEpsilon;
        group.forEach(function (point, index) {
          if (count <= 1) {
            overlapOffsets.set(point, 0);
            return;
          }
          if (isLeftEdgeGroup) {
            overlapOffsets.set(point, index * 12);
            return;
          }
          const centeredIndex = index - (count - 1) / 2;
          overlapOffsets.set(point, centeredIndex * 12);
        });
      });

      activePoints.forEach(function (point) {
        const x = scatterValue(point, xMetric);
        const y = scatterValue(point, metric);
        const left = Math.max(0, Math.min(100, ((x - minX) / rangeX) * 100));
        const bottom = 10 + ((y - minY) / rangeY) * 74;
        const offsetX = overlapOffsets.get(point) || 0;
        const modelName = readDataValue(point, 'model_name') || (point.querySelector('.bench-scatter-name') || {}).textContent || 'Unknown model';
        point.style.left = left + '%';
        point.style.bottom = bottom + '%';
        point.style.marginLeft = offsetX + 'px';
        point.classList.toggle('bench-scatter-point-flip', left > 84);
        point.setAttribute('aria-label', modelName + ' · ' + scatterFormat(y, format) + ' · ' + xValueFormatter(x));
        point.title = modelName + ' · ' + scatterFormat(y, format) + ' · ' + xValueFormatter(x);
      });
    }

    scatterMetric.addEventListener('change', renderScatter);
    window.addEventListener('resize', function () {
      if (scatterResizeFrame) window.cancelAnimationFrame(scatterResizeFrame);
      scatterResizeFrame = window.requestAnimationFrame(function () {
        scatterResizeFrame = 0;
        renderScatter();
      });
    });
    chartRenderers.push(renderScatter);
    renderScatter();
  }

  initScatterChart({
    plotId: 'leaderboard-scatter-plot',
    metricId: 'leaderboard-scatter-metric',
    titleId: 'leaderboard-scatter-y-title',
    xAxisId: 'leaderboard-scatter-x-axis',
    xMetric: 'avg_latency_seconds',
    minX: 45,
    visibleMaxX: 200,
    roundStep: 10,
    xAxisFormatter: function (value) {
      return Math.round(value) + 's';
    },
    xValueFormatter: function (value) {
      return value.toFixed(2) + 's';
    }
  });

  initScatterChart({
    plotId: 'leaderboard-cost-scatter-plot',
    metricId: 'leaderboard-cost-scatter-metric',
    titleId: 'leaderboard-cost-scatter-y-title',
    xAxisId: 'leaderboard-cost-scatter-x-axis',
    xMetric: 'cost_usd',
    minX: 0,
    visibleMaxX: 115,
    fixedMaxX: 115,
    roundStep: 10,
    tickValues: [0, 20, 40, 60, 80, 100, 115],
    closedVisibleMaxX: 30,
    closedFixedMaxX: null,
    closedTickValues: null,
    xAxisFormatter: function (value) {
      return '$' + Math.round(value);
    },
    xValueFormatter: function (value) {
      return '$' + value.toFixed(4);
    }
  });

  const taskGrid = document.getElementById('task-grid');
  if (taskGrid) {
    const cards = Array.from(taskGrid.querySelectorAll('.bench-task-card'));
    const datasetFilter = document.getElementById('task-dataset-filter');
    const datasetButtons = datasetFilter ? Array.from(datasetFilter.querySelectorAll('button[data-task-dataset]')) : [];
    const dimensionFilter = document.getElementById('task-dimension-filter');
    const difficultyFilter = document.getElementById('task-difficulty-filter');
    const searchInput = document.getElementById('task-search-input');
    let taskDatasetValue = 'all';

    function applyTaskFilters() {
      const dimensionValue = (dimensionFilter.value || 'all').toLowerCase();
      const difficultyValue = (difficultyFilter.value || 'all').toLowerCase();
      const searchValue = (searchInput.value || '').trim().toLowerCase();

      cards.forEach(function (card) {
        const matchesDataset = taskDatasetValue === 'all' || card.dataset.dataset === taskDatasetValue;
        const matchesDimension = dimensionValue === 'all' || card.dataset.dimension === dimensionValue;
        const matchesDifficulty = difficultyValue === 'all' || card.dataset.difficulty === difficultyValue;
        const matchesSearch = !searchValue || (card.dataset.search || '').toLowerCase().includes(searchValue);
        card.style.display = matchesDataset && matchesDimension && matchesDifficulty && matchesSearch ? '' : 'none';
      });
    }

    datasetButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        taskDatasetValue = button.dataset.taskDataset || 'all';
        datasetButtons.forEach(function (item) {
          item.classList.toggle('is-active', item === button);
        });
        applyTaskFilters();
      });
    });

    [dimensionFilter, difficultyFilter, searchInput].forEach(function (element) {
      element.addEventListener('input', applyTaskFilters);
      element.addEventListener('change', applyTaskFilters);
    });
  }

  const scenarioTables = document.querySelectorAll('.bench-scenario-table');
  scenarioTables.forEach(function (table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = Array.from(table.querySelectorAll('th[data-sort-key]'));
    let sortKey = 'avg_score';
    let direction = 'desc';

    function valueFor(row, key, index) {
      const cell = row.children[index];
      if (key === 'name' || key === 'dimension' || key === 'difficulty') {
        return cell.innerText.trim().toLowerCase();
      }
      if (key === 'strict_pass_k') {
        return cell.dataset.value === 'true' ? 1 : 0;
      }
      return Number(cell.dataset.value || cell.textContent.replace(/[^0-9.-]/g, ''));
    }

    function updateScenarioIndicators() {
      headers.forEach(function (header) {
        const indicator = header.querySelector('.bench-sort-indicator');
        if (!indicator) return;
        indicator.textContent = header.dataset.sortKey === sortKey ? (direction === 'asc' ? '↑' : '↓') : '↕';
        header.classList.toggle('bench-sort-active', header.dataset.sortKey === sortKey);
      });
    }

    function updateScenarioRanks(sortedRows) {
      sortedRows.forEach(function (row, idx) {
        const rankCell = row.children[0];
        if (rankCell) rankCell.textContent = idx + 1;
      });
    }

    function applyScenarioSort() {
      const index = headers.findIndex(function (header) {
        return header.dataset.sortKey === sortKey;
      }) + 1;
      const sorted = rows.slice().sort(function (a, b) {
        const av = valueFor(a, sortKey, index);
        const bv = valueFor(b, sortKey, index);
        if (typeof av === 'string' || typeof bv === 'string') {
          return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return direction === 'asc' ? av - bv : bv - av;
      });
      sorted.forEach(function (row) {
        tbody.appendChild(row);
      });
      updateScenarioRanks(sorted);
      updateScenarioIndicators();
    }

    headers.forEach(function (header) {
      header.addEventListener('click', function () {
        const key = header.dataset.sortKey;
        if (sortKey === key) {
          direction = direction === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          direction = key === 'name' || key === 'dimension' || key === 'difficulty' ? 'asc' : 'desc';
        }
        applyScenarioSort();
      });
    });

    applyScenarioSort();
  });

  document.querySelectorAll('.bench-task-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      const card = button.closest('.bench-task-card');
      const preview = card.querySelector('.bench-task-preview');
      const full = card.querySelector('.bench-task-full');
      const expanded = card.classList.contains('is-expanded');
      if (expanded) {
        card.classList.remove('is-expanded');
        button.setAttribute('aria-expanded', 'false');
      } else {
        card.classList.add('is-expanded');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
});
