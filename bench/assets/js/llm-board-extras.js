(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const dataEl = document.getElementById('llm-board-data');
    if (!dataEl) return;
    let board;
    try {
      board = JSON.parse(dataEl.textContent);
    } catch (err) {
      console.warn('llm-board-data parse failed', err);
      return;
    }

    /* ============ Filter state ============ */
    const state = {
      searchQuery: '',
      hiddenModels: new Set(),
      hiddenBenches: new Set()
    };

    const tbody = document.querySelector('#llm-board-table tbody');
    const table = document.getElementById('llm-board-table');
    const filterCounter = document.getElementById('llm-board-filter-counter');
    const modelsCountEl = document.getElementById('llm-board-filter-models-count');
    const benchesCountEl = document.getElementById('llm-board-filter-benches-count');

    const allModels = Array.from(tbody.querySelectorAll('tr[data-model-name]'))
      .map(function (tr) { return { model: tr.dataset.modelName, company: tr.dataset.company || '' }; });

    const allBenches = [];
    (board.categories || []).forEach(function (cat) {
      (cat.columns || []).forEach(function (col) {
        allBenches.push({ key: col.key, label: col.label, cat: cat.name });
      });
    });

    /* ============ Merge identical scores in table cells ============ */
    // If a single cell has multiple <a.llm-score-entry> with the same
    // <strong> value (e.g., 94.3 from DeepSeek-V4 report AND from
    // Gemini 3.1 Pro report), collapse them into one entry whose <span>
    // is "labelA · labelB · labelC". The first entry's href is kept.
    function dedupScoreCells() {
      const stacks = document.querySelectorAll('.llm-score-stack');
      stacks.forEach(function (stack) {
        const entries = Array.from(stack.querySelectorAll('.llm-score-entry'));
        if (entries.length < 2) return;
        const byValue = new Map();
        entries.forEach(function (e) {
          const strong = e.querySelector('strong');
          if (!strong) return;
          const key = strong.textContent.trim();
          if (!byValue.has(key)) byValue.set(key, []);
          byValue.get(key).push(e);
        });
        byValue.forEach(function (group) {
          if (group.length < 2) return;
          const labels = group.map(function (e) {
            const sp = e.querySelector('span');
            return sp ? sp.textContent.trim() : '';
          }).filter(Boolean);
          // Dedup labels (same source/mode combo could repeat if data added twice)
          const seen = new Set();
          const dedupedLabels = labels.filter(function (l) {
            if (seen.has(l)) return false;
            seen.add(l);
            return true;
          });
          let firstSpan = group[0].querySelector('span');
          if (!firstSpan && dedupedLabels.length) {
            firstSpan = document.createElement('span');
            group[0].appendChild(firstSpan);
          }
          if (firstSpan) firstSpan.textContent = dedupedLabels.join(' · ');
          // If we joined N source labels, mark the chip wider so it doesn't truncate.
          if (dedupedLabels.length > 1 && firstSpan) {
            firstSpan.classList.add('llm-score-multi-source');
          }
          for (let i = 1; i < group.length; i++) {
            group[i].remove();
          }
        });
      });
    }

    dedupScoreCells();

    /* ============ URL hash sync ============ */
    function readHash() {
      const h = (window.location.hash || '').replace(/^#/, '');
      if (!h) return;
      const params = new URLSearchParams(h);
      const xm = params.get('xm');
      const xb = params.get('xb');
      if (xm) state.hiddenModels = new Set(xm.split('|').filter(Boolean));
      if (xb) state.hiddenBenches = new Set(xb.split('|').filter(Boolean));
    }
    function writeHash() {
      const params = new URLSearchParams();
      if (state.hiddenModels.size) params.set('xm', Array.from(state.hiddenModels).join('|'));
      if (state.hiddenBenches.size) params.set('xb', Array.from(state.hiddenBenches).join('|'));
      const s = params.toString();
      const newHash = s ? '#' + s : '';
      if (newHash !== (window.location.hash || '')) {
        try { history.replaceState(null, '', window.location.pathname + window.location.search + newHash); }
        catch (e) { window.location.hash = newHash.replace(/^#/, ''); }
      }
    }

    /* ============ Build popover bodies ============ */
    function getPanelBody(el) {
      return el ? el.querySelector('.llm-board-filter-panel-body') : null;
    }

    /* ============ Two-column filter panel (sidebar + detail) ============ */
    // Active group tracking per panel
    const activeGroup = { models: null, benches: null };

    function getGroupCheckedInfo(items, stateSet) {
      var total = items.length;
      var checked = items.filter(function (it) { return !stateSet.has(it.value); }).length;
      if (checked === 0) return { checked: false, indeterminate: false, count: '0/' + total };
      if (checked === total) return { checked: true, indeterminate: false, count: total + '/' + total };
      return { checked: false, indeterminate: true, count: checked + '/' + total };
    }

    function buildModelsPanel() {
      var body = document.getElementById('llm-board-filter-models-body');
      var byCompany = new Map();
      allModels.forEach(function (m) {
        if (!byCompany.has(m.company)) byCompany.set(m.company, []);
        byCompany.get(m.company).push(m);
      });
      var sortedCompanies = Array.from(byCompany.keys()).sort(function (a, b) {
        return a.localeCompare(b, 'en', { sensitivity: 'base' });
      });

      // Layout: sidebar + detail
      body.innerHTML = '';
      var wrapper = document.createElement('div');
      wrapper.className = 'llm-filter-two-col';

      // Left sidebar
      var sidebar = document.createElement('div');
      sidebar.className = 'llm-filter-sidebar';
      var sidebarSearch = document.createElement('input');
      sidebarSearch.type = 'search';
      sidebarSearch.className = 'llm-filter-sidebar-search';
      sidebarSearch.placeholder = 'Find provider...';
      sidebarSearch.autocomplete = 'off';
      sidebar.appendChild(sidebarSearch);

      var sidebarList = document.createElement('div');
      sidebarList.className = 'llm-filter-sidebar-list';

      sortedCompanies.forEach(function (company, idx) {
        var models = byCompany.get(company);
        var info = getGroupCheckedInfo(models.map(function (m) { return { value: m.model }; }), state.hiddenModels);
        var item = document.createElement('div');
        item.className = 'llm-filter-sidebar-item' + (idx === 0 ? ' is-active' : '');
        item.dataset.company = company;
        item.dataset.searchKey = company.toLowerCase();

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'llm-filter-sidebar-cb';
        cb.checked = info.checked;
        cb.indeterminate = info.indeterminate;
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function () {
          var wantChecked = cb.checked;
          models.forEach(function (m) {
            if (wantChecked) state.hiddenModels.delete(m.model);
            else state.hiddenModels.add(m.model);
          });
          // Update sidebar indicator
          var newInfo = getGroupCheckedInfo(models.map(function (m) { return { value: m.model }; }), state.hiddenModels);
          cb.checked = newInfo.checked;
          cb.indeterminate = newInfo.indeterminate;
          // Update detail panel if this group is active
          if (item.classList.contains('is-active')) refreshDetailPanel();
          afterChange();
        });

        var label = document.createElement('span');
        label.className = 'llm-filter-sidebar-label';
        label.textContent = company || 'Other';

        var count = document.createElement('span');
        count.className = 'llm-filter-sidebar-count';
        count.textContent = info.count;

        item.appendChild(cb);
        item.appendChild(label);
        item.appendChild(count);

        item.addEventListener('click', function (e) {
          if (e.target.closest('.llm-filter-sidebar-cb')) return;
          sidebarList.querySelectorAll('.llm-filter-sidebar-item.is-active').forEach(function (el) { el.classList.remove('is-active'); });
          item.classList.add('is-active');
          activeGroup.models = company;
          refreshDetailPanel();
        });

        sidebarList.appendChild(item);
      });
      sidebar.appendChild(sidebarList);

      // Right detail panel
      var detail = document.createElement('div');
      detail.className = 'llm-filter-detail';
      var detailHead = document.createElement('div');
      detailHead.className = 'llm-filter-detail-head';
      var detailTitle = document.createElement('strong');
      detailHead.appendChild(detailTitle);
      var detailActions = document.createElement('div');
      detailActions.className = 'llm-filter-detail-actions';
      var selectAllBtn = document.createElement('button');
      selectAllBtn.type = 'button';
      selectAllBtn.textContent = 'All';
      selectAllBtn.addEventListener('click', function () {
        var activeItem = sidebarList.querySelector('.llm-filter-sidebar-item.is-active');
        if (!activeItem) return;
        var company = activeItem.dataset.company;
        var models = byCompany.get(company);
        models.forEach(function (m) { state.hiddenModels.delete(m.model); });
        refreshDetailPanel();
        refreshSidebarIndicators();
        afterChange();
      });
      var clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.textContent = 'None';
      clearBtn.addEventListener('click', function () {
        var activeItem = sidebarList.querySelector('.llm-filter-sidebar-item.is-active');
        if (!activeItem) return;
        var company = activeItem.dataset.company;
        var models = byCompany.get(company);
        models.forEach(function (m) { state.hiddenModels.add(m.model); });
        refreshDetailPanel();
        refreshSidebarIndicators();
        afterChange();
      });
      detailActions.appendChild(selectAllBtn);
      detailActions.appendChild(clearBtn);
      detailHead.appendChild(detailActions);
      detail.appendChild(detailHead);

      var detailList = document.createElement('div');
      detailList.className = 'llm-filter-detail-list';
      detail.appendChild(detailList);

      wrapper.appendChild(sidebar);
      wrapper.appendChild(detail);
      body.appendChild(wrapper);

      // Sidebar search
      sidebarSearch.addEventListener('input', function () {
        var q = sidebarSearch.value.toLowerCase().trim();
        sidebarList.querySelectorAll('.llm-filter-sidebar-item').forEach(function (el) {
          el.style.display = (!q || el.dataset.searchKey.indexOf(q) !== -1) ? '' : 'none';
        });
      });

      // Init: select first company
      if (sortedCompanies.length > 0) {
        activeGroup.models = sortedCompanies[0];
      }

      function refreshDetailPanel() {
        var company = activeGroup.models;
        if (!company) return;
        var models = byCompany.get(company);
        detailTitle.textContent = company;
        detailList.innerHTML = '';
        models.forEach(function (m) {
          var lab = document.createElement('label');
          lab.className = 'llm-filter-item';
          lab.dataset.searchKey = (m.model + ' ' + m.company).toLowerCase();
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = m.model;
          cb.checked = !state.hiddenModels.has(m.model);
          cb.addEventListener('change', function () {
            if (cb.checked) state.hiddenModels.delete(m.model);
            else state.hiddenModels.add(m.model);
            // Update sidebar indicator
            var info = getGroupCheckedInfo(models.map(function (mm) { return { value: mm.model }; }), state.hiddenModels);
            var sidebarItem = sidebarList.querySelector('[data-company="' + company + '"]');
            if (sidebarItem) {
              var sidebarCb = sidebarItem.querySelector('.llm-filter-sidebar-cb');
              sidebarCb.checked = info.checked;
              sidebarCb.indeterminate = info.indeterminate;
              sidebarItem.querySelector('.llm-filter-sidebar-count').textContent = info.count;
            }
            afterChange();
          });
          var span = document.createElement('span');
          span.textContent = m.model;
          lab.appendChild(cb);
          lab.appendChild(span);
          detailList.appendChild(lab);
        });
      }

      function refreshSidebarIndicators() {
        sortedCompanies.forEach(function (company) {
          var models = byCompany.get(company);
          var info = getGroupCheckedInfo(models.map(function (m) { return { value: m.model }; }), state.hiddenModels);
          var sidebarItem = sidebarList.querySelector('[data-company="' + company + '"]');
          if (sidebarItem) {
            var sidebarCb = sidebarItem.querySelector('.llm-filter-sidebar-cb');
            sidebarCb.checked = info.checked;
            sidebarCb.indeterminate = info.indeterminate;
            sidebarItem.querySelector('.llm-filter-sidebar-count').textContent = info.count;
          }
        });
      }

      refreshDetailPanel();
    }

    function buildBenchesPanel() {
      var body = document.getElementById('llm-board-filter-benches-body');
      function bSortKey(label) {
        return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      }
      function bCmp(a, b) {
        return bSortKey(a.label).localeCompare(bSortKey(b.label), 'en', { numeric: true, sensitivity: 'base' });
      }

      body.innerHTML = '';
      var wrapper = document.createElement('div');
      wrapper.className = 'llm-filter-two-col';

      // Left sidebar: categories
      var sidebar = document.createElement('div');
      sidebar.className = 'llm-filter-sidebar';
      var sidebarSearch = document.createElement('input');
      sidebarSearch.type = 'search';
      sidebarSearch.className = 'llm-filter-sidebar-search';
      sidebarSearch.placeholder = 'Find category...';
      sidebarSearch.autocomplete = 'off';
      sidebar.appendChild(sidebarSearch);

      var sidebarList = document.createElement('div');
      sidebarList.className = 'llm-filter-sidebar-list';

      var cats = (board.categories || []).slice();
      cats.forEach(function (cat, idx) {
        var cols = (cat.columns || []).slice().sort(bCmp);
        var info = getGroupCheckedInfo(cols.map(function (c) { return { value: c.key }; }), state.hiddenBenches);
        var item = document.createElement('div');
        item.className = 'llm-filter-sidebar-item' + (idx === 0 ? ' is-active' : '');
        item.dataset.category = cat.name;
        item.dataset.searchKey = cat.name.toLowerCase();

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'llm-filter-sidebar-cb';
        cb.checked = info.checked;
        cb.indeterminate = info.indeterminate;
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function () {
          var wantChecked = cb.checked;
          cols.forEach(function (c) {
            if (wantChecked) state.hiddenBenches.delete(c.key);
            else state.hiddenBenches.add(c.key);
          });
          var newInfo = getGroupCheckedInfo(cols.map(function (c) { return { value: c.key }; }), state.hiddenBenches);
          cb.checked = newInfo.checked;
          cb.indeterminate = newInfo.indeterminate;
          if (item.classList.contains('is-active')) refreshDetailPanel();
          afterChange();
        });

        var label = document.createElement('span');
        label.className = 'llm-filter-sidebar-label';
        label.textContent = cat.name;

        var count = document.createElement('span');
        count.className = 'llm-filter-sidebar-count';
        count.textContent = info.count;

        item.appendChild(cb);
        item.appendChild(label);
        item.appendChild(count);

        item.addEventListener('click', function (e) {
          if (e.target.closest('.llm-filter-sidebar-cb')) return;
          sidebarList.querySelectorAll('.llm-filter-sidebar-item.is-active').forEach(function (el) { el.classList.remove('is-active'); });
          item.classList.add('is-active');
          activeGroup.benches = cat.name;
          refreshDetailPanel();
        });

        sidebarList.appendChild(item);
      });
      sidebar.appendChild(sidebarList);

      // Right detail panel
      var detail = document.createElement('div');
      detail.className = 'llm-filter-detail';
      var detailHead = document.createElement('div');
      detailHead.className = 'llm-filter-detail-head';
      var detailTitle = document.createElement('strong');
      detailHead.appendChild(detailTitle);
      var detailActions = document.createElement('div');
      detailActions.className = 'llm-filter-detail-actions';
      var selectAllBtn = document.createElement('button');
      selectAllBtn.type = 'button';
      selectAllBtn.textContent = 'All';
      selectAllBtn.addEventListener('click', function () {
        var activeItem = sidebarList.querySelector('.llm-filter-sidebar-item.is-active');
        if (!activeItem) return;
        var catName = activeItem.dataset.category;
        var cat = cats.find(function (c) { return c.name === catName; });
        if (!cat) return;
        var cols = (cat.columns || []).slice().sort(bCmp);
        cols.forEach(function (c) { state.hiddenBenches.delete(c.key); });
        refreshDetailPanel();
        refreshSidebarIndicators();
        afterChange();
      });
      var clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.textContent = 'None';
      clearBtn.addEventListener('click', function () {
        var activeItem = sidebarList.querySelector('.llm-filter-sidebar-item.is-active');
        if (!activeItem) return;
        var catName = activeItem.dataset.category;
        var cat = cats.find(function (c) { return c.name === catName; });
        if (!cat) return;
        var cols = (cat.columns || []).slice().sort(bCmp);
        cols.forEach(function (c) { state.hiddenBenches.add(c.key); });
        refreshDetailPanel();
        refreshSidebarIndicators();
        afterChange();
      });
      detailActions.appendChild(selectAllBtn);
      detailActions.appendChild(clearBtn);
      detailHead.appendChild(detailActions);
      detail.appendChild(detailHead);

      var detailList = document.createElement('div');
      detailList.className = 'llm-filter-detail-list';
      detail.appendChild(detailList);

      wrapper.appendChild(sidebar);
      wrapper.appendChild(detail);
      body.appendChild(wrapper);

      // Sidebar search
      sidebarSearch.addEventListener('input', function () {
        var q = sidebarSearch.value.toLowerCase().trim();
        sidebarList.querySelectorAll('.llm-filter-sidebar-item').forEach(function (el) {
          el.style.display = (!q || el.dataset.searchKey.indexOf(q) !== -1) ? '' : 'none';
        });
      });

      // Init
      if (cats.length > 0) {
        activeGroup.benches = cats[0].name;
      }

      function refreshDetailPanel() {
        var catName = activeGroup.benches;
        if (!catName) return;
        var cat = cats.find(function (c) { return c.name === catName; });
        if (!cat) return;
        var cols = (cat.columns || []).slice().sort(bCmp);
        detailTitle.textContent = catName;
        detailList.innerHTML = '';
        cols.forEach(function (col) {
          var lab = document.createElement('label');
          lab.className = 'llm-filter-item';
          lab.dataset.searchKey = (col.label + ' ' + col.key).toLowerCase();
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = col.key;
          cb.checked = !state.hiddenBenches.has(col.key);
          cb.addEventListener('change', function () {
            if (cb.checked) state.hiddenBenches.delete(col.key);
            else state.hiddenBenches.add(col.key);
            var info = getGroupCheckedInfo(cols.map(function (c) { return { value: c.key }; }), state.hiddenBenches);
            var sidebarItem = sidebarList.querySelector('[data-category="' + catName + '"]');
            if (sidebarItem) {
              var sidebarCb = sidebarItem.querySelector('.llm-filter-sidebar-cb');
              sidebarCb.checked = info.checked;
              sidebarCb.indeterminate = info.indeterminate;
              sidebarItem.querySelector('.llm-filter-sidebar-count').textContent = info.count;
            }
            afterChange();
          });
          var span = document.createElement('span');
          span.textContent = col.label;
          lab.appendChild(cb);
          lab.appendChild(span);
          detailList.appendChild(lab);
        });
      }

      function refreshSidebarIndicators() {
        cats.forEach(function (cat) {
          var cols = (cat.columns || []).slice().sort(bCmp);
          var info = getGroupCheckedInfo(cols.map(function (c) { return { value: c.key }; }), state.hiddenBenches);
          var sidebarItem = sidebarList.querySelector('[data-category="' + cat.name + '"]');
          if (sidebarItem) {
            var sidebarCb = sidebarItem.querySelector('.llm-filter-sidebar-cb');
            sidebarCb.checked = info.checked;
            sidebarCb.indeterminate = info.indeterminate;
            sidebarItem.querySelector('.llm-filter-sidebar-count').textContent = info.count;
          }
        });
      }

      refreshDetailPanel();
    }

    /* ============ Apply filter to table ============ */
    function applyFilter() {
      const q = state.searchQuery.toLowerCase();

      // Set of benchmark keys selected by the user. A second pass below
      // removes selected columns that are empty for all currently visible models.
      const selectedBenchKeys = new Set();
      allBenches.forEach(function (b) {
        if (!state.hiddenBenches.has(b.key)) selectedBenchKeys.add(b.key);
      });
      const hasBenchFilter = state.hiddenBenches.size > 0;

      // Hide rows
      let visibleModels = 0;
      const visibleRows = [];
      Array.from(tbody.querySelectorAll('tr[data-model-name]')).forEach(function (tr) {
        const m = tr.dataset.modelName || '';
        const c = tr.dataset.company || '';
        const passSearch = !q || (m + ' ' + c).toLowerCase().indexOf(q) !== -1;
        const passSelected = !state.hiddenModels.has(m);

        // Bench data filter: if benchmarks have been filtered down, only
        // show this row when it has at least one non-empty score for
        // one of the still-visible benchmarks. Empty cells carry the
        // .llm-empty-score class set by the Liquid template, so we just
        // need to find one bench cell that's both visible AND not empty.
        let passBenchData = true;
        if (hasBenchFilter) {
          passBenchData = false;
          const cells = tr.querySelectorAll('td[data-bench-key]');
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (selectedBenchKeys.has(cell.dataset.benchKey) && !cell.classList.contains('llm-empty-score')) {
              passBenchData = true;
              break;
            }
          }
        }

        const show = passSearch && passSelected && passBenchData;
        tr.style.display = show ? '' : 'none';
        if (show) {
          visibleModels++;
          visibleRows.push(tr);
        }
      });

      const populatedBenchKeys = new Set();
      visibleRows.forEach(function (tr) {
        const cells = tr.querySelectorAll('td[data-bench-key]');
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (selectedBenchKeys.has(cell.dataset.benchKey) && !cell.classList.contains('llm-empty-score')) {
            populatedBenchKeys.add(cell.dataset.benchKey);
          }
        }
      });

      // Hide benchmark columns. This includes user-hidden benchmarks and
      // benchmarks that are empty across the filtered model set.
      let visibleBenches = 0;
      allBenches.forEach(function (b) {
        const hide = !populatedBenchKeys.has(b.key);
        if (!hide) visibleBenches++;
        const cells = table.querySelectorAll('[data-bench-key="' + cssEscape(b.key) + '"]');
        cells.forEach(function (c) { c.style.display = hide ? 'none' : ''; });
      });

      // Adjust category group <th> colspan: count visible benches per category
      const visiblePerCat = new Map();
      allBenches.forEach(function (b) {
        if (populatedBenchKeys.has(b.key)) {
          visiblePerCat.set(b.cat, (visiblePerCat.get(b.cat) || 0) + 1);
        }
      });
      Array.from(table.querySelectorAll('[data-cat-name].llm-board-group')).forEach(function (gth) {
        const cnt = visiblePerCat.get(gth.dataset.catName) || 0;
        if (cnt === 0) {
          gth.style.display = 'none';
        } else {
          gth.style.display = '';
          gth.colSpan = cnt;
        }
      });

      // Adjust the table's min-width to match the count of visible
      // columns. Without this, the hard-coded 7600px in the CSS keeps
      // the table that wide even when most benchmarks are hidden, and
      // the sticky Model column expands to fill, blowing it out across
      // the viewport.
      const totalCols = 4 + visibleBenches;
      // ~200px for Model + Mode + Released + Source averaged at 120px,
      // bench cells min-width 106px from CSS. Round up a bit so cells
      // aren't squashed.
      const targetMinWidth = Math.max(640, 200 + 120 * 3 + 110 * visibleBenches);
      if (table) table.style.minWidth = targetMinWidth + 'px';

      // Update counters
      if (modelsCountEl) {
        const total = allModels.length;
        modelsCountEl.textContent = (state.hiddenModels.size === 0 && visibleModels === total) ? 'all ' + total : visibleModels + '/' + total;
      }
      if (benchesCountEl) {
        const total = allBenches.length;
        benchesCountEl.textContent = (state.hiddenBenches.size === 0 && visibleBenches === total) ? 'all ' + total : visibleBenches + '/' + total;
      }
      if (filterCounter) {
        filterCounter.textContent = visibleModels + ' models · ' + visibleBenches + ' benchmarks';
      }

      // Resync sticky head widths (the global llm-leaderboard.js exposes
      // nothing, but it does observe ResizeObserver on table — toggling
      // display triggers reflow and the observer will re-run).
      // As a belt-and-suspenders, dispatch a synthetic resize:
      window.dispatchEvent(new Event('resize'));
    }

    function cssEscape(s) {
      if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
      return String(s).replace(/[^a-zA-Z0-9_-]/g, function (ch) { return '\\' + ch; });
    }

    function afterChange() {
      writeHash();
      applyFilter();
    }

    /* ============ Toolbar wiring ============ */
    const searchInput = document.getElementById('llm-board-filter');
    const resetBtn = document.getElementById('llm-board-filter-reset');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = searchInput.value || '';
        applyFilter();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.hiddenModels.clear();
        state.hiddenBenches.clear();
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        // Re-tick all checkboxes
        document.querySelectorAll('.llm-board-filter-panel input[type="checkbox"]').forEach(function (c) { c.checked = true; });
        afterChange();
      });
    }

    /* ============ Popover open/close ============ */
    function closePanel(name) {
      const panel = document.getElementById('llm-board-filter-' + name + '-panel');
      const btn = document.getElementById('llm-board-filter-' + name + '-btn');
      if (panel) panel.hidden = true;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function openPanel(name) {
      ['models', 'benches'].forEach(function (n) {
        const panel = document.getElementById('llm-board-filter-' + n + '-panel');
        const btn = document.getElementById('llm-board-filter-' + n + '-btn');
        if (n === name) {
          const isOpen = !panel.hidden;
          panel.hidden = isOpen;
          btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          if (!isOpen) {
            const body = getPanelBody(panel);
            if (body) body.scrollTop = 0;
          }
        } else {
          closePanel(n);
        }
      });
    }
    document.getElementById('llm-board-filter-models-btn').addEventListener('click', function (e) {
      e.stopPropagation(); openPanel('models');
    });
    document.getElementById('llm-board-filter-benches-btn').addEventListener('click', function (e) {
      e.stopPropagation(); openPanel('benches');
    });

    ['models', 'benches'].forEach(function (name) {
      const panel = document.getElementById('llm-board-filter-' + name + '-panel');
      // Outside click / Escape close
      document.addEventListener('click', function (e) {
        if (panel.hidden) return;
        if (!panel.contains(e.target) && !document.getElementById('llm-board-filter-' + name + '-btn').contains(e.target)) {
          closePanel(name);
        }
      });
      // Action buttons inside head
      panel.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const action = btn.dataset.action;
          if (action === 'close') {
            closePanel(name);
          } else if (action === 'all') {
            // Select all items in the currently active detail panel
            const detailList = panel.querySelector('.llm-filter-detail-list');
            if (detailList) {
              detailList.querySelectorAll('.llm-filter-item').forEach(function (lab) {
                const cb = lab.querySelector('input[type="checkbox"]');
                if (cb && !cb.checked) {
                  cb.checked = true;
                  const k = cb.value;
                  if (name === 'models') state.hiddenModels.delete(k);
                  else state.hiddenBenches.delete(k);
                }
              });
            }
            // Rebuild panel to sync sidebar indicators
            if (name === 'models') buildModelsPanel(); else buildBenchesPanel();
            afterChange();
          } else if (action === 'none') {
            const detailList = panel.querySelector('.llm-filter-detail-list');
            if (detailList) {
              detailList.querySelectorAll('.llm-filter-item').forEach(function (lab) {
                const cb = lab.querySelector('input[type="checkbox"]');
                if (cb && cb.checked) {
                  cb.checked = false;
                  const k = cb.value;
                  if (name === 'models') state.hiddenModels.add(k);
                  else state.hiddenBenches.add(k);
                }
              });
            }
            if (name === 'models') buildModelsPanel(); else buildBenchesPanel();
            afterChange();
          }
        });
      });
      // Inner search input (top-level, filters detail panel items)
      const searchEl = document.getElementById('llm-board-filter-' + name + '-search');
      if (searchEl) {
        searchEl.addEventListener('input', function () {
          const q = (searchEl.value || '').toLowerCase().trim();
          const detailList = panel.querySelector('.llm-filter-detail-list');
          if (detailList) {
            detailList.querySelectorAll('.llm-filter-item').forEach(function (lab) {
              const k = lab.dataset.searchKey || '';
              lab.style.display = (!q || k.indexOf(q) !== -1) ? '' : 'none';
            });
          }
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closePanel('models');
        closePanel('benches');
      }
    });

    /* ============ Init ============ */
    readHash();
    buildModelsPanel();
    buildBenchesPanel();
    applyFilter();

    /* ============ Chart (per-benchmark bar chart, unchanged behavior) ============ */
    const select = document.getElementById('llm-chart-benchmark');
    const limitSelect = document.getElementById('llm-chart-limit');
    const bars = document.getElementById('llm-chart-bars');
    const empty = document.getElementById('llm-chart-empty');
    if (!select || !bars) return;

    const popularKeys = ['gpqa', 'hle', 'aime_2025', 'swe_verified', 'livecodebench', 'mmlu_pro', 'mmmu_pro'];

    // Keep a flat list of all (key, label, cat) for the chart so we can
    // rebuild the <select> dynamically when the user types in the chart
    // search box.
    const chartBenches = [];
    (board.categories || []).forEach(function (cat) {
      (cat.columns || []).forEach(function (col) {
        chartBenches.push({ key: col.key, label: col.label, cat: cat.name });
      });
    });

    function rebuildBenchSelect(query) {
      select.innerHTML = '';
      const q = (query || '').trim().toLowerCase();

      // Sort comparator: strip non-alphanumeric so "Terminal Bench 2.0",
      // "Terminal-Bench 2.0 (Claude Code)", and "Terminal-Bench 2.1"
      // group together as expected instead of being split by ASCII
      // differences between space (0x20), dash (0x2D), and parens.
      function sortKey(label) {
        return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      }
      function cmp(a, b) {
        return sortKey(a.label).localeCompare(sortKey(b.label), 'en', { numeric: true, sensitivity: 'base' });
      }

      // Popular group — always sorted; filter by query.
      const popularItems = chartBenches
        .filter(function (b) { return popularKeys.indexOf(b.key) !== -1; })
        .filter(function (b) { return !q || b.label.toLowerCase().indexOf(q) !== -1 || b.key.toLowerCase().indexOf(q) !== -1; })
        .sort(cmp);

      if (popularItems.length && !q) {
        const og = document.createElement('optgroup');
        og.label = '★ Popular';
        popularItems.forEach(function (b) {
          const opt = document.createElement('option');
          opt.value = b.key;
          opt.textContent = b.label;
          og.appendChild(opt);
        });
        select.appendChild(og);
      }

      // Per-category groups, items sorted A→Z within each, filtered by query.
      (board.categories || []).forEach(function (cat) {
        const items = (cat.columns || [])
          .filter(function (col) { return !q || col.label.toLowerCase().indexOf(q) !== -1 || col.key.toLowerCase().indexOf(q) !== -1; })
          .slice()
          .sort(cmp);
        if (!items.length) return;
        const og = document.createElement('optgroup');
        og.label = cat.name;
        items.forEach(function (col) {
          const opt = document.createElement('option');
          opt.value = col.key;
          opt.textContent = col.label;
          og.appendChild(opt);
        });
        select.appendChild(og);
      });
    }

    rebuildBenchSelect('');

    const groupedRows = (function () {
      const seen = new Map();
      (board.rows || []).forEach(function (row) {
        if (!seen.has(row.model)) {
          seen.set(row.model, { model: row.model, company: row.company, rows: [] });
        }
        seen.get(row.model).rows.push(row);
      });
      return Array.from(seen.values());
    })();

    function parseScore(s) {
      if (s == null) return NaN;
      const cleaned = String(s).replace(/[,%$#]/g, '').trim();
      const m = cleaned.match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    }

    function allNumeric(rows, key) {
      // Return EVERY numeric entry for this key across the merged
      // model's rows (any mode, any source). Each one becomes its own
      // bar in the chart.
      const out = [];
      rows.forEach(function (row) {
        const arr = (row.scores || {})[key];
        if (!arr) return;
        arr.forEach(function (entry) {
          const v = parseScore(entry.value);
          if (!isNaN(v)) {
            out.push({
              value: entry.value,
              source_label: entry.source_label,
              source_url: entry.source_url,
              mode: row.mode,
              numeric: v
            });
          }
        });
      });
      return out;
    }

    const palette = [
      ['#5ea95d', '#4f9850'],
      ['#467bde', '#3f73d4'],
      ['#c78462', '#bf7a57'],
      ['#d84b74', '#ca3e67'],
      ['#f17a28', '#eb6e18'],
      ['#7b62c7', '#6b53b8']
    ];

    function renderChart() {
      const key = select.value;
      const limitRaw = limitSelect ? limitSelect.value : 'all';
      const limit = limitRaw === 'all' ? Infinity : parseInt(limitRaw, 10);
      if (!key) return;

      const items = [];
      groupedRows.forEach(function (g) {
        const entries = allNumeric(g.rows, key);
        // Merge entries that share the same numeric value within this
        // model. The chart should show one bar per distinct score, with
        // the source labels joined by ·.
        const byValue = new Map();
        entries.forEach(function (entry) {
          // Use the raw string value as the merge key so 94.3 from
          // different reports collapses but 94.3 vs 94 stays separate.
          const k = String(entry.value);
          if (!byValue.has(k)) byValue.set(k, []);
          byValue.get(k).push(entry);
        });
        byValue.forEach(function (group) {
          const first = group[0];
          const labels = group.map(function (e) {
            const parts = [];
            if (e.mode) parts.push(e.mode);
            if (e.source_label) parts.push(e.source_label);
            return parts.join(' · ');
          }).filter(Boolean);
          const seen = new Set();
          const dedup = labels.filter(function (l) {
            if (seen.has(l)) return false;
            seen.add(l);
            return true;
          });
          items.push({
            model: g.model,
            company: g.company,
            numeric: first.numeric,
            entry: {
              value: first.value,
              source_url: first.source_url,
              // Pre-rendered label string with all sources merged.
              merged_label: dedup.join('  ·  '),
              source_count: dedup.length
            }
          });
        });
      });

      items.sort(function (a, b) { return b.numeric - a.numeric; });
      const visible = isFinite(limit) ? items.slice(0, limit) : items;
      bars.innerHTML = '';

      if (!visible.length) { if (empty) empty.hidden = false; return; }
      if (empty) empty.hidden = true;

      const max = visible[0].numeric;
      visible.forEach(function (item, idx) {
        const a = document.createElement(item.entry.source_url ? 'a' : 'div');
        a.className = 'llm-chart-item';
        if (item.entry.source_url) {
          a.href = item.entry.source_url;
          a.target = '_blank';
          a.rel = 'noopener';
        }
        const rank = document.createElement('span');
        rank.className = 'llm-chart-rank';
        rank.textContent = '#' + (idx + 1);
        a.appendChild(rank);

        const labelTrack = document.createElement('span');
        labelTrack.className = 'llm-chart-label';
        const strong = document.createElement('strong');
        strong.textContent = item.model;
        const sub = document.createElement('span');
        sub.textContent = item.company;
        labelTrack.appendChild(strong);
        labelTrack.appendChild(sub);
        a.appendChild(labelTrack);

        const barWrap = document.createElement('span');
        barWrap.className = 'llm-chart-bar';
        const fill = document.createElement('span');
        fill.className = 'llm-chart-fill';
        const pct = max > 0 ? (item.numeric / max) * 100 : 0;
        fill.style.width = Math.max(1, pct) + '%';
        const colors = palette[idx % palette.length];
        fill.style.background = 'linear-gradient(90deg, ' + colors[0] + ' 0%, ' + colors[1] + ' 100%)';
        barWrap.appendChild(fill);

        const value = document.createElement('span');
        value.className = 'llm-chart-value';
        value.textContent = item.entry.value;
        if (item.entry.merged_label) {
          const meta = document.createElement('span');
          meta.className = 'llm-chart-meta';
          if (item.entry.source_count > 1) meta.classList.add('llm-chart-meta-multi');
          meta.textContent = item.entry.merged_label;
          value.appendChild(meta);
        }
        barWrap.appendChild(value);
        a.appendChild(barWrap);
        bars.appendChild(a);
      });
    }

    let defaultKey = null;
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (opt && opt.value) { defaultKey = opt.value; break; }
    }
    if (defaultKey) select.value = defaultKey;
    select.addEventListener('change', function () {
      renderChart();
      renderProgressChart();
    });
    if (limitSelect) limitSelect.addEventListener('change', renderChart);

    /* ============ Iteration-velocity chart ============ */
    const progressRows = document.getElementById('llm-progress-rows');
    const progressEmpty = document.getElementById('llm-progress-empty');
    const progressLegend = document.getElementById('llm-progress-legend');
    const showAllToggle = document.getElementById('llm-progress-show-all');
    const sortSelect = document.getElementById('llm-progress-sort');

    // Shared, instant-show tooltip for velocity-chart dots. Native
    // title= has a 1-2s OS delay; this one fires on mouseenter so the
    // model name + score + release date appear immediately.
    let progressTip = document.getElementById('llm-progress-tip');
    if (!progressTip) {
      progressTip = document.createElement('div');
      progressTip.id = 'llm-progress-tip';
      progressTip.className = 'llm-progress-tip';
      progressTip.hidden = true;
      document.body.appendChild(progressTip);
    }
    function fmtDateNice(d) {
      if (!d || isNaN(d.getTime())) return '';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function fmtYearMonth(d) {
      if (!d || isNaN(d.getTime())) return '';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    function showProgressTip(target, info, color) {
      progressTip.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'llm-progress-tip-head';
      const swatch = document.createElement('span');
      swatch.className = 'llm-progress-tip-swatch';
      swatch.style.background = color || '#888';
      const name = document.createElement('strong');
      name.textContent = info.model;
      head.appendChild(swatch);
      head.appendChild(name);
      progressTip.appendChild(head);
      const body = document.createElement('div');
      body.className = 'llm-progress-tip-body';
      const scoreLine = document.createElement('div');
      scoreLine.innerHTML = '<span>score</span> <strong>' + (Math.round(info.score * 100) / 100) + '</strong>';
      const dateLine = document.createElement('div');
      dateLine.innerHTML = '<span>released</span> <strong>' + fmtDateNice(info.date) + '</strong>';
      body.appendChild(scoreLine);
      body.appendChild(dateLine);
      if (info.frontier) {
        const tag = document.createElement('div');
        tag.className = 'llm-progress-tip-tag';
        tag.textContent = 'frontier';
        body.appendChild(tag);
      }
      progressTip.appendChild(body);
      progressTip.hidden = false;
      // Position next to the dot, clamped to viewport
      const rect = target.getBoundingClientRect();
      const tipRect = progressTip.getBoundingClientRect();
      let left = rect.left + rect.width / 2 - tipRect.width / 2 + window.scrollX;
      let top = rect.top - tipRect.height - 10 + window.scrollY;
      if (top < window.scrollY + 4) top = rect.bottom + 10 + window.scrollY;
      const maxLeft = window.scrollX + window.innerWidth - tipRect.width - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < window.scrollX + 8) left = window.scrollX + 8;
      progressTip.style.left = left + 'px';
      progressTip.style.top = top + 'px';
    }
    function hideProgressTip() { progressTip.hidden = true; }

    const companyColors = {
      'Anthropic': '#c45a3c',
      'OpenAI':    '#4f9850',
      'Google':    '#4286f4',
      'DeepSeek':  '#2e3656',
      'MiMo':      '#f17a28',
      'MiniMax':   '#d84b74',
      'Doubao':    '#7b62c7',
      'Qwen':      '#5ea95d',
      'Moonshot':  '#467bde',
      'Zhipu AI':  '#c78462',
      'InclusionAI': '#a85ad6',
      'StepFun':   '#208a8a',
      'Baidu':     '#3268d9',
      'Tencent':   '#d84b74',
      'Meituan':   '#e6a01b'
    };
    const progressFallbackPalette = ['#3a3a38', '#7b62c7', '#467bde', '#5ea95d', '#c78462'];
    const hiddenCompanies = new Set();

    function colorForCompany(name) {
      if (companyColors[name]) return companyColors[name];
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
      return progressFallbackPalette[h % progressFallbackPalette.length];
    }

    /* Greedy label layout for the velocity track.
       Labels are siblings of dots inside the track. We try 4 vertical
       tiers (near-above, near-below, far-above, far-below) and 5
       horizontal shifts per tier; the first non-colliding slot wins.
       Frontier rendering uses CSS-driven height and assumes the track's
       horizontal bar sits at vertical centre (50%). */
    function layoutFrontierLabels(track, infos, color) {
      const trackW = track.clientWidth;
      const trackH = track.clientHeight;
      if (!trackW || !trackH) return;
      const barY = trackH / 2;
      // Remove any leaders from a previous layout (re-renders pile up otherwise)
      track.querySelectorAll('.llm-progress-leader').forEach(function (el) { el.remove(); });

      const placed = [];
      const labelH = 26;
      const gap = 4;
      const tiers = [
        { y: barY - gap - labelH },                    // near-above
        { y: barY + gap },                             // near-below
        { y: Math.max(2, barY - gap * 2 - labelH * 2) }, // far-above
        { y: Math.min(trackH - labelH - 2, barY + gap * 2 + labelH) }, // far-below
      ];

      function estW(r) {
        const main = r.model + ' · ' + (Math.round(r.score * 100) / 100);
        const meta = fmtYearMonth(r.date);
        return Math.max(main.length * 6.4, meta.length * 5.6) + 10;
      }
      function collides(a) {
        for (let i = 0; i < placed.length; i++) {
          const b = placed[i];
          if (!(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)) return true;
        }
        return false;
      }

      // Sort: process LAST dot first (wants right-of-track placement),
      // then frontier dots by x position so neighbours fight for slots
      // in a stable order.
      const sorted = infos.slice().sort(function (a, b) {
        if (a.isLast !== b.isLast) return a.isLast ? -1 : 1;
        return a.pctX - b.pctX;
      });

      sorted.forEach(function (info) {
        const cx = (info.pctX / 100) * trackW;
        const w = estW(info.r);
        let chosen = null;

        // Final dot: try a right-of-dot slot at the bar's height,
        // but only when it fits without bleeding into the stats column.
        if (info.isLast) {
          const rx = cx + 12;
          const ry = barY - labelH / 2;
          if (rx + w <= trackW + 18) {
            const r = { x: rx, y: ry, w: w, h: labelH };
            if (!collides(r)) {
              chosen = r;
              info.lab.classList.add('is-right');
            }
          }
        }

        if (!chosen) {
          const xShifts = [0, w * 0.45, -w * 0.45, w * 0.9, -w * 0.9, w * 1.2, -w * 1.2];
          for (let t = 0; t < tiers.length && !chosen; t++) {
            for (let s = 0; s < xShifts.length && !chosen; s++) {
              const x = cx - w / 2 + xShifts[s];
              if (x < 0 || x + w > trackW) continue;
              const r = { x: x, y: tiers[t].y, w: w, h: labelH };
              if (!collides(r)) chosen = r;
            }
          }
        }

        if (!chosen) {
          // Last resort: stack on near-above default; overlap accepted.
          chosen = { x: Math.max(0, Math.min(trackW - w, cx - w / 2)), y: tiers[0].y, w: w, h: labelH };
        }

        placed.push(chosen);
        info.lab.style.left = chosen.x + 'px';
        info.lab.style.top = chosen.y + 'px';

        // Draw a leader if the label centre is far from the dot's x.
        const labelCx = chosen.x + w / 2;
        const dx = labelCx - cx;
        if (Math.abs(dx) > 4 && !info.lab.classList.contains('is-right')) {
          const labelEdgeY = chosen.y < barY ? chosen.y + labelH : chosen.y;
          const dy = labelEdgeY - barY;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ang = Math.atan2(dy, dx) * 180 / Math.PI;
          const leader = document.createElement('span');
          leader.className = 'llm-progress-leader';
          leader.style.left = cx + 'px';
          leader.style.top = barY + 'px';
          leader.style.width = len + 'px';
          leader.style.transform = 'rotate(' + ang + 'deg)';
          leader.style.background = color;
          track.appendChild(leader);
        }
      });
    }

    function prepareVelocityData(key) {
      const byCompany = new Map();
      (board.rows || []).forEach(function (row) {
        if (!row.released || row.released === '') return;
        const dt = new Date(row.released);
        if (isNaN(dt.getTime())) return;
        const arr = (row.scores || {})[key];
        if (!arr) return;
        let best = NaN;
        arr.forEach(function (s) {
          const v = parseScore(s.value);
          if (!isNaN(v) && (isNaN(best) || v > best)) best = v;
        });
        if (isNaN(best)) return;
        if (!byCompany.has(row.company)) byCompany.set(row.company, []);
        byCompany.get(row.company).push({ model: row.model, date: dt, score: best });
      });

      const out = [];
      byCompany.forEach(function (list, co) {
        list.sort(function (a, b) { return a.date - b.date; });
        let running = -Infinity;
        list.forEach(function (it) {
          if (it.score > running) { it.frontier = true; running = it.score; }
          else { it.frontier = false; }
        });
        const frontier = list.filter(function (it) { return it.frontier; });
        const first = frontier[0];
        const last = frontier[frontier.length - 1];
        const months = first && last && first !== last
          ? (last.date - first.date) / (1000 * 60 * 60 * 24 * 30.44)
          : 0;
        const delta = last.score - first.score;
        // Velocity in points per month. If only one frontier point, use 0
        // (we still render the row to show the best score).
        const velocity = months > 0 ? delta / months : 0;
        out.push({
          company: co,
          releases: list,
          frontier: frontier,
          first: first,
          last: last,
          best: last ? last.score : 0,
          minScore: list.length ? Math.min.apply(null, list.map(function (r) { return r.score; })) : 0,
          months: months,
          delta: delta,
          velocity: velocity
        });
      });
      return out;
    }

    function renderProgressChart() {
      if (!progressRows) return;
      const key = select.value;
      const showAll = showAllToggle && showAllToggle.checked;
      const sortMode = sortSelect ? sortSelect.value : 'velocity';

      const data = prepareVelocityData(key);

      // Legend (built from all companies regardless of filter; click to toggle)
      const allCompanies = data.map(function (d) { return d.company; }).sort();
      progressLegend.innerHTML = '';
      allCompanies.forEach(function (co) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'llm-progress-legend-chip';
        if (hiddenCompanies.has(co)) chip.classList.add('is-off');
        const sw = document.createElement('span');
        sw.className = 'llm-progress-legend-swatch';
        sw.style.background = colorForCompany(co);
        const lbl = document.createElement('span');
        lbl.textContent = co;
        chip.appendChild(sw);
        chip.appendChild(lbl);
        chip.addEventListener('click', function () {
          if (hiddenCompanies.has(co)) hiddenCompanies.delete(co);
          else hiddenCompanies.add(co);
          renderProgressChart();
        });
        progressLegend.appendChild(chip);
      });

      // Filter to visible families
      const visible = data.filter(function (d) { return !hiddenCompanies.has(d.company); });
      if (!visible.length) {
        progressRows.innerHTML = '';
        if (progressEmpty) progressEmpty.hidden = false;
        return;
      }
      if (progressEmpty) progressEmpty.hidden = true;

      // Sort
      visible.sort(function (a, b) {
        if (sortMode === 'best') return b.best - a.best;
        if (sortMode === 'delta') return b.delta - a.delta;
        return b.velocity - a.velocity;
      });

      // (No global X scale needed any more — each family lays its
      // dots out evenly along its own row, see posFor() below.)

      // Global time range across all visible families. We use the
      // 20th percentile of family-first dates as the floor so a single
      // very-early outlier (e.g. one family that started 6+ months
      // before everyone else) doesn't pull the axis back and squeeze
      // every other family's dots into the right 40% of the row.
      // Releases earlier than the floor clamp to the left edge.
      const firstDates = visible.map(function (d) { return d.first ? d.first.date.getTime() : null; })
                                .filter(function (t) { return t !== null; })
                                .sort(function (a, b) { return a - b; });
      const lastDates = [];
      visible.forEach(function (d) { d.releases.forEach(function (r) { lastDates.push(r.date.getTime()); }); });
      let globalMinTs = firstDates.length ? firstDates[Math.floor(firstDates.length * 0.2)] : Date.now();
      let globalMaxTs = lastDates.length ? Math.max.apply(null, lastDates) : Date.now();
      // Pad the visible time window so dots aren't flush against the
      // edges and the right side has room for the last dot's label.
      const rangeSpan = Math.max(globalMaxTs - globalMinTs, 1000 * 60 * 60 * 24 * 30);
      globalMinTs -= rangeSpan * 0.03;
      globalMaxTs += rangeSpan * 0.12;
      function timePct(date) {
        const ts = date.getTime();
        const raw = ((ts - globalMinTs) / (globalMaxTs - globalMinTs)) * 100;
        // Clamp to [0, 100] so early outliers stack neatly on the left edge.
        return Math.max(0, Math.min(100, raw));
      }

      // Render
      progressRows.innerHTML = '';

      // Top time-axis ruler. Same horizontal padding (180px left for
      // family name, 32px right for the right margin) as the rows
      // below so ticks line up with dot positions.
      const ruler = document.createElement('div');
      ruler.className = 'llm-progress-ruler';
      const rulerBar = document.createElement('div');
      rulerBar.className = 'llm-progress-ruler-track';
      const numTicks = 6;
      for (let i = 0; i <= numTicks; i++) {
        const ts = globalMinTs + (globalMaxTs - globalMinTs) * i / numTicks;
        const tick = document.createElement('span');
        tick.className = 'llm-progress-ruler-tick';
        tick.style.left = ((i / numTicks) * 100) + '%';
        const dateObj = new Date(ts);
        tick.textContent = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
        rulerBar.appendChild(tick);
      }
      ruler.appendChild(rulerBar);
      progressRows.appendChild(ruler);

      visible.forEach(function (d) {
        const color = colorForCompany(d.company);

        const row = document.createElement('div');
        row.className = 'llm-progress-row';
        row.style.setProperty('--row-color', color);

        // Family name + count
        const head = document.createElement('div');
        head.className = 'llm-progress-row-head';
        const nameWrap = document.createElement('div');
        nameWrap.className = 'llm-progress-row-name';
        const sw = document.createElement('span');
        sw.className = 'llm-progress-row-swatch';
        sw.style.background = color;
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = d.company;
        const nameSub = document.createElement('span');
        nameSub.textContent = d.releases.length + ' release' + (d.releases.length === 1 ? '' : 's');
        nameWrap.appendChild(sw);
        nameWrap.appendChild(nameStrong);
        nameWrap.appendChild(nameSub);
        head.appendChild(nameWrap);

        // Track (background bar + filled segment + dots + final dot)
        const track = document.createElement('div');
        track.className = 'llm-progress-track';

        const trackBg = document.createElement('div');
        trackBg.className = 'llm-progress-track-bg';
        track.appendChild(trackBg);

        // Position each release by its real release date on a
        // GLOBAL time axis shared by every visible family. The first
        // family to ship sits on the left edge, the latest on the
        // right. Within a family, time intervals between releases are
        // now visually accurate (close-in-time = close-on-x).
        function posFor(release) {
          return timePct(release.date);
        }

        // Filled segment between first and last frontier dot
        if (d.first && d.last && d.first !== d.last) {
          const fromPct = posFor(d.first);
          const toPct = posFor(d.last);
          const fill = document.createElement('div');
          fill.className = 'llm-progress-track-fill';
          fill.style.left = fromPct + '%';
          fill.style.width = (toPct - fromPct) + '%';
          fill.style.background = color;
          track.appendChild(fill);
        }

        // Non-frontier dots (only when toggle on)
        if (showAll) {
          d.releases.filter(function (r) { return !r.frontier; }).forEach(function (r) {
            const dot = document.createElement('span');
            dot.className = 'llm-progress-dot llm-progress-dot-faint';
            dot.style.left = posFor(r) + '%';
            dot.style.background = color;
            dot.addEventListener('mouseenter', function () { showProgressTip(dot, r, color); });
            dot.addEventListener('mouseleave', hideProgressTip);
            track.appendChild(dot);
          });
        }

        // Frontier dots. Labels are placed as siblings of dots so a
        // JS layout pass below can position them in 4 tiers
        // (near/far × above/below) with collision avoidance.
        const frontierInfo = [];
        d.frontier.forEach(function (r, idx) {
          const dot = document.createElement('span');
          dot.className = 'llm-progress-dot';
          const isLast = idx === d.frontier.length - 1;
          if (isLast) dot.classList.add('llm-progress-dot-final');
          dot.style.left = posFor(r) + '%';
          dot.style.background = color;
          dot.addEventListener('mouseenter', function () { showProgressTip(dot, r, color); });
          dot.addEventListener('mouseleave', hideProgressTip);
          track.appendChild(dot);

          const lab = document.createElement('span');
          lab.className = 'llm-progress-dot-stack';
          const labMain = document.createElement('strong');
          labMain.textContent = r.model + ' · ' + (Math.round(r.score * 100) / 100);
          const labMeta = document.createElement('span');
          labMeta.textContent = fmtYearMonth(r.date);
          lab.appendChild(labMain);
          lab.appendChild(labMeta);
          track.appendChild(lab);

          frontierInfo.push({ dot: dot, lab: lab, r: r, isLast: isLast, pctX: posFor(r) });
        });

        // Defer layout to next frame so we can read clientWidth.
        if (frontierInfo.length) {
          requestAnimationFrame(function () { layoutFrontierLabels(track, frontierInfo, color); });
        }

        head.appendChild(track);

        // Stats column
        const stats = document.createElement('div');
        stats.className = 'llm-progress-row-stats';
        const velStr = (d.velocity > 0 ? '+' : '') + (Math.round(d.velocity * 100) / 100) + ' /mo';
        const monthStr = d.months > 0 ? (Math.round(d.months * 10) / 10 + ' mo') : '—';
        const veloEl = document.createElement('strong');
        veloEl.textContent = d.velocity > 0 ? velStr : '—';
        const subEl = document.createElement('span');
        if (d.first && d.last && d.first !== d.last) {
          subEl.textContent = (Math.round(d.first.score * 10) / 10) + ' → ' + (Math.round(d.last.score * 10) / 10) + ' · ' + monthStr;
        } else if (d.last) {
          subEl.textContent = 'only ' + d.last.model;
        } else {
          subEl.textContent = '';
        }
        // Date range row (e.g. 2025-07 → 2026-04). Makes it obvious
        // when two families' velocities were measured over completely
        // different windows — comparing "+5/mo in 2025-Q3" vs
        // "+5/mo in 2026-Q1" is otherwise misleading.
        const dateEl = document.createElement('span');
        dateEl.className = 'llm-progress-row-dates';
        if (d.first && d.last && d.first !== d.last) {
          dateEl.textContent = fmtYearMonth(d.first.date) + ' → ' + fmtYearMonth(d.last.date);
        } else if (d.last) {
          dateEl.textContent = fmtYearMonth(d.last.date);
        }
        stats.appendChild(veloEl);
        stats.appendChild(subEl);
        if (dateEl.textContent) stats.appendChild(dateEl);
        head.appendChild(stats);

        row.appendChild(head);
        progressRows.appendChild(row);
      });
    }

    if (showAllToggle) showAllToggle.addEventListener('change', renderProgressChart);
    if (sortSelect) sortSelect.addEventListener('change', renderProgressChart);
    window.addEventListener('resize', function () {
      clearTimeout(renderProgressChart._t);
      renderProgressChart._t = setTimeout(renderProgressChart, 120);
    });

    /* ============ Per-family history chart ============ */
    // Independent of the bar chart / velocity card. Pick a single
    // provider + benchmark, draw an SVG scatter with X = release date
    // and Y = score. Every model release in that family becomes a
    // labelled dot.
    const histFamilySel = document.getElementById('llm-history-family');
    const histBenchSel = document.getElementById('llm-history-bench');
    const histBenchSearch = document.getElementById('llm-history-bench-search');
    const histFrontier = document.getElementById('llm-history-frontier');
    const histChart = document.getElementById('llm-history-chart');
    const histEmpty = document.getElementById('llm-history-empty');

    function svgElH(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      return el;
    }

    function fmtMonth(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    // Build family select once.
    (function buildFamilyOptions() {
      if (!histFamilySel) return;
      const seen = new Map();
      (board.rows || []).forEach(function (row) {
        if (!seen.has(row.company)) seen.set(row.company, 0);
        seen.set(row.company, seen.get(row.company) + 1);
      });
      const ordered = Array.from(seen.entries()).sort(function (a, b) { return b[1] - a[1]; });
      ordered.forEach(function (pair) {
        const opt = document.createElement('option');
        opt.value = pair[0];
        opt.textContent = pair[0] + ' (' + pair[1] + ')';
        histFamilySel.appendChild(opt);
      });
      // Default to the family with the most rows.
      if (ordered.length) histFamilySel.value = ordered[0][0];
    })();

    // Build benchmark select with the same natural-sort + search.
    // When `familyFilter` is provided, only benches that the selected
    // family has at least one (date + score) data point for are kept;
    // each option label gets a " (N)" suffix showing release count so
    // it's obvious whether the bench is sparse or dense.
    function familyBenchCounts(family) {
      const counts = new Map();
      if (!family) return counts;
      (board.rows || []).forEach(function (row) {
        if (row.company !== family) return;
        if (!row.released) return;
        const dt = new Date(row.released);
        if (isNaN(dt.getTime())) return;
        Object.keys(row.scores || {}).forEach(function (k) {
          const arr = row.scores[k];
          if (!arr || !arr.length) return;
          let ok = false;
          for (let i = 0; i < arr.length; i++) {
            if (!isNaN(parseScore(arr[i].value))) { ok = true; break; }
          }
          if (!ok) return;
          counts.set(k, (counts.get(k) || 0) + 1);
        });
      });
      return counts;
    }

    function rebuildHistBenchSelect(query, familyFilter) {
      if (!histBenchSel) return;
      histBenchSel.innerHTML = '';
      const q = (query || '').trim().toLowerCase();
      const counts = familyFilter ? familyBenchCounts(familyFilter) : null;
      function bSortKey(label) { return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
      function bCmp(a, b) {
        if (counts) {
          const ca = counts.get(a.key) || 0;
          const cb = counts.get(b.key) || 0;
          if (ca !== cb) return cb - ca; // more releases first
        }
        return bSortKey(a.label).localeCompare(bSortKey(b.label), 'en', { numeric: true, sensitivity: 'base' });
      }
      function passes(b) {
        if (counts && !counts.has(b.key)) return false;
        if (!q) return true;
        return b.label.toLowerCase().indexOf(q) !== -1 || b.key.toLowerCase().indexOf(q) !== -1;
      }
      function optLabel(b) {
        return counts ? (b.label + ' (' + counts.get(b.key) + ')') : b.label;
      }
      const popularItems = chartBenches.filter(function (b) { return popularKeys.indexOf(b.key) !== -1; }).filter(passes).sort(bCmp);
      if (popularItems.length && !q) {
        const og = document.createElement('optgroup');
        og.label = '★ Popular';
        popularItems.forEach(function (b) {
          const opt = document.createElement('option');
          opt.value = b.key;
          opt.textContent = optLabel(b);
          og.appendChild(opt);
        });
        histBenchSel.appendChild(og);
      }
      (board.categories || []).forEach(function (cat) {
        const items = (cat.columns || []).filter(passes).slice().sort(bCmp);
        if (!items.length) return;
        const og = document.createElement('optgroup');
        og.label = cat.name;
        items.forEach(function (col) {
          const opt = document.createElement('option');
          opt.value = col.key;
          opt.textContent = optLabel(col);
          og.appendChild(opt);
        });
        histBenchSel.appendChild(og);
      });
    }
    rebuildHistBenchSelect('', histFamilySel && histFamilySel.value);
    // Default to a sensible bench: try gpqa, then aime_2025, then first option
    (function setDefaultHistBench() {
      if (!histBenchSel) return;
      const prefs = ['gpqa', 'aime_2025', 'swe_verified', 'hle'];
      for (let i = 0; i < prefs.length; i++) {
        for (let j = 0; j < histBenchSel.options.length; j++) {
          if (histBenchSel.options[j].value === prefs[i]) {
            histBenchSel.value = prefs[i];
            return;
          }
        }
      }
      for (let i = 0; i < histBenchSel.options.length; i++) {
        if (histBenchSel.options[i].value) {
          histBenchSel.value = histBenchSel.options[i].value;
          return;
        }
      }
    })();

    function renderHistoryChart() {
      if (!histChart || !histFamilySel || !histBenchSel) return;
      const family = histFamilySel.value;
      const benchKey = histBenchSel.value;
      const showFrontier = histFrontier && histFrontier.checked;

      // Collect data points for that family + bench
      const points = [];
      (board.rows || []).forEach(function (row) {
        if (row.company !== family) return;
        if (!row.released) return;
        const dt = new Date(row.released);
        if (isNaN(dt.getTime())) return;
        const arr = (row.scores || {})[benchKey];
        if (!arr) return;
        let best = NaN;
        arr.forEach(function (s) {
          const v = parseScore(s.value);
          if (!isNaN(v) && (isNaN(best) || v > best)) best = v;
        });
        if (isNaN(best)) return;
        points.push({ model: row.model, date: dt, score: best });
      });

      if (!points.length) {
        histChart.innerHTML = '';
        if (histEmpty) histEmpty.hidden = false;
        return;
      }
      if (histEmpty) histEmpty.hidden = true;

      points.sort(function (a, b) { return a.date - b.date; });

      // Frontier subset (cumulative max)
      let running = -Infinity;
      points.forEach(function (p) {
        if (p.score > running) { p.frontier = true; running = p.score; }
        else p.frontier = false;
      });
      const frontier = points.filter(function (p) { return p.frontier; });

      // Axis ranges
      const dates = points.map(function (p) { return p.date.getTime(); });
      let minTs = Math.min.apply(null, dates);
      let maxTs = Math.max.apply(null, dates);
      const tsPad = (maxTs - minTs) * 0.06 || 1000 * 60 * 60 * 24 * 30;
      minTs -= tsPad;
      maxTs += tsPad;

      const yScores = points.map(function (p) { return p.score; });
      let yMin = Math.min.apply(null, yScores);
      let yMax = Math.max.apply(null, yScores);
      if (yMin === yMax) { yMin = Math.max(0, yMin - 5); yMax = yMax + 5; }
      const yPad = (yMax - yMin) * 0.2 || 5;
      yMin = Math.max(0, yMin - yPad);
      yMax = yMax + yPad;
      const niceStep = function (range) {
        const rough = range / 5;
        const mag = Math.pow(10, Math.floor(Math.log10(rough)));
        const norm = rough / mag;
        const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
        return step * mag;
      };
      const step = niceStep(yMax - yMin);
      yMin = Math.floor(yMin / step) * step;
      yMax = Math.ceil(yMax / step) * step;

      const W = Math.max(640, histChart.clientWidth || 800);
      const H = 440;
      const pad = { top: 30, right: 36, bottom: 56, left: 60 };
      function x(ts) { return pad.left + ((ts - minTs) / (maxTs - minTs)) * (W - pad.left - pad.right); }
      function y(s) { return pad.top + (1 - (s - yMin) / (yMax - yMin)) * (H - pad.top - pad.bottom); }

      const color = colorForCompany(family);
      const lightColor = color + '33'; // ~20% alpha hex suffix

      const svg = svgElH('svg', {
        viewBox: '0 0 ' + W + ' ' + H,
        preserveAspectRatio: 'xMidYMid meet',
        width: '100%',
        height: H + 'px',
        class: 'llm-history-svg'
      });

      // Y grid + labels
      for (let v = yMin; v <= yMax + 0.01; v += step) {
        const yy = y(v);
        svg.appendChild(svgElH('line', {
          x1: pad.left, x2: W - pad.right,
          y1: yy, y2: yy,
          stroke: 'rgba(0,0,0,0.06)', 'stroke-width': 1
        }));
        const t = svgElH('text', {
          x: pad.left - 8, y: yy + 4,
          'text-anchor': 'end',
          'font-size': 11, 'font-family': 'sans-serif',
          fill: '#6b6b65'
        });
        t.textContent = Math.round(v * 100) / 100;
        svg.appendChild(t);
      }

      // X grid + labels
      const numTicks = 5;
      for (let t = 0; t <= numTicks; t++) {
        const tsVal = minTs + (maxTs - minTs) * t / numTicks;
        const xx = x(tsVal);
        svg.appendChild(svgElH('line', {
          x1: xx, x2: xx,
          y1: pad.top, y2: H - pad.bottom,
          stroke: 'rgba(0,0,0,0.03)', 'stroke-width': 1
        }));
        const tx = svgElH('text', {
          x: xx, y: H - pad.bottom + 18,
          'text-anchor': 'middle',
          'font-size': 11, 'font-family': 'sans-serif',
          fill: '#6b6b65'
        });
        tx.textContent = fmtMonth(new Date(tsVal));
        svg.appendChild(tx);
      }

      // Axis frame
      svg.appendChild(svgElH('line', {
        x1: pad.left, x2: W - pad.right,
        y1: H - pad.bottom, y2: H - pad.bottom,
        stroke: 'rgba(0,0,0,0.18)', 'stroke-width': 1
      }));
      svg.appendChild(svgElH('line', {
        x1: pad.left, x2: pad.left,
        y1: pad.top, y2: H - pad.bottom,
        stroke: 'rgba(0,0,0,0.18)', 'stroke-width': 1
      }));

      // Frontier polyline (default ON now — user wants to see the
      // "highest-point" connection by default).
      if (showFrontier && frontier.length >= 2) {
        const pts = frontier.map(function (p) { return x(p.date.getTime()) + ',' + y(p.score); }).join(' ');
        svg.appendChild(svgElH('polyline', {
          points: pts,
          fill: 'none',
          stroke: color,
          'stroke-width': 2.5,
          'stroke-dasharray': '6 4',
          opacity: 0.7
        }));
      }

      // ---- Draw dots ----
      // When multiple releases share the same date (e.g. Pro / Flash /
      // Mini), their circles otherwise stack right on top of each other.
      // Group by exact date and apply a tiny horizontal jitter so each
      // dot is individually clickable.
      const sameDayGroups = new Map();
      points.forEach(function (p) {
        const k = p.date.getTime();
        if (!sameDayGroups.has(k)) sameDayGroups.set(k, []);
        sameDayGroups.get(k).push(p);
      });
      sameDayGroups.forEach(function (group) {
        group.sort(function (a, b) { return b.score - a.score; });
        group.forEach(function (p, i) { p._jitter = (group.length > 1 ? (i - (group.length - 1) / 2) * 6 : 0); });
      });

      const dotPositions = points.map(function (p) {
        return {
          p: p,
          cx: x(p.date.getTime()) + p._jitter,
          cy: y(p.score)
        };
      });

      dotPositions.forEach(function (d) {
        const p = d.p, cx = d.cx, cy = d.cy;
        const isFront = p.frontier;
        svg.appendChild(svgElH('circle', {
          cx: cx, cy: cy, r: isFront ? 6 : 4.5,
          fill: color,
          'fill-opacity': isFront ? 1 : 0.45,
          stroke: '#fff', 'stroke-width': 2
        }));
      });

      // ---- Greedy label placement with collision avoidance ----
      // Approximate text widths so we can place rects without measuring DOM.
      function estLabelWidth(p) {
        const top = String(Math.round(p.score * 100) / 100);
        const bot = p.model;
        return Math.max(top.length * 7, bot.length * 6.2) + 6;
      }
      const labelH = 26; // two-line block height
      const placed = [];
      function overlaps(a, b) {
        return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
      }
      function tryPlace(rect) {
        for (let i = 0; i < placed.length; i++) {
          if (overlaps(rect, placed[i])) return false;
        }
        placed.push(rect);
        return true;
      }

      // Process frontier dots first so their labels get priority slots
      // (they're more important than dominated points).
      const orderedDots = dotPositions.slice().sort(function (a, b) {
        if (a.p.frontier !== b.p.frontier) return a.p.frontier ? -1 : 1;
        return a.cx - b.cx;
      });

      orderedDots.forEach(function (d) {
        const p = d.p, cx = d.cx, cy = d.cy;
        const w = estLabelWidth(p);
        // Candidate slots: above-near, below-near, above-far, below-far,
        // each at small left/right shifts to thread between neighbors.
        const slots = [];
        const yAbove = cy - 14 - labelH;
        const yBelow = cy + 14;
        const yAboveFar = cy - 30 - labelH;
        const yBelowFar = cy + 36;
        const xShifts = [0, w * 0.45, -w * 0.45, w * 0.85, -w * 0.85];
        // Frontier dots prefer ABOVE (above the line); others below.
        const yOrder = p.frontier
          ? [yAbove, yAboveFar, yBelow, yBelowFar]
          : [yBelow, yBelowFar, yAbove, yAboveFar];
        yOrder.forEach(function (yy) {
          xShifts.forEach(function (dx) { slots.push({ x: cx - w / 2 + dx, y: yy, w: w, h: labelH }); });
        });
        // Clamp inside chart area
        const minX = pad.left + 2;
        const maxX = W - pad.right - 2;
        const minY = pad.top + 2;
        const maxY = H - pad.bottom - 2 - labelH;
        let chosen = null;
        for (let s = 0; s < slots.length; s++) {
          const r = slots[s];
          if (r.x < minX || r.x + r.w > maxX || r.y < minY || r.y > maxY) continue;
          if (tryPlace(r)) { chosen = r; break; }
        }
        // Last resort: stack just above the dot regardless of collisions
        if (!chosen) {
          chosen = { x: cx - w / 2, y: cy - 14 - labelH, w: w, h: labelH };
          placed.push(chosen);
        }

        const labelCx = chosen.x + w / 2;
        const labelTopY = chosen.y + 12;
        const labelBotY = chosen.y + 23;

        // Optional leader line if label is far from the dot
        const dotMidY = cy;
        const farThreshold = 18;
        const labelMidY = chosen.y + labelH / 2;
        if (Math.abs(labelMidY - dotMidY) > farThreshold || Math.abs(labelCx - cx) > 4) {
          const lineEndY = labelMidY < dotMidY ? chosen.y + labelH : chosen.y;
          svg.appendChild(svgElH('line', {
            x1: cx, y1: cy,
            x2: labelCx, y2: lineEndY,
            stroke: color, 'stroke-width': 0.8, opacity: 0.35
          }));
        }

        const valText = svgElH('text', {
          x: labelCx, y: labelTopY,
          'text-anchor': 'middle',
          'font-size': 11.5, 'font-weight': 800,
          'font-family': 'sans-serif',
          fill: '#191918'
        });
        valText.textContent = Math.round(p.score * 100) / 100;
        svg.appendChild(valText);
        const nameText = svgElH('text', {
          x: labelCx, y: labelBotY,
          'text-anchor': 'middle',
          'font-size': 10, 'font-weight': p.frontier ? 700 : 600,
          'font-family': 'sans-serif',
          fill: p.frontier ? color : '#6b6b65'
        });
        nameText.textContent = p.model;
        svg.appendChild(nameText);
      });

      histChart.innerHTML = '';
      histChart.appendChild(svg);
    }

    if (histFamilySel) histFamilySel.addEventListener('change', function () {
      // When family changes, rebuild bench select to only show benches
      // that family has data for. Preserve current bench if still
      // available; otherwise fall back to first option.
      const prevBench = histBenchSel ? histBenchSel.value : null;
      rebuildHistBenchSelect(histBenchSearch ? histBenchSearch.value : '', histFamilySel.value);
      if (histBenchSel) {
        let found = false;
        for (let i = 0; i < histBenchSel.options.length; i++) {
          if (histBenchSel.options[i].value === prevBench) { found = true; break; }
        }
        if (found) histBenchSel.value = prevBench;
        else {
          for (let i = 0; i < histBenchSel.options.length; i++) {
            if (histBenchSel.options[i].value) { histBenchSel.value = histBenchSel.options[i].value; break; }
          }
        }
      }
      renderHistoryChart();
    });
    if (histBenchSel) histBenchSel.addEventListener('change', renderHistoryChart);
    if (histFrontier) histFrontier.addEventListener('change', renderHistoryChart);
    if (histBenchSearch) {
      let t = null;
      histBenchSearch.addEventListener('input', function () {
        if (t) clearTimeout(t);
        t = setTimeout(function () {
          const prev = histBenchSel.value;
          rebuildHistBenchSelect(histBenchSearch.value, histFamilySel && histFamilySel.value);
          let found = false;
          for (let i = 0; i < histBenchSel.options.length; i++) {
            if (histBenchSel.options[i].value === prev) { found = true; break; }
          }
          if (found) histBenchSel.value = prev;
          else {
            for (let i = 0; i < histBenchSel.options.length; i++) {
              if (histBenchSel.options[i].value) { histBenchSel.value = histBenchSel.options[i].value; break; }
            }
          }
          renderHistoryChart();
        }, 100);
      });
    }
    window.addEventListener('resize', function () {
      clearTimeout(renderHistoryChart._t);
      renderHistoryChart._t = setTimeout(renderHistoryChart, 120);
    });
    renderHistoryChart();

    // Wire up the chart-side search input: filter the <select>, then
    // auto-select the first surviving option and re-render.
    const chartSearch = document.getElementById('llm-chart-search');
    if (chartSearch) {
      let searchTimer = null;
      chartSearch.addEventListener('input', function () {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          const prev = select.value;
          rebuildBenchSelect(chartSearch.value);
          // Preserve current selection if still present; otherwise pick first.
          let foundPrev = false;
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === prev) { foundPrev = true; break; }
          }
          if (foundPrev) {
            select.value = prev;
          } else {
            for (let i = 0; i < select.options.length; i++) {
              if (select.options[i].value) { select.value = select.options[i].value; break; }
            }
          }
          renderChart();
          renderProgressChart();
        }, 100);
      });
    }

    renderChart();
    renderProgressChart();
  });
})();
