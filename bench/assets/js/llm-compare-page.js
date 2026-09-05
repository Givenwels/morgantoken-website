(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var dataEl = document.getElementById('cp-data');
    var root = document.getElementById('cp-root');
    if (!dataEl || !root || !window.LLMCore) return;
    var C = window.LLMCore;
    var board;
    try { board = JSON.parse(dataEl.textContent); } catch (err) { return; }

    var meta = C.benchMeta(board);
    var benchLabels = meta.labels;
    var collections = C.collections(board, benchLabels);
    var sm = C.scoreMap(board.rows);
    var overallRank = C.computeRanking(sm, collections.Overall.keys, collections.Overall.minBench);
    var validKeys = overallRank.validKeys;
    var rankOf = {};
    overallRank.results.forEach(function (r, i) { rankOf[r.mk] = { rank: i + 1, r: r }; });

    var options = Object.keys(sm).sort(function (a, b) {
      var ra = rankOf[a] ? rankOf[a].rank : 1e9, rb = rankOf[b] ? rankOf[b].rank : 1e9;
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
    function labelOf(mk) {
      var p = mk.split('|');
      return p[1] + '（' + p[0] + '）' + (rankOf[mk] ? ' · #' + rankOf[mk].rank : '');
    }
    function companyKey(name) {
      for (var i = 0; i < options.length; i++) { if (options[i].split('|')[1] === name) return options[i]; }
      return null;
    }

    var params = new URLSearchParams(window.location.search);
    var selA = params.get('a') ? companyKey(params.get('a')) : null;
    var selB = params.get('b') ? companyKey(params.get('b')) : null;
    if (!selA) selA = overallRank.results[0] ? overallRank.results[0].mk : options[0];
    if (!selB) selB = overallRank.results[1] ? overallRank.results[1].mk : options[1];
    if (selA === selB && options.length > 1) selB = options[selA === options[0] ? 1 : 0];

    root.innerHTML =
      '<div class="cp-card"><div class="cp-pick">' +
      '<div class="cp-field"><label>模型 A</label><input class="cp-search" id="cp-search-a" type="text" autocomplete="off" placeholder="输入模型名搜索…"><div class="cp-select-wrap"><select id="cp-a"></select></div></div>' +
      '<button class="cp-swap" id="cp-swap" type="button" title="互换 A/B">⇄</button>' +
      '<div class="cp-field"><label>模型 B</label><input class="cp-search" id="cp-search-b" type="text" autocomplete="off" placeholder="输入模型名搜索…"><div class="cp-select-wrap"><select id="cp-b"></select></div></div>' +
      '</div>' +
      '<div class="cp-toolbar"><label class="cp-switch"><input type="checkbox" id="cp-all"><span class="cp-slider"></span>下方 bench 明细包含全部共有 bench（不限于综合排名 Overall）</label></div>' +
      '<div id="cp-body"></div></div>';

    var elA = document.getElementById('cp-a'), elB = document.getElementById('cp-b');
    var searchA = document.getElementById('cp-search-a'), searchB = document.getElementById('cp-search-b');

    function fillSelect(sel, q, keep) {
      var ql = (q || '').toLowerCase();
      var prev = sel.value || keep;
      sel.innerHTML = '';
      var kept = false;
      options.forEach(function (mk) {
        var match = !ql || mk.toLowerCase().indexOf(ql) !== -1;
        if (!match && mk !== prev) return;
        if (mk === prev) kept = true;
        var o = document.createElement('option');
        o.value = mk;
        o.textContent = labelOf(mk);
        sel.appendChild(o);
      });
      if (!kept && prev) {
        var o = document.createElement('option');
        o.value = prev;
        o.textContent = labelOf(prev);
        sel.insertBefore(o, sel.firstChild);
      }
      sel.value = prev;
    }
    fillSelect(elA, '', selA);
    fillSelect(elB, '', selB);

    function wireSearch(input, sel) {
      input.addEventListener('input', function () { fillSelect(sel, input.value, sel.value); });
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && sel.options.length) {
          sel.value = sel.options[0].value;
          sel.dispatchEvent(new Event('change'));
          input.value = '';
        }
      });
    }
    wireSearch(searchA, elA);
    wireSearch(searchB, elB);

    elA.addEventListener('change', function () { selA = elA.value; render(); });
    elB.addEventListener('change', function () { selB = elB.value; render(); });
    document.getElementById('cp-swap').addEventListener('click', function () {
      var t = selA; selA = selB; selB = t;
      elA.value = selA; elB.value = selB;
      render();
    });
    document.getElementById('cp-all').addEventListener('change', render);

    function fmt(v) { return Math.round(v * 100) / 100; }

    function pairDetail(A, B) {
      var shared = [];
      validKeys.forEach(function (bk) {
        if (sm[A].hasOwnProperty(bk) && sm[B].hasOwnProperty(bk)) shared.push(bk);
      });
      var w = 0, l = 0, d = 0;
      shared.forEach(function (bk) {
        if (sm[A][bk] > sm[B][bk]) w++;
        else if (sm[B][bk] > sm[A][bk]) l++;
        else d++;
      });
      return { w: w, l: l, d: d, n: shared.length };
    }

    function recordOf(mk) {
      var win = [], loss = [], draw = [];
      overallRank.results.forEach(function (r) {
        if (r.mk === mk) return;
        var p = pairDetail(mk, r.mk);
        if (!p.n) return;
        var item = { mk: r.mk, w: p.w, l: p.l, d: p.d };
        if (p.w > p.l) win.push(item);
        else if (p.l > p.w) loss.push(item);
        else draw.push(item);
      });
      return { win: win, loss: loss, draw: draw };
    }

    function render() {
      var A = elA.value, B = elB.value;
      var all = document.getElementById('cp-all').checked;
      var keys = all ? Object.keys(benchLabels) : validKeys;
      var shared = [];
      keys.forEach(function (bk) {
        if (sm[A].hasOwnProperty(bk) && sm[B].hasOwnProperty(bk)) shared.push(bk);
      });
      var winA = [], winB = [], draw = [];
      shared.forEach(function (bk) {
        var a = sm[A][bk], b = sm[B][bk];
        var item = { bk: bk, a: a, b: b, m: (a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9) };
        if (a > b) winA.push(item); else if (b > a) winB.push(item); else draw.push(item);
      });
      winA.sort(function (x, y) { return y.m - x.m; });
      winB.sort(function (x, y) { return x.m - y.m; });

      var pa = A.split('|'), pb = B.split('|');
      var ra = rankOf[A], rb = rankOf[B];
      var total = shared.length || 1;

      function sideCard(cls, p, r, lead) {
        return '<div class="cp-side-card ' + cls + '"><div class="cp-side-top"><span class="cp-name"><a href="../model/?m=' + encodeURIComponent(p[1]) + '">' + C.escapeHtml(p[1]) + '</a></span>' +
          (r ? '<span class="cp-rank-pill">综合 #' + r.rank + '</span>' : '') + '</div>' +
          '<div class="cp-meta">' + C.escapeHtml(p[0]) + (r ? ' · 得分率 ' + (r.r.scoreRate * 100).toFixed(1) + '% · ' + r.r.wins + '胜/' + r.r.draws + '平/' + r.r.losses + '负' : ' · 未入围综合排名') + '</div>' +
          '<div class="cp-sum-num">' + lead + '<small>bench 领先</small></div></div>';
      }

      var html = '<div class="cp-sum">';
      html += sideCard('cp-a', pa, ra, winA.length);
      html += '<div class="cp-mid"><div class="cp-vs">VS</div><div class="cp-draw">' + draw.length + ' 打平</div><div class="cp-shared">共有 ' + shared.length + ' 个 bench</div></div>';
      html += sideCard('cp-b', pb, rb, winB.length);
      html += '</div>';
      html += '<div class="cp-bar"><div class="cp-seg-a" style="width:' + (winA.length / total * 100) + '%"></div><div class="cp-seg-d" style="width:' + (draw.length / total * 100) + '%"></div><div class="cp-seg-b" style="width:' + (winB.length / total * 100) + '%"></div></div>';
      html += '<div class="cp-note">口径与综合排名对局一致：Overall 有效 bench、每 bench 取 preferred/最高分。</div>';

      function oppGroups(rec, side) {
        function list(items, cls, title) {
          if (!items.length) return '';
          var h = '<h4 class="cp-opp-title ' + cls + '">' + title + ' <small>' + items.length + '</small></h4>';
          h += items.map(function (it) {
            var score = side === 'A' ? it.w + ':' + it.l : it.l + ':' + it.w;
            return '<button type="button" class="cp-opp" data-mk="' + C.escapeHtml(it.mk) + '"><span>' + C.escapeHtml(it.mk.split('|')[1]) + (rankOf[it.mk] ? ' <small>#' + rankOf[it.mk].rank + '</small>' : '') + '</span><span class="cp-opp-score">' + score + '</span></button>';
          }).join('');
          return h;
        }
        return list(rec.win, 'cp-sec-a', '赢') + list(rec.draw, 'cp-sec-d', '平') + list(rec.loss, 'cp-sec-b', '输');
      }

      var recA = ra ? recordOf(A) : null;
      var recB = rb ? recordOf(B) : null;
      html += '<div class="cp-opp-grid">';
      html += '<div><div class="cp-opp-head">' + C.escapeHtml(pa[1]) + ' 的胜率构成' + (ra ? ' <small>' + ra.r.wins + '胜/' + ra.r.draws + '平/' + ra.r.losses + '负 · 对手 ' + (ra.r.wins + ra.r.draws + ra.r.losses) + '</small>' : '') + '</div>';
      html += recA ? oppGroups(recA, 'A') : '<div class="cp-note">未入围综合排名，无对局记录。</div>';
      html += '</div>';
      html += '<div><div class="cp-opp-head">' + C.escapeHtml(pb[1]) + ' 的胜率构成' + (rb ? ' <small>' + rb.r.wins + '胜/' + rb.r.draws + '平/' + rb.r.losses + '负 · 对手 ' + (rb.r.wins + rb.r.draws + rb.r.losses) + '</small>' : '') + '</div>';
      html += recB ? oppGroups(recB, 'B') : '<div class="cp-note">未入围综合排名，无对局记录。</div>';
      html += '</div></div>';
      html += '<div class="cp-note" style="margin:6px 0 2px;">点击对手可将其设为另一侧的对比对象。</div>';

      function rows(items) {
        if (!items.length) return '<div class="cp-note">无</div>';
        return items.map(function (it) {
          var w = Math.min(50, Math.abs(it.m) * 50).toFixed(1);
          var fill = it.a === it.b ? '' : (it.a > it.b ? '<div class="cp-fill cp-fill-a" style="width:' + w + '%"></div>' : '<div class="cp-fill cp-fill-b" style="width:' + w + '%"></div>');
          return '<div class="cp-row"><div class="cp-bench">' + C.escapeHtml(benchLabels[it.bk]) + '</div>' +
            '<div class="cp-val cp-val-a ' + (it.a > it.b ? 'cp-hi-a' : '') + '">' + fmt(it.a) + '</div>' +
            '<div class="cp-track">' + fill + '</div>' +
            '<div class="cp-val cp-val-b ' + (it.b > it.a ? 'cp-hi-b' : '') + '">' + fmt(it.b) + '</div></div>';
        }).join('');
      }

      html += '<div class="cp-sec cp-sec-a">' + C.escapeHtml(pa[1]) + ' 领先的 bench<small>' + winA.length + '</small></div>' + rows(winA);
      html += '<div class="cp-sec cp-sec-d">打平<small>' + draw.length + '</small></div>' + rows(draw);
      html += '<div class="cp-sec cp-sec-b">' + C.escapeHtml(pb[1]) + ' 领先的 bench<small>' + winB.length + '</small></div>' + rows(winB);

      var body = document.getElementById('cp-body');
      body.innerHTML = html;
      var panels = body.querySelectorAll('.cp-opp-grid > div');
      body.querySelectorAll('.cp-opp').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mk = btn.dataset.mk;
          var inLeft = panels[0] && panels[0].contains(btn);
          if (inLeft) { selB = mk; elB.value = mk; fillSelect(elB, searchB.value, mk); }
          else { selA = mk; elA.value = mk; fillSelect(elA, searchA.value, mk); }
          render();
        });
      });
      try {
        var q = new URLSearchParams();
        q.set('a', pa[1]); q.set('b', pb[1]);
        history.replaceState(null, '', window.location.pathname + '?' + q.toString());
      } catch (e) {}
    }

    render();
  });
})();
