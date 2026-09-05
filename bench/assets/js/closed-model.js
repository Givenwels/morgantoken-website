document.addEventListener('DOMContentLoaded', function () {
  const root = document.getElementById('closed-model-detail');
  const dataNode = document.getElementById('closed-model-data');
  if (!root || !dataNode) return;

  const baseUrl = root.dataset.baseurl || '';
  let models = [];
  try {
    models = JSON.parse(dataNode.textContent || '[]');
  } catch (error) {
    root.innerHTML = '<div class="bench-card modelpk-warning-card">Closed dataset model data failed to load.</div>';
    return;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function percent(value) {
    return (toNumber(value) * 100).toFixed(1);
  }

  function fixed(value, digits) {
    return toNumber(value).toFixed(digits);
  }

  function integer(value) {
    return Math.round(toNumber(value)).toLocaleString('en-US');
  }

  function logo(model) {
    if (model.logo) {
      return '<img class="bench-model-logo closed-detail-logo" src="' + baseUrl + '/assets/images/bench/' + escapeHtml(model.logo) + '" alt="' + escapeHtml(model.provider_key || model.model_name || 'model') + ' logo" />';
    }
    return '<div class="bench-model-logo bench-model-logo-placeholder-small closed-detail-logo">' + escapeHtml(String(model.model_name || '?').slice(0, 1).toUpperCase()) + '</div>';
  }

  function bar(label, value) {
    return '<div class="closed-detail-bar-row"><span>' + escapeHtml(label) + '</span><div class="bench-inline-bar"><span style="width: ' + percent(value) + '%"></span></div><strong>' + percent(value) + '</strong></div>';
  }

  function metric(label, value) {
    return '<div class="closed-detail-metric"><span>' + escapeHtml(label) + '</span><strong>' + value + '</strong></div>';
  }

  function stat(label, value, className) {
    return '<div class="closed-detail-stat ' + (className || '') + '"><span>' + escapeHtml(label) + '</span><strong>' + value + '</strong></div>';
  }

  function meta(label, value) {
    return '<div class="closed-detail-meta-item"><span>' + escapeHtml(label) + '</span><strong>' + value + '</strong></div>';
  }

  function findModel() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || params.get('source_id') || params.get('slug');
    return models.find(function (model) {
      return model.id === id || model.source_id === id || model.slug === id;
    }) || models[0];
  }

  function render(model) {
    if (!model) {
      root.innerHTML = '<div class="bench-card modelpk-warning-card">No closed dataset model profile is available.</div>';
      return;
    }

    document.title = model.model_name + ' Closed Dataset - ClawProBench';
    const openDetail = model.has_public_row && model.slug
      ? '<a class="bench-ghost-link closed-detail-action" href="' + baseUrl + '/bench/models/' + escapeHtml(model.slug) + '/">Open Dataset Detail</a>'
      : '';

    root.innerHTML = [
      '<div class="closed-detail-profile">',
      '<section class="bench-card closed-detail-hero">',
      '  <div class="closed-detail-title-block">',
      '    <p class="bench-kicker">Closed Dataset Model Profile</p>',
      '    <div class="closed-detail-title-row">' + logo(model) + '<div><h1>' + escapeHtml(model.model_name) + '</h1><p class="bench-intro">Platform: ' + escapeHtml(model.platform || '') + ' · Provider key: ' + escapeHtml(model.provider_key || '') + ' · Updated: ' + escapeHtml(String(model.updated_at || '').slice(0, 10)) + '</p></div></div>',
      '    <div class="closed-detail-pills"><span>Closed Rank #' + escapeHtml(model.rank || 'NA') + '</span><span>' + escapeHtml(model.total_scenarios || '68') + ' tasks</span><span>' + escapeHtml(model.benchmark_tag || 'closed dataset') + '</span></div>',
      '  </div>',
      '  <div class="closed-detail-stat-grid">',
      stat('Closed Final Score', fixed(model.final_score, 2), 'closed-detail-stat-primary'),
      stat('Pass@3', percent(model.pass_at_3) + '%'),
      stat('Pass^3', percent(model.pass3) + '%'),
      stat('Avg Runtime', fixed(model.avg_latency_seconds, 2) + 's'),
      stat('Cost', '$' + fixed(model.cost_usd, 4)),
      '  </div>',
      '</section>',
      '<section class="bench-card closed-detail-reliability">',
      '  <div class="closed-detail-metric-grid">',
      metric('Pass@1', percent(model.pass_at_1) + '%'),
      metric('Pass@3', percent(model.pass_at_3) + '%'),
      metric('Strict Pass', percent(model.strict_pass_rate) + '%'),
      metric('Planning', percent(model.planning_score)),
      metric('Safety', percent(model.safety_score)),
      metric('Tool Use', percent(model.tool_use_score)),
      metric('Constraints', percent(model.constraints_score)),
      metric('Error Recovery', percent(model.error_recovery_score)),
      metric('Synthesis', percent(model.synthesis_score)),
      '  </div>',
      '</section>',
      '<div class="closed-detail-main-grid">',
      '  <section class="bench-card closed-detail-panel">',
      '    <h2>Dimension overview</h2>',
      '    <div class="closed-detail-bar-list">',
      bar('Planning', model.planning_score),
      bar('Safety', model.safety_score),
      bar('Tool Use', model.tool_use_score),
      bar('Constraints', model.constraints_score),
      bar('Error Recovery', model.error_recovery_score),
      bar('Synthesis', model.synthesis_score),
      '    </div>',
      '  </section>',
      '  <section class="bench-card closed-detail-panel">',
      '    <h2>Closed Run Summary</h2>',
      '    <div class="closed-detail-meta-grid">',
      meta('Trials per task', escapeHtml(model.trials_per_scenario || '')),
      meta('Open Rank', model.open_rank ? '#' + escapeHtml(model.open_rank) : 'NA'),
      meta('Status', escapeHtml(model.status || 'unknown')),
      meta('OpenClaw', model.openclaw_version ? 'v' + escapeHtml(model.openclaw_version) : 'NA'),
      meta('Released', escapeHtml(String(model.released_at || '').slice(0, 10))),
      meta('Total Tokens', integer(model.total_tokens)),
      '    </div>',
      '  </section>',
      '  <section class="bench-card bench-card-full closed-detail-panel closed-detail-token-panel">',
      '    <h2>Token and Cost Summary</h2>',
      '    <div class="closed-detail-token-grid">',
      metric('Input Tokens', integer(model.input_tokens)),
      metric('Output Tokens', integer(model.output_tokens)),
      metric('Cache Read Tokens', integer(model.cache_read_tokens)),
      metric('Cache Write Tokens', integer(model.cache_write_tokens)),
      metric('Input Price', '$' + fixed(model.price_usd_input, 4)),
      metric('Output Price', '$' + fixed(model.price_usd_output, 4)),
      '    </div>',
      '  </section>',
      '</div>',
      '<div class="closed-detail-note">',
      '  <span>Closed dataset model profiles intentionally omit per-task scores and task-level rows.</span>',
      openDetail,
      '</div>',
      '</div>'
    ].join('');
  }

  render(findModel());
});
