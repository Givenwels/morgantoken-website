document.addEventListener('DOMContentLoaded', function () {
  const app = document.getElementById('modelpk-app');
  const dataNode = document.getElementById('modelpk-data');
  const closedDataNode = document.getElementById('modelpk-closed-data');
  if (!app || !dataNode) return;

  const baseUrl = app.dataset.baseurl || '';
  let openModels = [];
  let closedModels = [];

  try {
    openModels = JSON.parse(dataNode.textContent || '[]');
    closedModels = closedDataNode ? JSON.parse(closedDataNode.textContent || '[]') : [];
  } catch (error) {
    renderFatalError('ModelPK data failed to load.');
    return;
  }

  const datasetFilter = document.getElementById('modelpk-dataset-filter');
  const selectA = document.getElementById('modelpk-model-a');
  const selectB = document.getElementById('modelpk-model-b');
  const searchA = document.getElementById('modelpk-search-a');
  const searchB = document.getElementById('modelpk-search-b');
  const searchHintA = document.getElementById('modelpk-search-hint-a');
  const searchHintB = document.getElementById('modelpk-search-hint-b');
  const runButton = document.getElementById('modelpk-run');
  const swapButton = document.getElementById('modelpk-swap');
  const resetButton = document.getElementById('modelpk-reset');
  const warning = document.getElementById('modelpk-warning');
  const summaryGrid = document.getElementById('modelpk-summary-grid');
  const verdict = document.getElementById('modelpk-verdict');
  const radar = document.getElementById('modelpk-radar');
  const dimensionLegend = document.getElementById('modelpk-dimension-legend');
  const dimensionGrid = document.getElementById('modelpk-dimension-grid');
  const dimensionFilter = document.getElementById('modelpk-dimension-filter');
  const taskSort = document.getElementById('modelpk-task-sort');
  const taskSearch = document.getElementById('modelpk-task-search');
  const diffOnly = document.getElementById('modelpk-diff-only');
  const taskSummary = document.getElementById('modelpk-task-summary');
  const taskRows = document.getElementById('modelpk-task-rows');
  const taskHeadA = document.getElementById('modelpk-task-head-a');
  const taskHeadB = document.getElementById('modelpk-task-head-b');
  const taskSectionHead = document.getElementById('modelpk-task-section-head');
  const taskCard = document.getElementById('modelpk-task-card');

  const dimensionDefs = [
    { key: 'planning_score', label: 'Planning', dimension: 'planning', icon: 'route' },
    { key: 'safety_score', label: 'Safety', dimension: 'safety', icon: 'shield' },
    { key: 'tool_use_score', label: 'Tool Use', dimension: 'tool_use', icon: 'tool' },
    { key: 'constraints_score', label: 'Constraints', dimension: 'constraints', icon: 'lock' },
    { key: 'error_recovery_score', label: 'Error Recovery', dimension: 'error_recovery', icon: 'recover' },
    { key: 'synthesis_score', label: 'Synthesis', dimension: 'synthesis', icon: 'layers' }
  ];

  const coreMetrics = [
    { key: 'final_score', label: 'Final', type: 'score' },
    { key: 'overall_score', label: 'Avg Score', type: 'percent' },
    { key: 'pass3', label: 'Pass^3', type: 'percent' },
    { key: 'pass_at_3', label: 'Pass@3', type: 'percent' }
  ];

  let currentDataset = 'open';
  let models = [];
  let modelById = new Map();
  let rankedModels = [];
  let currentModelA = null;
  let currentModelB = null;
  let currentRows = [];

  function normalizeModels(source, dataset) {
    return (source || []).map(function (model) {
      model.dataset_type = dataset;
      return model;
    });
  }

  openModels = normalizeModels(openModels, 'open');
  closedModels = normalizeModels(closedModels, 'closed');

  function refreshModelCollections() {
    models = currentDataset === 'closed' ? closedModels : openModels;
    modelById = new Map(models.map(function (model) {
      return [model.id, model];
    }));
    rankedModels = models.slice().sort(function (a, b) {
      const rankA = Number(a.rank) || 9999;
      const rankB = Number(b.rank) || 9999;
      if (rankA !== rankB) return rankA - rankB;
      return String(a.model_name || '').localeCompare(String(b.model_name || ''));
    });
  }

  function renderFatalError(message) {
    if (!app) return;
    app.innerHTML = '<div class="container-wide bench-shell"><div class="bench-card modelpk-warning-card">' + escapeHtml(message) + '</div></div>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function languageAwareUrl(href) {
    if (window.ClawProBenchI18n && window.ClawProBenchI18n.url) {
      return window.ClawProBenchI18n.url(href);
    }
    return href;
  }

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function signed(value, digits) {
    const rounded = value.toFixed(digits);
    return value > 0 ? '+' + rounded : rounded;
  }

  function formatMetric(value, type) {
    const num = toNumber(value);
    if (type === 'score') return num.toFixed(2);
    if (type === 'tokens') return Math.round(num).toLocaleString();
    if (type === 'runtime') return num.toFixed(2) + 's';
    if (type === 'currency') return '$' + num.toFixed(4);
    return (num * 100).toFixed(1);
  }

  function calculateFinalScore(model) {
    const score = toNumber(model.overall_score);
    const pass3 = toNumber(model.pass3);
    const passAt3 = toNumber(model.pass_at_3);
    if (score <= 0 || pass3 <= 0 || passAt3 <= 0 || passAt3 > 1) return 0;
    const rAll = Math.pow(pass3, 1 / 3);
    const rAny = 1 - Math.pow(1 - passAt3, 1 / 3);
    return 100 * Math.pow(score, 0.40) * Math.pow(rAll, 0.45) * Math.pow(rAny, 0.15);
  }

  function metricValue(model, key) {
    if (key === 'final_score') {
      const existing = toNumber(model.final_score);
      return existing > 0 ? existing : calculateFinalScore(model);
    }
    return toNumber(model[key]);
  }

  function formatDelta(value, type) {
    if (type === 'score') return signed(value, 2);
    return signed(value * 100, 1);
  }

  function scoreWidth(value, type) {
    const num = toNumber(value);
    if (type === 'score') return Math.max(0, Math.min(100, num));
    return Math.max(0, Math.min(100, num * 100));
  }

  function iconSvg(name) {
    const labels = {
      route: 'PL',
      shield: 'SF',
      tool: 'TU',
      lock: 'CT',
      recover: 'ER',
      layers: 'SY',
      trophy: 'PK'
    };
    return '<span class="modelpk-icon-glyph" aria-hidden="true">' + (labels[name] || 'PK') + '</span>';
  }

  function modelLogo(model) {
    if (!model || !model.logo) {
      return '<span class="modelpk-logo-placeholder">' + escapeHtml((model && model.model_name ? model.model_name[0] : '?').toUpperCase()) + '</span>';
    }
    return '<img width="48" height="48" style="width:48px;height:48px;object-fit:contain;border-radius:12px;" src="' + baseUrl + '/assets/images/bench/' + escapeHtml(model.logo) + '" alt="' + escapeHtml(model.provider_key || model.model_name || 'model') + ' logo" />';
  }

  function optionLabel(model) {
    const rank = model.rank ? '#' + model.rank + ' · ' : '';
    return rank + model.model_name + ' · ' + model.provider_key;
  }

  function normalizeSearch(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[_/\\.-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function modelSearchText(model) {
    return normalizeSearch([
      model.id,
      model.source_id,
      model.slug,
      model.model,
      model.model_name,
      model.provider_key,
      model.platform,
      model.status,
      model.dataset_type,
      model.rank ? 'rank ' + model.rank + ' #' + model.rank : ''
    ].join(' '));
  }

  function fuzzySubsequenceScore(query, text) {
    const compactQuery = query.replace(/\s+/g, '');
    const compactText = text.replace(/\s+/g, '');
    if (!compactQuery) return 0;

    let position = 0;
    let firstMatch = -1;
    let lastMatch = -1;
    let gaps = 0;

    for (let i = 0; i < compactQuery.length; i += 1) {
      const found = compactText.indexOf(compactQuery[i], position);
      if (found === -1) return Infinity;
      if (firstMatch === -1) firstMatch = found;
      if (lastMatch !== -1) gaps += Math.max(0, found - lastMatch - 1);
      lastMatch = found;
      position = found + 1;
    }

    return 60 + firstMatch + gaps;
  }

  function modelMatchScore(model, query) {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return (Number(model.rank) || 9999) / 10000;

    const text = modelSearchText(model);
    if (text.includes(normalizedQuery)) return text.indexOf(normalizedQuery);

    const tokens = normalizedQuery.split(' ').filter(Boolean);
    if (tokens.length && tokens.every(function (token) { return text.includes(token); })) {
      return 25 + tokens.reduce(function (sum, token) { return sum + text.indexOf(token); }, 0);
    }

    return fuzzySubsequenceScore(normalizedQuery, text);
  }

  function matchingModels(query) {
    return rankedModels
      .map(function (model) {
        return { model: model, score: modelMatchScore(model, query) };
      })
      .filter(function (entry) {
        return Number.isFinite(entry.score);
      })
      .sort(function (a, b) {
        if (a.score !== b.score) return a.score - b.score;
        return (Number(a.model.rank) || 9999) - (Number(b.model.rank) || 9999);
      })
      .map(function (entry) {
        return entry.model;
      });
  }

  function populateSelect(select, searchInput, hint, selectedId) {
    const query = searchInput ? searchInput.value : '';
    const hasQuery = Boolean(normalizeSearch(query));
    const matches = matchingModels(query);
    const displayed = matches.slice(0, 35);
    const selectedModel = modelById.get(selectedId);

    if (!hasQuery && selectedModel && !displayed.some(function (model) { return model.id === selectedId; })) {
      displayed.unshift(selectedModel);
    }

    if (!displayed.length) {
      select.innerHTML = '<option value="">No matching models</option>';
      select.disabled = true;
      if (hint) hint.textContent = 'No matches';
      return null;
    }

    select.disabled = false;
    select.innerHTML = displayed.map(function (model) {
      return '<option value="' + escapeHtml(model.id) + '">' + escapeHtml(optionLabel(model)) + '</option>';
    }).join('');

    const nextId = displayed.some(function (model) { return model.id === selectedId; }) ? selectedId : displayed[0].id;
    select.value = nextId;

    if (hint) {
      const suffix = matches.length > displayed.length ? ' · showing top ' + displayed.length : '';
      hint.textContent = matches.length + ' matches' + suffix;
    }

    return nextId;
  }

  function compactName(model, limit) {
    const name = String((model && model.model_name) || (model && model.id) || 'model');
    const max = limit || 22;
    return name.length > max ? name.slice(0, max - 1) + '…' : name;
  }

  function populateModelOptions() {
    populateSelect(selectA, searchA, searchHintA, selectA.value);
    populateSelect(selectB, searchB, searchHintB, selectB.value);
  }

  function scenarioMap(model) {
    const map = new Map();
    (model.scenario_rows || []).forEach(function (row) {
      if (row && row.scenario_id) map.set(row.scenario_id, row);
    });
    return map;
  }

  function allScenarioRows(modelA, modelB) {
    const mapA = scenarioMap(modelA);
    const mapB = scenarioMap(modelB);
    const ids = new Set([].concat(Array.from(mapA.keys()), Array.from(mapB.keys())));
    return Array.from(ids).map(function (id) {
      const rowA = mapA.get(id) || {};
      const rowB = mapB.get(id) || {};
      const base = rowA.scenario_id ? rowA : rowB;
      const scoreA = rowA.scenario_id ? toNumber(rowA.avg_score) : null;
      const scoreB = rowB.scenario_id ? toNumber(rowB.avg_score) : null;
      return {
        scenario_id: id,
        name: base.name || id,
        dimension: base.dimension || 'unknown',
        difficulty: base.difficulty || '',
        scoreA: scoreA,
        scoreB: scoreB,
        strictA: Boolean(rowA.strict_pass_k),
        strictB: Boolean(rowB.strict_pass_k),
        delta: scoreA == null || scoreB == null ? 0 : scoreA - scoreB
      };
    });
  }

  function renderModelCard(model, side) {
    const metrics = coreMetrics.map(function (metric) {
      return '<div><span>' + metric.label + '</span><strong>' + formatMetric(metricValue(model, metric.key), metric.type) + '</strong></div>';
    }).join('');
    const rankLabel = currentDataset === 'closed' ? 'Closed Rank #' : 'Rank #';
    const datasetLabel = currentDataset === 'closed' ? 'Closed Dataset' : 'Open Dataset';
    const detailHref = currentDataset === 'open'
      ? baseUrl + '/bench/models/' + (model.slug || '') + '/'
      : baseUrl + '/bench/closed-models/?id=' + encodeURIComponent(model.id || '');
    const detailLabel = currentDataset === 'open' ? 'Open detail' : 'Closed detail';
    const detailLink = model.slug || currentDataset === 'closed'
      ? '  <a class="modelpk-model-link" href="' + escapeHtml(languageAwareUrl(detailHref)) + '">' + detailLabel + '</a>'
      : '';
    return [
      '<article class="bench-card modelpk-model-card modelpk-' + side + '">',
      '  <div class="modelpk-model-head">',
      '    <div class="modelpk-logo">' + modelLogo(model) + '</div>',
      '    <div>',
      '      <span class="modelpk-side-label">Model ' + side.toUpperCase() + '</span>',
      '      <h3>' + escapeHtml(model.model_name || model.id) + '</h3>',
      '      <p>' + escapeHtml(model.provider_key || '') + ' · ' + escapeHtml(model.platform || '') + '</p>',
      '    </div>',
      '  </div>',
      '  <div class="modelpk-model-meta">',
      '    <span>' + rankLabel + escapeHtml(model.rank || 'NA') + '</span>',
      '    <span>' + datasetLabel + '</span>',
      '    <span>' + escapeHtml(model.status || 'unknown') + '</span>',
      '    <span>' + escapeHtml(model.released_at || 'release unknown') + '</span>',
      '  </div>',
      '  <div class="modelpk-model-metrics">' + metrics + '</div>',
      detailLink,
      '</article>'
    ].join('');
  }

  function renderSummary(modelA, modelB) {
    summaryGrid.innerHTML = renderModelCard(modelA, 'a') + renderModelCard(modelB, 'b');
  }

  function renderVerdict(modelA, modelB, taskRowsForPair) {
    const hasTaskBreakdown = currentDataset === 'open' && taskRowsForPair.length > 0;
    const dimensionWins = dimensionDefs.reduce(function (acc, def) {
      const delta = toNumber(modelA[def.key]) - toNumber(modelB[def.key]);
      if (Math.abs(delta) < 0.0001) acc.tie += 1;
      else if (delta > 0) acc.a += 1;
      else acc.b += 1;
      return acc;
    }, { a: 0, b: 0, tie: 0 });

    const taskWins = hasTaskBreakdown ? taskRowsForPair.reduce(function (acc, row) {
      if (row.scoreA == null || row.scoreB == null || Math.abs(row.delta) < 0.0001) acc.tie += 1;
      else if (row.delta > 0) acc.a += 1;
      else acc.b += 1;
      return acc;
    }, { a: 0, b: 0, tie: 0 }) : { a: 0, b: 0, tie: 0 };

    const biggest = hasTaskBreakdown
      ? taskRowsForPair
        .filter(function (row) { return row.scoreA != null && row.scoreB != null; })
        .sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); })
        .slice(0, 3)
        .map(function (row) {
          const leader = row.delta > 0 ? modelA.model_name : modelB.model_name;
          return '<li><strong>' + escapeHtml(row.scenario_id) + '</strong><span>' + escapeHtml(leader) + ' leads by ' + Math.abs(row.delta * 100).toFixed(1) + '</span></li>';
        }).join('')
      : dimensionDefs
        .map(function (def) {
          return {
            label: def.label,
            delta: toNumber(modelA[def.key]) - toNumber(modelB[def.key])
          };
        })
        .sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); })
        .slice(0, 3)
        .map(function (item) {
          const leader = Math.abs(item.delta) < 0.0001 ? 'Tie' : (item.delta > 0 ? modelA.model_name : modelB.model_name);
          const detail = Math.abs(item.delta) < 0.0001
            ? 'is tied'
            : escapeHtml(leader) + ' leads by ' + Math.abs(item.delta * 100).toFixed(1);
          return '<li><strong>' + escapeHtml(item.label) + '</strong><span>' + detail + '</span></li>';
        }).join('');

    const finalDelta = metricValue(modelA, 'final_score') - metricValue(modelB, 'final_score');
    const headline = Math.abs(finalDelta) < 0.0001
      ? 'Final Score is tied'
      : (finalDelta > 0 ? modelA.model_name : modelB.model_name) + ' leads Final Score by ' + Math.abs(finalDelta).toFixed(2);
    const verdictStats = hasTaskBreakdown ? [
      '  <div><span>Task wins A</span><strong>' + taskWins.a + '</strong></div>',
      '  <div><span>Task wins B</span><strong>' + taskWins.b + '</strong></div>',
      '  <div><span>Task ties</span><strong>' + taskWins.tie + '</strong></div>'
    ].join('') : coreMetrics.slice(0, 3).map(function (metric) {
      const delta = metricValue(modelA, metric.key) - metricValue(modelB, metric.key);
      return '<div><span>' + escapeHtml(metric.label) + ' Delta</span><strong>' + formatDelta(delta, metric.type) + '</strong></div>';
    }).join('');

    verdict.innerHTML = [
      '<div class="modelpk-verdict-main">',
      '  <div class="modelpk-verdict-icon">' + iconSvg('trophy') + '</div>',
      '  <div><p class="bench-kicker">PK verdict</p><h2>' + escapeHtml(headline) + '</h2><p>Dimension wins: ' + escapeHtml(modelA.model_name) + ' ' + dimensionWins.a + ', ' + escapeHtml(modelB.model_name) + ' ' + dimensionWins.b + ', ties ' + dimensionWins.tie + '.</p></div>',
      '</div>',
      '<div class="modelpk-verdict-stats">',
      verdictStats,
      '</div>',
      '<ul class="modelpk-biggest-gaps">' + biggest + '</ul>'
    ].join('');
  }

  function radarPoint(index, value, radius) {
    const angle = (-90 + (360 / dimensionDefs.length) * index) * Math.PI / 180;
    const distance = radius * Math.max(0, Math.min(1, value));
    return {
      x: 160 + Math.cos(angle) * distance,
      y: 160 + Math.sin(angle) * distance
    };
  }

  function radarPolygon(model, radius) {
    return dimensionDefs.map(function (def, index) {
      const point = radarPoint(index, toNumber(model[def.key]), radius);
      return point.x.toFixed(2) + ',' + point.y.toFixed(2);
    }).join(' ');
  }

  function radarRingPoints(scale, radius) {
    return dimensionDefs.map(function (_, index) {
      const point = radarPoint(index, scale, radius);
      return point.x.toFixed(2) + ',' + point.y.toFixed(2);
    }).join(' ');
  }

  function renderRadar(modelA, modelB) {
    const radius = 104;
    const axes = dimensionDefs.map(function (def, index) {
      const outer = radarPoint(index, 1, radius);
      const label = radarPoint(index, 1.18, radius);
      const anchor = label.x < 130 ? 'end' : label.x > 190 ? 'start' : 'middle';
      return [
        '<line stroke="rgba(16,17,20,0.12)" stroke-width="1" x1="160" y1="160" x2="' + outer.x.toFixed(2) + '" y2="' + outer.y.toFixed(2) + '" />',
        '<text fill="#6f6a62" font-size="10" font-weight="800" x="' + label.x.toFixed(2) + '" y="' + label.y.toFixed(2) + '" text-anchor="' + anchor + '">' + escapeHtml(def.label) + '</text>'
      ].join('');
    }).join('');

    const detailRows = dimensionDefs.map(function (def) {
      const valueA = toNumber(modelA[def.key]);
      const valueB = toNumber(modelB[def.key]);
      const delta = valueA - valueB;
      const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
      return [
        '<div class="modelpk-radar-detail-row">',
        '  <span>' + escapeHtml(def.label) + '</span>',
        '  <strong>' + formatMetric(valueA, 'percent') + '</strong>',
        '  <strong>' + formatMetric(valueB, 'percent') + '</strong>',
        '  <em class="' + deltaClass + '">' + formatDelta(delta, 'percent') + '</em>',
        '</div>'
      ].join('');
    }).join('');

    radar.innerHTML = [
      '<div class="modelpk-radar-copy">',
      '  <p class="bench-kicker">Radar view</p>',
      '  <h2>Six-Dimension Shape</h2>',
      '  <p>The radar chart highlights where each model is balanced or spiky across planning, safety, tool use, constraints, error recovery, and synthesis.</p>',
      '  <div class="modelpk-radar-legend">',
      '    <span class="modelpk-radar-legend-a">' + escapeHtml(modelA.model_name) + '</span>',
      '    <span class="modelpk-radar-legend-b">' + escapeHtml(modelB.model_name) + '</span>',
      '  </div>',
      '</div>',
      '<div class="modelpk-radar-visual">',
      '  <svg width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Dimension radar comparison">',
      '    <g class="modelpk-radar-grid">',
      '      <polygon fill="none" stroke="rgba(16,17,20,0.11)" stroke-width="1" points="' + radarRingPoints(0.25, radius) + '" />',
      '      <polygon fill="none" stroke="rgba(16,17,20,0.11)" stroke-width="1" points="' + radarRingPoints(0.5, radius) + '" />',
      '      <polygon fill="none" stroke="rgba(16,17,20,0.11)" stroke-width="1" points="' + radarRingPoints(0.75, radius) + '" />',
      '      <polygon fill="none" stroke="rgba(16,17,20,0.11)" stroke-width="1" points="' + radarRingPoints(1, radius) + '" />',
      axes,
      '    </g>',
      '    <polygon class="modelpk-radar-area modelpk-radar-area-a" fill="rgba(77,108,240,0.22)" stroke="#4d6cf0" stroke-width="3" stroke-linejoin="round" points="' + radarPolygon(modelA, radius) + '" />',
      '    <polygon class="modelpk-radar-area modelpk-radar-area-b" fill="rgba(199,111,70,0.22)" stroke="#c76f46" stroke-width="3" stroke-linejoin="round" points="' + radarPolygon(modelB, radius) + '" />',
      '    <polyline class="modelpk-radar-line modelpk-radar-line-a" fill="none" stroke="#4d6cf0" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + radarPolygon(modelA, radius) + ' ' + radarPolygon(modelA, radius).split(' ')[0] + '" />',
      '    <polyline class="modelpk-radar-line modelpk-radar-line-b" fill="none" stroke="#c76f46" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + radarPolygon(modelB, radius) + ' ' + radarPolygon(modelB, radius).split(' ')[0] + '" />',
      '  </svg>',
      '</div>',
      '<div class="modelpk-radar-detail">',
      '  <div class="modelpk-radar-detail-head"><span>Dimension</span><strong>A</strong><strong>B</strong><em>Delta</em></div>',
      detailRows,
      '</div>'
    ].join('');
  }

  function renderDimensions(modelA, modelB) {
    if (dimensionLegend) {
      dimensionLegend.innerHTML = [
        '<span class="modelpk-dimension-legend-a"><em>A</em><strong title="' + escapeHtml(modelA.model_name || modelA.id) + '">' + escapeHtml(compactName(modelA, 30)) + '</strong></span>',
        '<span class="modelpk-dimension-legend-b"><em>B</em><strong title="' + escapeHtml(modelB.model_name || modelB.id) + '">' + escapeHtml(compactName(modelB, 30)) + '</strong></span>',
        '<span class="modelpk-dimension-legend-delta">Delta = A - B</span>'
      ].join('');
    }

    dimensionGrid.innerHTML = dimensionDefs.map(function (def) {
      const valueA = toNumber(modelA[def.key]);
      const valueB = toNumber(modelB[def.key]);
      const delta = valueA - valueB;
      const winner = Math.abs(delta) < 0.0001 ? 'Tie' : (delta > 0 ? 'A leads' : 'B leads');
      const labelA = '<span class="modelpk-bar-model modelpk-bar-model-a"><em>A</em><b title="' + escapeHtml(modelA.model_name || modelA.id) + '">' + escapeHtml(compactName(modelA, 20)) + '</b></span>';
      const labelB = '<span class="modelpk-bar-model modelpk-bar-model-b"><em>B</em><b title="' + escapeHtml(modelB.model_name || modelB.id) + '">' + escapeHtml(compactName(modelB, 20)) + '</b></span>';
      return [
        '<div class="modelpk-dimension-row">',
        '  <div class="modelpk-dimension-label"><span class="modelpk-dimension-icon">' + iconSvg(def.icon) + '</span><strong>' + def.label + '</strong></div>',
        '  <div class="modelpk-dimension-bars">',
        '    <div>' + labelA + '<div class="modelpk-score-track"><i style="width:' + scoreWidth(valueA, 'percent') + '%"></i></div><strong>' + formatMetric(valueA, 'percent') + '</strong></div>',
        '    <div>' + labelB + '<div class="modelpk-score-track"><i style="width:' + scoreWidth(valueB, 'percent') + '%"></i></div><strong>' + formatMetric(valueB, 'percent') + '</strong></div>',
        '  </div>',
        '  <div class="modelpk-delta ' + (delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral') + '"><strong>' + formatDelta(delta, 'percent') + '</strong><span>' + winner + '</span></div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function populateDimensionFilter(rows) {
    const current = dimensionFilter.value || 'all';
    const dimensions = Array.from(new Set(rows.map(function (row) { return row.dimension; }))).sort();
    dimensionFilter.innerHTML = '<option value="all">All dimensions</option>' + dimensions.map(function (dimension) {
      return '<option value="' + escapeHtml(dimension) + '">' + escapeHtml(dimension.replace(/_/g, ' ')) + '</option>';
    }).join('');
    if (dimensions.includes(current)) dimensionFilter.value = current;
  }

  function filteredTaskRows(rows) {
    const dimension = dimensionFilter.value || 'all';
    const query = (taskSearch.value || '').trim().toLowerCase();
    const onlyDifferent = diffOnly.checked;
    let filtered = rows.filter(function (row) {
      if (dimension !== 'all' && row.dimension !== dimension) return false;
      if (onlyDifferent && Math.abs(row.delta) < 0.0001) return false;
      if (!query) return true;
      const haystack = [row.scenario_id, row.name, row.dimension, row.difficulty].join(' ').toLowerCase();
      return haystack.includes(query);
    });

    const sortKey = taskSort.value || 'delta_abs';
    filtered.sort(function (a, b) {
      if (sortKey === 'delta_a') return b.delta - a.delta;
      if (sortKey === 'delta_b') return a.delta - b.delta;
      if (sortKey === 'a_score') return (b.scoreA || 0) - (a.scoreA || 0);
      if (sortKey === 'b_score') return (b.scoreB || 0) - (a.scoreB || 0);
      if (sortKey === 'scenario') return String(a.scenario_id).localeCompare(String(b.scenario_id));
      return Math.abs(b.delta) - Math.abs(a.delta);
    });
    return filtered;
  }

  function scoreCell(score, strict) {
    if (score == null) return '<span class="modelpk-missing">NA</span>';
    return [
      '<div class="modelpk-task-score">',
      '  <div class="modelpk-score-track"><i style="width:' + scoreWidth(score, 'percent') + '%"></i></div>',
      '  <strong>' + formatMetric(score, 'percent') + '</strong>',
      '  <span>' + (strict ? 'strict' : 'soft') + '</span>',
      '</div>'
    ].join('');
  }

  function setTaskSectionVisible(isVisible) {
    [taskSectionHead, taskCard].forEach(function (element) {
      if (!element) return;
      element.hidden = !isVisible;
      element.style.display = isVisible ? '' : 'none';
    });
  }

  function renderTasks(modelA, modelB, rows) {
    const filtered = filteredTaskRows(rows);
    taskHeadA.textContent = modelA.model_name;
    taskHeadB.textContent = modelB.model_name;

    const wins = filtered.reduce(function (acc, row) {
      if (row.scoreA == null || row.scoreB == null || Math.abs(row.delta) < 0.0001) acc.tie += 1;
      else if (row.delta > 0) acc.a += 1;
      else acc.b += 1;
      return acc;
    }, { a: 0, b: 0, tie: 0 });

    taskSummary.innerHTML = [
      '<span>Showing <strong>' + filtered.length + '</strong> tasks</span>',
      '<span>A wins <strong>' + wins.a + '</strong></span>',
      '<span>B wins <strong>' + wins.b + '</strong></span>',
      '<span>Ties <strong>' + wins.tie + '</strong></span>'
    ].join('');

    taskRows.innerHTML = filtered.map(function (row) {
      const deltaClass = row.delta > 0 ? 'positive' : row.delta < 0 ? 'negative' : 'neutral';
      const winner = Math.abs(row.delta) < 0.0001 ? 'Tie' : (row.delta > 0 ? 'A' : 'B');
      return [
        '<tr>',
        '  <td><div class="bench-model-cell"><span>' + escapeHtml(row.scenario_id) + '</span><strong>' + escapeHtml(row.name) + '</strong></div></td>',
        '  <td>' + escapeHtml(row.dimension) + '</td>',
        '  <td>' + escapeHtml(row.difficulty) + '</td>',
        '  <td>' + scoreCell(row.scoreA, row.strictA) + '</td>',
        '  <td>' + scoreCell(row.scoreB, row.strictB) + '</td>',
        '  <td><span class="modelpk-task-delta ' + deltaClass + '">' + formatDelta(row.delta, 'percent') + '</span></td>',
        '  <td><span class="modelpk-winner-pill ' + deltaClass + '">' + winner + '</span></td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function renderTaskFilters() {
    if (!currentModelA || !currentModelB) return;
    renderTasks(currentModelA, currentModelB, currentRows);
  }

  function updateUrl(aId, bId) {
    const params = new URLSearchParams(window.location.search);
    if (currentDataset === 'closed') {
      params.set('dataset', 'closed');
    } else {
      params.delete('dataset');
    }
    params.set('a', aId);
    params.set('b', bId);
    window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
  }

  function clearResult() {
    summaryGrid.innerHTML = '';
    verdict.innerHTML = '';
    radar.innerHTML = '';
    if (dimensionLegend) dimensionLegend.innerHTML = '';
    dimensionGrid.innerHTML = '';
    taskRows.innerHTML = '';
    taskSummary.innerHTML = '';
  }

  function markPendingSelection() {
    if (!currentModelA || !currentModelB) return;
    if (selectA.value === currentModelA.id && selectB.value === currentModelB.id) {
      runButton.classList.remove('is-pending');
      warning.hidden = true;
      return;
    }
    runButton.classList.add('is-pending');
    warning.hidden = false;
    warning.textContent = 'Selection changed. Click PK to refresh the comparison.';
  }

  function render() {
    const modelA = modelById.get(selectA.value);
    const modelB = modelById.get(selectB.value);
    if (!modelA || !modelB) return;

    if (modelA.id === modelB.id) {
      warning.hidden = false;
      warning.textContent = 'Choose two different models to compare.';
      runButton.classList.remove('is-pending');
      currentModelA = null;
      currentModelB = null;
      currentRows = [];
      clearResult();
      return;
    }

    warning.hidden = true;
    runButton.classList.remove('is-pending');
    currentModelA = modelA;
    currentModelB = modelB;
    const rows = currentDataset === 'open' ? allScenarioRows(modelA, modelB) : [];
    currentRows = rows;
    setTaskSectionVisible(currentDataset === 'open');
    if (currentDataset === 'open') populateDimensionFilter(rows);
    renderSummary(modelA, modelB);
    renderVerdict(modelA, modelB, rows);
    renderRadar(modelA, modelB);
    renderDimensions(modelA, modelB);
    if (currentDataset === 'open') {
      renderTasks(modelA, modelB, rows);
    } else {
      taskRows.innerHTML = '';
      taskSummary.innerHTML = '';
    }
    updateUrl(modelA.id, modelB.id);
  }

  function setDefaultSelection(useUrlParams) {
    const params = new URLSearchParams(window.location.search);
    const shouldUseUrlParams = useUrlParams !== false;
    const aParam = shouldUseUrlParams ? params.get('a') : null;
    const bParam = shouldUseUrlParams ? params.get('b') : null;
    const first = rankedModels[0] && rankedModels[0].id;
    const second = rankedModels[1] && rankedModels[1].id;
    const aId = modelById.has(aParam) ? aParam : first;
    const bId = modelById.has(bParam) && bParam !== aId ? bParam : second;
    populateSelect(selectA, searchA, searchHintA, aId);
    populateSelect(selectB, searchB, searchHintB, bId);
  }

  function updateDatasetButtons() {
    if (!datasetFilter) return;
    Array.from(datasetFilter.querySelectorAll('button[data-modelpk-dataset]')).forEach(function (button) {
      button.classList.toggle('is-active', (button.dataset.modelpkDataset || 'open') === currentDataset);
    });
  }

  function setDataset(nextDataset, useUrlParams) {
    currentDataset = nextDataset === 'closed' ? 'closed' : 'open';
    refreshModelCollections();
    updateDatasetButtons();
    setTaskSectionVisible(currentDataset === 'open');
    if (searchA) searchA.value = '';
    if (searchB) searchB.value = '';
    dimensionFilter.value = 'all';
    taskSort.value = 'delta_abs';
    taskSearch.value = '';
    diffOnly.checked = false;
    setDefaultSelection(useUrlParams);
    render();
  }

  const initialParams = new URLSearchParams(window.location.search);
  setDataset(initialParams.get('dataset') === 'closed' ? 'closed' : 'open', true);

  runButton.addEventListener('click', render);
  selectA.addEventListener('change', markPendingSelection);
  selectB.addEventListener('change', markPendingSelection);
  searchA.addEventListener('input', function () {
    populateSelect(selectA, searchA, searchHintA, selectA.value);
    markPendingSelection();
  });
  searchB.addEventListener('input', function () {
    populateSelect(selectB, searchB, searchHintB, selectB.value);
    markPendingSelection();
  });
  dimensionFilter.addEventListener('change', renderTaskFilters);
  taskSort.addEventListener('change', renderTaskFilters);
  taskSearch.addEventListener('input', renderTaskFilters);
  diffOnly.addEventListener('change', renderTaskFilters);

  if (datasetFilter) {
    Array.from(datasetFilter.querySelectorAll('button[data-modelpk-dataset]')).forEach(function (button) {
      button.addEventListener('click', function () {
        setDataset(button.dataset.modelpkDataset || 'open', false);
      });
    });
  }

  swapButton.addEventListener('click', function () {
    const a = selectA.value;
    const b = selectB.value;
    if (searchA) searchA.value = '';
    if (searchB) searchB.value = '';
    populateSelect(selectA, searchA, searchHintA, b);
    populateSelect(selectB, searchB, searchHintB, a);
    markPendingSelection();
  });

  resetButton.addEventListener('click', function () {
    const first = rankedModels[0] && rankedModels[0].id;
    const second = rankedModels[1] && rankedModels[1].id;
    if (searchA) searchA.value = '';
    if (searchB) searchB.value = '';
    populateSelect(selectA, searchA, searchHintA, first);
    populateSelect(selectB, searchB, searchHintB, second);
    dimensionFilter.value = 'all';
    taskSort.value = 'delta_abs';
    taskSearch.value = '';
    diffOnly.checked = false;
    render();
  });
});
