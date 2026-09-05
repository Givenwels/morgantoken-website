window.LLMCore = (function () {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function benchMeta(board) {
    var labels = {}, cat = {};
    (board.categories || []).forEach(function (c) {
      (c.columns || []).forEach(function (col) { labels[col.key] = col.label; cat[col.key] = c.name; });
    });
    return { labels: labels, cat: cat };
  }

  function collections(board, labels) {
    function coll(cfg) { return { label: cfg.label, minBench: cfg.min_bench, keys: (cfg.keys || []).filter(function (k) { return labels[k]; }) }; }
    return {
      'Overall': coll(board.collections.overall),
      'Code': coll(board.collections.code),
      'General': coll(board.collections.general)
    };
  }

  function scoreMap(rows) {
    var m = {};
    (rows || []).forEach(function (r) {
      var mk = r.company + '|' + r.model;
      if (!m[mk]) m[mk] = {};
      if (r.scores) Object.keys(r.scores).forEach(function (bk) {
        var e = r.scores[bk]; if (e && e.length > 0) {
          var pref = e.filter(function (s) { return s.preferred; });
          var pool = pref.length ? pref : e;
          var maxV = NaN;
          pool.forEach(function (s) { var v = parseFloat(s.value); if (!isNaN(v) && (isNaN(maxV) || v > maxV)) maxV = v; });
          if (!isNaN(maxV)) { if (!m[mk].hasOwnProperty(bk) || maxV > m[mk][bk]) m[mk][bk] = maxV; }
        }
      });
    });
    return m;
  }

  function computeRanking(sm, keys, min) {
    var mks = Object.keys(sm), br = {}, brPercentile = {};
    var minModelsPerBench = 5;
    keys.forEach(function (bk) {
      var scored = [];
      mks.forEach(function (mk) { if (sm[mk].hasOwnProperty(bk)) scored.push({ k: mk, s: sm[mk][bk] }); });
      if (scored.length < minModelsPerBench) return;
      scored.sort(function (a, b) { return b.s - a.s; });
      var r = {}, p = {};
      scored.forEach(function (it, i) { r[it.k] = i + 1; p[it.k] = (i + 1) / scored.length; });
      br[bk] = r; brPercentile[bk] = p;
    });
    var validKeys = keys.filter(function (bk) { return brPercentile[bk]; });
    var qualifiedMks = mks.filter(function (mk) {
      var cnt = 0;
      validKeys.forEach(function (bk) { if (brPercentile[bk].hasOwnProperty(mk)) cnt++; });
      return cnt >= min;
    });
    var elo = {}, wins = {}, draws = {}, losses = {}, matchPoints = {}, totalOpponents = {};
    qualifiedMks.forEach(function (mk) { elo[mk] = 1000; wins[mk] = 0; draws[mk] = 0; losses[mk] = 0; matchPoints[mk] = 0; totalOpponents[mk] = 0; });
    var K = 32;
    for (var i = 0; i < qualifiedMks.length; i++) {
      for (var j = i + 1; j < qualifiedMks.length; j++) {
        var mkA = qualifiedMks[i], mkB = qualifiedMks[j];
        var sharedBench = validKeys.filter(function (bk) { return sm[mkA].hasOwnProperty(bk) && sm[mkB].hasOwnProperty(bk); });
        if (sharedBench.length === 0) continue;
        totalOpponents[mkA]++; totalOpponents[mkB]++;
        var winsA = 0, winsB = 0;
        sharedBench.forEach(function (bk) {
          if (sm[mkA][bk] > sm[mkB][bk]) winsA++;
          else if (sm[mkB][bk] > sm[mkA][bk]) winsB++;
        });
        var scoreA, scoreB;
        if (winsA > winsB) { wins[mkA]++; losses[mkB]++; matchPoints[mkA] += 1; scoreA = 1; scoreB = 0; }
        else if (winsB > winsA) { wins[mkB]++; losses[mkA]++; matchPoints[mkB] += 1; scoreA = 0; scoreB = 1; }
        else { draws[mkA]++; draws[mkB]++; matchPoints[mkA] += 0.5; matchPoints[mkB] += 0.5; scoreA = 0.5; scoreB = 0.5; }
        var expA = 1 / (1 + Math.pow(10, (elo[mkB] - elo[mkA]) / 400));
        var expB = 1 / (1 + Math.pow(10, (elo[mkA] - elo[mkB]) / 400));
        elo[mkA] += K * (scoreA - expA);
        elo[mkB] += K * (scoreB - expB);
      }
    }
    var results = [];
    qualifiedMks.forEach(function (mk) {
      var percentiles = [];
      validKeys.forEach(function (bk) { if (brPercentile[bk].hasOwnProperty(mk)) percentiles.push(brPercentile[bk][mk]); });
      var avg = percentiles.reduce(function (s, v) { return s + v; }, 0) / percentiles.length;
      var p = mk.split('|');
      var opp = totalOpponents[mk] || 0;
      results.push({ company: p[0], model: p[1], mk: mk, avg: avg, cnt: percentiles.length, wins: wins[mk], draws: draws[mk], losses: losses[mk], scoreRate: opp > 0 ? matchPoints[mk] / opp : 0, elo: elo[mk] });
    });
    results.sort(function (a, b) { return b.scoreRate - a.scoreRate || b.elo - a.elo; });
    return { results: results, br: br, validKeys: validKeys };
  }

  function rankColor(rank, total) {
    if (total <= 1) return 'hsl(145,48%,42%)';
    var ratio = (rank - 1) / (total - 1);
    var hue = 145 - ratio * 137;
    var sat = 52 - ratio * 8;
    var light = 41 + ratio * 19;
    return 'hsl(' + hue.toFixed(0) + ',' + sat.toFixed(0) + '%,' + light.toFixed(0) + '%)';
  }
  function rankTextColor(rank, total) {
    if (total <= 1) return '#fff';
    return ((rank - 1) / (total - 1)) < 0.28 ? '#fff' : '#3c3428';
  }

  return {
    escapeHtml: escapeHtml,
    benchMeta: benchMeta,
    collections: collections,
    scoreMap: scoreMap,
    computeRanking: computeRanking,
    rankColor: rankColor,
    rankTextColor: rankTextColor
  };
})();
