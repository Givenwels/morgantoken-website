(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const table = document.getElementById('code-agent-table');
    const filter = document.getElementById('code-agent-filter');
    const chart = document.getElementById('code-agent-chart-bars');
    const metricSelect = document.getElementById('code-agent-chart-metric');
    const limitSelect = document.getElementById('code-agent-chart-limit');
    const scatter = document.getElementById('code-agent-scatter-plot');
    const scatterAxis = document.getElementById('code-agent-scatter-x-axis');

    if (!table) return;

    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);
    const chartItems = chart ? Array.from(chart.querySelectorAll('.code-agent-chart-item')) : [];
    const scatterPoints = scatter ? Array.from(scatter.querySelectorAll('.code-agent-scatter-point')) : [];
    const headers = Array.from(table.querySelectorAll('th[data-sort-key]'));
    let currentAgent = 'all';
    let currentSortKey = 'final-score';
    let currentSortDirection = 'desc';

    function getAttr(element, key) {
      return element.getAttribute('data-' + key) || '';
    }

    function getNumeric(element, key) {
      const value = Number.parseFloat(getAttr(element, key));
      return Number.isFinite(value) ? value : 0;
    }

    function formatPercent(value) {
      return (value * 100).toFixed(1).replace(/\.0$/, '') + '%';
    }

    function formatValue(value, format) {
      if (format === 'percent') return formatPercent(value);
      if (format === 'decimal2') return value.toFixed(2);
      if (format === 'integer') return Math.round(value).toLocaleString();
      if (format === 'compact') return compactNumber(value);
      if (format === 'size') return value.toFixed(1).replace(/\.0$/, '') + ' MB';
      return String(value);
    }

    function compactNumber(value) {
      if (!Number.isFinite(value) || value <= 0) return '--';
      const rounded = (value / 1000).toFixed(1).replace(/\.0$/, '');
      const parts = rounded.split('.');
      parts[0] = Number(parts[0]).toLocaleString();
      return parts.join('.') + 'K';
    }

    function visibleForAgent(element) {
      return currentAgent === 'all' || getAttr(element, 'agent') === currentAgent;
    }

    function compareRows(a, b, key, direction, type) {
      let av;
      let bv;
      if (type === 'number') {
        av = getNumeric(a, key);
        bv = getNumeric(b, key);
      } else {
        av = getAttr(a, key).toLowerCase();
        bv = getAttr(b, key).toLowerCase();
      }
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return getNumeric(a, 'rank') - getNumeric(b, 'rank');
    }

    function syncSortIndicators() {
      headers.forEach(function (header) {
        const indicator = header.querySelector('.bench-sort-indicator');
        const active = header.dataset.sortKey === currentSortKey;
        header.classList.toggle('bench-sort-active', active);
        header.classList.add('bench-sortable');
        if (indicator) indicator.textContent = active ? (currentSortDirection === 'asc' ? '^' : 'v') : '';
      });
    }

    function sortTable() {
      const header = headers.find(function (item) {
        return item.dataset.sortKey === currentSortKey;
      });
      const type = header ? header.dataset.sortType : 'number';
      rows
        .slice()
        .sort(function (a, b) {
          return compareRows(a, b, currentSortKey, currentSortDirection, type);
        })
        .forEach(function (row) {
          tbody.appendChild(row);
        });
      syncSortIndicators();
    }

    function updateTableFilter() {
      rows.forEach(function (row) {
        row.hidden = !visibleForAgent(row);
      });
    }

    function sortedChartItems(metric) {
      return chartItems
        .filter(visibleForAgent)
        .slice()
        .sort(function (a, b) {
          const delta = getNumeric(b, metric) - getNumeric(a, metric);
          if (delta !== 0) return delta;
          return getNumeric(a, 'rank') - getNumeric(b, 'rank');
        });
    }

    function updateChart() {
      if (!chart || !metricSelect || !limitSelect) return;
      const metric = metricSelect.value;
      const format = metricSelect.selectedOptions[0] ? metricSelect.selectedOptions[0].dataset.format : 'percent';
      const limitValue = limitSelect.value;
      const limit = limitValue === 'all' ? Infinity : Number.parseInt(limitValue, 10);
      const sorted = sortedChartItems(metric);
      const visible = sorted.slice(0, limit);
      const values = visible.map(function (item) {
        return getNumeric(item, metric);
      });
      const maxValue = values.length ? Math.max.apply(null, values) : 0;
      const minValue = values.length ? Math.min.apply(null, values) : 0;
      const range = maxValue - minValue || 1;

      chartItems.forEach(function (item) {
        item.hidden = true;
      });

      sorted.forEach(function (item, index) {
        const shouldShow = index < limit;
        item.hidden = !shouldShow;
        if (!shouldShow) return;

        const value = getNumeric(item, metric);
        const rank = item.querySelector('.bench-chart-rank');
        const label = item.querySelector('.bench-chart-value');
        const fill = item.querySelector('.bench-chart-fill');
        const normalized = (value - minValue) / range;
        const height = 72 + normalized * 188;

        chart.appendChild(item);
        if (rank) rank.textContent = '#' + (index + 1);
        if (label) label.textContent = formatValue(value, format);
        if (label) label.style.bottom = (height + 2) + 'px';
        if (fill) fill.style.height = height + 'px';
        item.style.order = index;
      });
    }

    function axisLabels(maxValue) {
      if (!scatterAxis) return;
      scatterAxis.innerHTML = '';
      [0, 0.25, 0.5, 0.75, 1].forEach(function (ratio, index, all) {
        const label = document.createElement('span');
        label.textContent = formatPercent(maxValue * ratio);
        label.style.left = (ratio * 100) + '%';
        if (index === 0) label.classList.add('is-edge-left');
        if (index === all.length - 1) label.classList.add('is-edge-right');
        scatterAxis.appendChild(label);
      });
    }

    function updateScatter() {
      if (!scatter) return;
      const visible = scatterPoints.filter(visibleForAgent);
      const maxX = Math.max.apply(null, visible.map(function (point) {
        return getNumeric(point, 'pass-3-rate');
      }).concat([0.001]));
      const maxY = Math.max.apply(null, visible.map(function (point) {
        return getNumeric(point, 'pass-at-3-rate');
      }).concat([0.001]));
      const paddedX = Math.max(0.3, maxX * 1.12);
      const paddedY = Math.max(0.42, maxY * 1.08);

      scatterPoints.forEach(function (point) {
        const show = visibleForAgent(point);
        point.hidden = !show;
        if (!show) return;

        const x = Math.min(96, (getNumeric(point, 'pass-3-rate') / paddedX) * 100);
        const y = Math.min(94, (getNumeric(point, 'pass-at-3-rate') / paddedY) * 100);
        point.style.left = x + '%';
        point.style.bottom = y + '%';
        point.classList.toggle('bench-scatter-point-flip', x > 78);
      });

      axisLabels(paddedX);
    }

    function updateAll() {
      updateTableFilter();
      sortTable();
      updateChart();
      updateScatter();
    }

    headers.forEach(function (header) {
      header.addEventListener('click', function () {
        const key = header.dataset.sortKey;
        if (currentSortKey === key) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortKey = key;
          currentSortDirection = header.dataset.sortType === 'text' ? 'asc' : 'desc';
        }
        updateAll();
      });
    });

    if (filter) {
      filter.addEventListener('click', function (event) {
        const button = event.target.closest('button[data-code-agent-filter]');
        if (!button) return;
        currentAgent = button.dataset.codeAgentFilter || 'all';
        Array.from(filter.querySelectorAll('button')).forEach(function (item) {
          item.classList.toggle('is-active', item === button);
        });
        updateAll();
      });
    }

    if (metricSelect) metricSelect.addEventListener('change', updateChart);
    if (limitSelect) limitSelect.addEventListener('change', updateChart);
    window.addEventListener('resize', updateScatter, { passive: true });

    updateAll();
  });
})();
