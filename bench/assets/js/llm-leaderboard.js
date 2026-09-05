(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const card = document.getElementById('llm-board-card');
    const tableWrap = document.getElementById('llm-board-table-wrap');
    const table = document.getElementById('llm-board-table');
    if (!card || !tableWrap || !table) return;

    const topScrollbar = document.getElementById('llm-board-top-scrollbar');
    const topScrollbarTrack = document.getElementById('llm-board-top-scrollbar-track');
    const topScrollbarInner = document.getElementById('llm-board-top-scrollbar-inner');
    const stickyHead = document.getElementById('llm-board-sticky-head');
    const stickyHeadViewport = document.getElementById('llm-board-sticky-head-viewport');
    const stickyHeadTable = document.getElementById('llm-board-sticky-head-table');
    const siteHeader = document.querySelector('.site-header');

    let syncingTableWrap = false;
    let syncingTopScrollbar = false;
    let syncingStickyViewport = false;

    function release(flag) {
      window.requestAnimationFrame(function () {
        if (flag === 'top') syncingTopScrollbar = false;
        if (flag === 'table') syncingTableWrap = false;
        if (flag === 'sticky') syncingStickyViewport = false;
      });
    }

    function syncHorizontal(left, source) {
      if (source !== 'table') {
        syncingTableWrap = true;
        tableWrap.scrollLeft = left;
        release('table');
      }
      if (topScrollbarTrack && source !== 'top') {
        syncingTopScrollbar = true;
        topScrollbarTrack.scrollLeft = left;
        release('top');
      }
      if (stickyHeadViewport && source !== 'sticky') {
        syncingStickyViewport = true;
        stickyHeadViewport.scrollLeft = left;
        release('sticky');
      }
    }

    function buildStickyHeader() {
      if (!stickyHeadTable || !table.tHead) return;
      stickyHeadTable.innerHTML = '';
      stickyHeadTable.appendChild(table.tHead.cloneNode(true));
    }

    function syncStickyWidths() {
      if (!stickyHeadTable || !stickyHeadViewport) return;
      const sourceHead = table.tHead;
      const stickyHead = stickyHeadTable.tHead;
      if (!sourceHead || !stickyHead) return;

      const sourceRows = sourceHead.rows;
      const stickyRows = stickyHead.rows;
      if (!sourceRows.length || !stickyRows.length) return;

      // Use the body's first VISIBLE row to measure every column.
      // (display:none rows from the filter must be skipped — they
      // report 0-width cells which would collapse the sticky head.)
      const sourceBody = table.tBodies[0];
      let measureRow = null;
      if (sourceBody) {
        for (let i = 0; i < sourceBody.rows.length; i++) {
          const r = sourceBody.rows[i];
          if (r.offsetParent !== null && r.cells.length) {
            measureRow = r;
            break;
          }
        }
      }
      if (!measureRow) return;

      const totalCols = measureRow.cells.length;

      let colgroup = stickyHeadTable.querySelector('colgroup');
      if (!colgroup) {
        colgroup = document.createElement('colgroup');
        stickyHeadTable.insertBefore(colgroup, stickyHeadTable.firstChild);
      }
      if (colgroup.children.length !== totalCols) {
        colgroup.innerHTML = '';
        for (let i = 0; i < totalCols; i++) {
          colgroup.appendChild(document.createElement('col'));
        }
      }
      const cols = colgroup.children;

      // Use EXACT widths (no rounding). Math.ceil on 326 columns
      // accumulates ~5-10 px of drift, which is why "SWE-Pro" in the
      // sticky header was sitting a touch left of its data column.
      // Also track the precise sum so the sticky table width matches
      // what the colgroup is asking for, not the source table's
      // rounded scrollWidth.
      let totalWidth = 0;
      Array.from(measureRow.cells).forEach(function (cell, idx) {
        const w = cell.getBoundingClientRect().width;
        const col = cols[idx];
        if (col) {
          col.style.width = w + 'px';
          col.style.minWidth = w + 'px';
          col.style.maxWidth = w + 'px';
        }
        totalWidth += w;
      });

      // We deliberately do NOT set per-cell widths in the cloned thead.
      // With table-layout: fixed + a precise colgroup, the cells inherit
      // their widths from <col>; adding cell-level width hints
      // re-introduces the same rounding drift.

      stickyHeadViewport.style.width = tableWrap.clientWidth + 'px';
      stickyHeadTable.style.width = totalWidth + 'px';
      stickyHeadTable.style.tableLayout = 'fixed';
      syncHorizontal(tableWrap.scrollLeft, 'table');
    }

    function setOffsets() {
      const headerBottom = siteHeader ? siteHeader.getBoundingClientRect().bottom : 64;
      // Both layers are always rendered, so their heights are constants here —
      // no dependence on whether they currently happen to be shown.
      const scrollbarHeight = topScrollbar ? topScrollbar.getBoundingClientRect().height : 0;
      if (topScrollbar) topScrollbar.style.top = Math.ceil(headerBottom + 8) + 'px';
      if (stickyHead) stickyHead.style.top = Math.ceil(headerBottom + scrollbarHeight + 8) + 'px';
    }

    function syncTopScrollbarWidth() {
      if (!topScrollbar || !topScrollbarInner || !topScrollbarTrack) return;
      // The layers stay in the DOM permanently; visibility is class-driven.
      topScrollbar.hidden = false;
      if (stickyHead) stickyHead.hidden = false;
      topScrollbar.style.width = tableWrap.clientWidth + 'px';
      topScrollbarInner.style.width = table.scrollWidth + 'px';
      syncHorizontal(tableWrap.scrollLeft, 'table');
      syncStickyWidths();
      // Collapse the layers' flow space so they overlap the table instead of
      // pushing it down — this is what lets visibility toggling stay layout-free.
      topScrollbar.style.marginBottom = (-topScrollbar.offsetHeight) + 'px';
      if (stickyHead) stickyHead.style.marginBottom = (-stickyHead.offsetHeight) + 'px';
      setOffsets();
    }

    let visibilityTicking = false;
    function updateVisibility() {
      visibilityTicking = false;
      if (!topScrollbar || !topScrollbarTrack) return;
      // Only cheap rect reads + class toggles here — measuring column widths
      // on every scroll frame was the other half of the old jitter.
      const canScrollX = table.scrollWidth - tableWrap.clientWidth > 2;
      const cardRect = card.getBoundingClientRect();
      const headerBottom = siteHeader ? siteHeader.getBoundingClientRect().bottom : 64;
      const scrollbarHeight = topScrollbar.getBoundingClientRect().height;
      const shouldShow = canScrollX && cardRect.top <= headerBottom + 20 && cardRect.bottom >= headerBottom + 84;
      const headRect = tableWrap.getBoundingClientRect();
      const stickyHeadTop = headerBottom + scrollbarHeight + 8;
      const shouldShowSticky = headRect.top <= stickyHeadTop && cardRect.bottom >= stickyHeadTop + 56;

      topScrollbar.classList.toggle('is-visible', shouldShow);
      topScrollbar.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
      if (stickyHead) {
        stickyHead.classList.toggle('is-visible', shouldShowSticky);
        stickyHead.setAttribute('aria-hidden', shouldShowSticky ? 'false' : 'true');
      }
    }

    function onVisibilityScroll() {
      if (!visibilityTicking) {
        visibilityTicking = true;
        window.requestAnimationFrame(updateVisibility);
      }
    }

    buildStickyHeader();
    syncTopScrollbarWidth();
    updateVisibility();

    tableWrap.addEventListener('scroll', function () {
      if (syncingTableWrap) return;
      syncHorizontal(tableWrap.scrollLeft, 'table');
    }, { passive: true });

    if (topScrollbarTrack) {
      topScrollbarTrack.addEventListener('scroll', function () {
        if (syncingTopScrollbar) return;
        syncHorizontal(topScrollbarTrack.scrollLeft, 'top');
      }, { passive: true });
    }

    if (stickyHeadViewport) {
      stickyHeadViewport.addEventListener('scroll', function () {
        if (syncingStickyViewport) return;
        syncHorizontal(stickyHeadViewport.scrollLeft, 'sticky');
      }, { passive: true });
    }

    window.addEventListener('scroll', onVisibilityScroll, { passive: true });
    window.addEventListener('resize', function () {
      syncTopScrollbarWidth();
      updateVisibility();
    }, { passive: true });
    window.addEventListener('load', function () {
      syncTopScrollbarWidth();
      updateVisibility();
    });

    if (window.ResizeObserver) {
      const ro = new window.ResizeObserver(function () {
        syncTopScrollbarWidth();
        updateVisibility();
      });
      ro.observe(tableWrap);
      ro.observe(table);
    }

    // The extras script rewrites score cells (multi-source chips) and the
    // filters hide/show rows and columns — both can change the real table's
    // column widths after the initial sync, leaving the clone stale.
    // Re-sync whenever the real table mutates. The sync only writes to the
    // clone/scrollbars, never to the observed table, so there is no loop.
    if (window.MutationObserver) {
      let mutationSyncQueued = false;
      const mo = new MutationObserver(function () {
        if (mutationSyncQueued) return;
        mutationSyncQueued = true;
        window.requestAnimationFrame(function () {
          mutationSyncQueued = false;
          syncTopScrollbarWidth();
        });
      });
      mo.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }
  });
})();
