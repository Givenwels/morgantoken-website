(function () {
  'use strict';

  var BOARD = window.REVIEW_BOARD || { qa: { pairs: [], judge_models: [], demo: false } };
  var QA = BOARD.qa || {};
  var PAIRS = QA.pairs || [];
  var JUDGE_MODELS = (QA.judge_models && QA.judge_models.length) ? QA.judge_models : ['判分模型'];
  var API_BASE = 'http://127.0.0.1:8898';
  var STORAGE_PREFIX = 'autoEvalGsb|';
  var JUDGE_PREFIX = 'autoEvalJudge|';
  var SUBMITS_KEY = 'autoEvalSubmits';
  var submitRound = null;
  var historyRoot = document.getElementById('rv-history');

  // 模型清单：优先数据文件 models，再合并题型里出现过的模型名
  var MODELS = (QA.models && QA.models.length) ? QA.models.slice() : [];
  PAIRS.forEach(function (p) {
    if (p.left_model && MODELS.indexOf(p.left_model) < 0) MODELS.push(p.left_model);
    if (p.right_model && MODELS.indexOf(p.right_model) < 0) MODELS.push(p.right_model);
  });
  MODELS.sort();

  var DIM_LABELS = {
    constraints: '约束遵循', tool_use: '工具使用', safety: '安全护栏', planning: '规划能力',
    error_recovery: '错误恢复', efficiency: '执行效率', synthesis: '综合分析'
  };
  function dimLabel(value) { return DIM_LABELS[value] || value || ''; }

  // —— 评测模式（测试/正式）：本机保存，切换实时生效，结论页与报告同步 ——
  var MODE_KEY = 'autoEvalMode';
  function currentMode() {
    try {
      var m = window.localStorage.getItem(MODE_KEY);
      if (m === 'formal' || m === 'test') return m;
    } catch (e) { /* no storage */ }
    return QA.mode === 'formal' ? 'formal' : 'test';
  }
  function setMode(mode, refresh) {
    if (mode !== 'test' && mode !== 'formal') return;
    try { window.localStorage.setItem(MODE_KEY, mode); } catch (e) { /* no storage */ }
    if (refresh) refresh();
  }
  function initModeUI() {
    var row = document.getElementById('rv-mode-row');
    var banner = document.getElementById('rv-mode-banner');
    if (row && banner) {
      row.addEventListener('click', function (event) {
        var btn = event.target.closest && event.target.closest('.rv-mode-option');
        if (!btn) return;
        setMode(btn.dataset.mode, true);
        renderModeUI();
      });
    }
  }
  function renderModeUI() {
    var row = document.getElementById('rv-mode-row');
    var banner = document.getElementById('rv-mode-banner');
    if (!row || !banner) return;
    var mode = currentMode();
    Array.prototype.forEach.call(row.querySelectorAll('.rv-mode-option'), function (btn) {
      btn.classList.toggle('is-active', btn.dataset.mode === mode);
    });
    if (mode === 'formal') {
      banner.className = 'rv-mode-banner rv-mode-banner-formal';
      banner.textContent = '✅ 正式模式：当前结论、报告与记录均为正式评测结果。';
    } else {
      banner.className = 'rv-mode-banner';
      banner.textContent = '🧪 测试模式：当前为测试数据，仅供流程验证。';
    }
  }

  // —— 上传状态 ——
  var uploaded = { left: null, right: null };

  var leftSelect = document.getElementById('rv-left-model');
  var rightSelect = document.getElementById('rv-right-model');
  var judgeSelect = document.getElementById('rv-judge-model');
  var cardsRoot = document.getElementById('rv-cards');
  var statsRoot = document.getElementById('rv-stats');
  var emptyRoot = document.getElementById('rv-empty');
  var demoNote = document.getElementById('rv-demo-note');
  var resetButton = document.getElementById('rv-reset');
  var exportButton = document.getElementById('rv-export');
  var submitButton = document.getElementById('rv-submit');
  var uploadLeftInput = document.getElementById('rv-upload-left');
  var uploadRightInput = document.getElementById('rv-upload-right');
  var uploadClearButton = document.getElementById('rv-upload-clear');
  var uploadLeftName = document.getElementById('rv-upload-left-name');
  var uploadRightName = document.getElementById('rv-upload-right-name');
  var uploadState = document.getElementById('rv-upload-state');

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function storageKey(taskId, left, right) { return STORAGE_PREFIX + taskId + '|' + left + '|' + right; }
  function judgeKey(taskId, left, right) { return JUDGE_PREFIX + taskId + '|' + left + '|' + right; }

  function readStore(key) { try { return window.sessionStorage.getItem(key); } catch (e) { return null; } }
  function writeStore(key, value) { try { window.sessionStorage.setItem(key, value); } catch (e) { /* no storage */ } }

  function readGsb(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function writeGsb(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* no storage */ } }

  // —— 提交记录（本地 + 平台） ——
  function localSubmits() {
    try { return JSON.parse(window.localStorage.getItem(SUBMITS_KEY) || '[]'); } catch (e) { return []; }
  }
  function addLocalSubmit(entry) {
    var arr = localSubmits();
    arr.push(entry);
    try { window.localStorage.setItem(SUBMITS_KEY, JSON.stringify(arr)); } catch (e) { /* no storage */ }
  }
  function downloadJson(obj, name) {
    var blob = new window.Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
  }
  function downloadText(text, name) {
    var blob = new window.Blob([text], { type: 'text/markdown;charset=utf-8' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function reportFilename(round) {
    var d = new Date();
    return 'AutoEval-评测报告-第' + round + '次-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '.md';
  }
  function buildReportText(sel, cards) {
    var now = new Date();
    var scored = cards.filter(function (c) { return readGsb(storageKey(c.taskId, sel.left, sel.right)); });
    var wins = {}, ties = {}, losses = {}, counts = {};
    cards.forEach(function (c) {
      [c.leftModel, c.rightModel].forEach(function (m) {
        if (!(m in wins)) { wins[m] = 0; ties[m] = 0; losses[m] = 0; counts[m] = 0; }
      });
    });
    scored.forEach(function (c) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      var winner = gsb === 'left' ? c.leftModel : (gsb === 'right' ? c.rightModel : null);
      if (winner) {
        wins[winner] += 1;
        [c.leftModel, c.rightModel].forEach(function (m) { if (m !== winner) losses[m] += 1; });
      } else if (gsb === 'tie') {
        ties[c.leftModel] += 1; ties[c.rightModel] += 1;
      }
      counts[c.leftModel] += 1; counts[c.rightModel] += 1;
    });
    var rankList = Object.keys(wins).map(function (m) {
      var n = counts[m] || 0;
      return { model: m, wins: wins[m], ties: ties[m], losses: losses[m], n: n, rate: n ? (wins[m] + 0.5 * ties[m]) / n : 0 };
    }).sort(function (a, b) { return b.rate - a.rate || b.wins - a.wins; });
    var agree = scored.filter(function (c) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      return gsb && c.judgeVerdict && gsb === c.judgeVerdict;
    }).length;
    var dims = {};
    scored.forEach(function (c) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      var d = dimLabel(c.dimension) || '综合';
      if (!dims[d]) dims[d] = { winsA: 0, winsB: 0, ties: 0 };
      if (gsb === 'left') dims[d].winsA += 1;
      else if (gsb === 'right') dims[d].winsB += 1;
      else dims[d].ties += 1;
    });

    var best = rankList[0];
    var second = rankList[1];
    var decided = best && second && (best.rate - second.rate) > 0.01;

    var dimCount = {};
    cards.forEach(function (c) {
      var d = dimLabel(c.dimension) || '未标注';
      dimCount[d] = (dimCount[d] || 0) + 1;
    });

    var lines = [];
    lines.push('# AutoEval 人工复核 GSB 评测报告');
    lines.push('');
    lines.push('- 提交轮次：第 ' + (submitRound || '-') + ' 次');
    lines.push('- 提交时间：' + now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + ' ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes()));
    lines.push('- 判分模型：' + sel.judge);
    lines.push('- 数据来源：' + (uploaded.left || uploaded.right ? '上传文档（左：' + (uploaded.left ? uploaded.left.name : '-') + '；右：' + (uploaded.right ? uploaded.right.name : '-') + '）' : '平台演示数据'));
    lines.push('- 评测性质：' + (currentMode() === 'formal' ? '正式评测' : '测试（非正式，仅供流程验证）') + '。');
    lines.push('');
    lines.push('## 1. 背景');
    lines.push('');
    lines.push('AutoEval 是自己搭的自动化评测平台。人工复核（GSB）环节中，判分模型（' + sel.judge + '）先对左、右模型的同题回答给出自动化判定，再由人工逐题复核并打 GSB（A 更好 / 平局 / B 更好）。本报告将两者对照，用于校准判分模型、输出在我自己的业务场景下模型的实力对比：谁在哪些题目类型上更强、人机判断的差异有多大。');
    lines.push('');
    lines.push('## 2. 概述方案');
    lines.push('');
    lines.push('- 评测方式：同一批题目下左、右模型同题双答对比；判分模型先行判定，人工 GSB 终判。');
    lines.push('- 题目数量：共 ' + cards.length + ' 题，已复核评分 ' + scored.length + ' 题。');
    if (Object.keys(dimCount).length) {
      lines.push('- 题目类型分布：' + Object.keys(dimCount).map(function (d) { return d + ' ' + dimCount[d] + ' 题'; }).join('；') + '。');
    }
    lines.push('- 评测对象：左 = ' + sel.left + '，右 = ' + sel.right + '。');
    lines.push('- 流程：选模型 / 上传回答文档 → 判分模型判定 → 人工 GSB → 自动统计（胜率、人机一致率、分场景总结）→ 提交平台并输出本报告。');
    lines.push('');
    lines.push('## 3. 评测对象说明');
    lines.push('');
    lines.push('| 模型 | 角色 | 胜 | 平 | 负 | 胜率 |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    rankList.forEach(function (r) {
      var role = r.model === sel.left ? '左模型' : '右模型';
      lines.push('| ' + r.model + ' | ' + role + ' | ' + r.wins + ' | ' + r.ties + ' | ' + r.losses + ' | ' + (r.rate * 100).toFixed(1) + '% |');
    });
    lines.push('');
    lines.push('题目明细：');
    lines.push('');
    lines.push('| 序号 | 题目 | 题目类型 | 人工 GSB | 判分判定 | 一致 |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    cards.forEach(function (c, i) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      var gsbText = gsb === 'left' ? 'A 更好' : (gsb === 'right' ? 'B 更好' : (gsb === 'tie' ? '平局' : '未评分'));
      var judgeText = c.judgeVerdict ? verdictLabel(c.judgeVerdict) : '未判分';
      var same = gsb && c.judgeVerdict ? (gsb === c.judgeVerdict ? '✓' : '✗') : '';
      var name = String(c.taskName || '').slice(0, 40);
      lines.push('| ' + (i + 1) + ' | ' + name.replace(/\|/g, ' ') + ' | ' + (dimLabel(c.dimension) || '未标注') + ' | ' + gsbText + ' | ' + judgeText + ' | ' + same + ' |');
    });
    lines.push('');
    lines.push('## 4. 评测结论');
    lines.push('');
    if (scored.length && best) {
      lines.push('- 综合结论：' + (decided
        ? best.model + ' 整体更优，胜率 ' + (best.rate * 100).toFixed(1) + '%（胜 ' + best.wins + ' · 平 ' + best.ties + ' · 负 ' + best.losses + '）。'
        : '双方势均力敌，胜率持平。'));
      var dimText = Object.keys(dims).map(function (d) {
        var r = dims[d];
        var t = '「' + d + '」 ' + r.winsA + ':' + r.winsB;
        if (r.ties) t += '（平 ' + r.ties + '）';
        return t;
      });
      if (dimText.length) lines.push('- 分场景表现：' + dimText.join('；') + '。');
      lines.push('- 人机一致率：' + (agree / scored.length * 100).toFixed(1) + '%（' + agree + '/' + scored.length + ' 题与判分模型结论一致）。');
      if (scored.length >= 2 && agree / scored.length < 0.6) {
        lines.push('- 复核建议：人机一致率偏低，人工与判分模型的分歧题建议重点复核（优先看判分理由与你的 GSB 冲突的题目）。');
      }
      if (decided) {
        lines.push('- 最强项：' + best.model + ' 在「' + (Object.keys(dims).sort(function (a, b) { return (dims[b].winsA - dims[b].winsB) - (dims[a].winsA - dims[a].winsB); })[0] || '综合') + '」类题目上表现最强。');
      }
    } else {
      lines.push('暂无已评分的 GSB 数据，先逐题打分后再提交。');
    }
    lines.push('');
    return lines.join('\n');
  }
  function renderHistory(platformCount) {
    if (!historyRoot) return;
    var local = localSubmits();
    var rows = local.slice().reverse();
    var html = '<div class="rv-history-head"><strong>已提交记录</strong>';
    html += '<span>本地 ' + local.length + ' 次' + (platformCount != null ? ' · 平台已存 ' + platformCount + ' 次' : '') + '</span>';
    html += '<button type="button" class="bench-ghost-button rv-history-refresh" id="rv-history-refresh">刷新平台记录</button></div>';
    if (rows.length) {
      html += '<ul class="rv-history-list">';
      rows.forEach(function (e) {
        var t = String(e.saved_at || '').replace('T', ' ').slice(0, 19);
        html += '<li><span class="rv-history-round">第 ' + (e.round || '-') + ' 次</span>';
        html += '<span class="rv-history-meta">' + esc(e.left_model) + ' vs ' + esc(e.right_model) + ' · ' + (e.scored_count || 0) + ' 题' + (e.uploaded ? ' · 上传文档' : '') + '</span>';
        html += '<span class="rv-history-time">' + esc(t) + '</span>';
        html += '<button type="button" class="bench-ghost-button rv-history-download" data-idx="' + (local.length - 1 - rows.indexOf(e)) + '">下载</button></li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="rv-history-empty">暂无提交记录。打几分题后点"提交结果到平台"，会同时记录到本地和平台。</p>';
    }
    historyRoot.hidden = false;
    historyRoot.innerHTML = html;
    var refreshBtn = document.getElementById('rv-history-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        window.fetch(API_BASE + '/api/review/results').then(function (r) { return r.json(); })
          .then(function (data) { renderHistory(data.entries); })
          .catch(function () { renderHistory(null); });
      });
    }
    var downloadBtns = historyRoot.querySelectorAll('.rv-history-download');
    Array.prototype.forEach.call(downloadBtns, function (btn) {
      btn.addEventListener('click', function () {
        var local = localSubmits();
        var entry = local[Number(btn.dataset.idx)];
        if (entry) downloadJson(entry, 'auto-eval-round-' + (entry.round || 'x') + '.json');
      });
    });
  }
  function clearAllGsb() {
    try {
      var keys = [];
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf(STORAGE_PREFIX) === 0) keys.push(k);
      }
      keys.forEach(function (k) { window.localStorage.removeItem(k); });
    } catch (e) { /* no storage */ }
  }

  // —— 文档解析 ——
  // 规则：优先按 Markdown 的 "## 题目"（含"第N题"）切块，H3 及以下都属于该题的回答；
  // JSON 支持 [{"question":"…","answer":"…"}]；都失败则整篇当一题。
  function parseDocument(text, filename) {
    var content = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!content) return [];
    // JSON: [{question,answer}] 或 [{q,a}] 或 {pairs:[...]}
    try {
      var parsed = JSON.parse(content);
      var rawList = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.pairs) ? parsed.pairs : [parsed]);
      var out = [];
      rawList.forEach(function (item) {
        if (!item || typeof item !== 'object') return;
        var q = item.question != null ? item.question : (item.q != null ? item.q : (item.prompt || ''));
        var a = item.answer != null ? item.answer : (item.a != null ? item.a : (item.response != null ? item.response : ''));
        if (q || a) out.push({ question: String(q || ''), answer: String(a || ''), type: item.type ? String(item.type) : (item.dimension ? String(item.dimension) : '') });
      });
      if (out.length) return out;
    } catch (e) { /* 不是 JSON，走 Markdown 解析 */ }

    // Markdown：按 "## 题目"（H2）切分
    var headingRe = /^##\s+(.+)$/gm;
    var heads = [];
    var m;
    while ((m = headingRe.exec(content)) !== null) {
      heads.push({ q: m[1].trim(), after: m.index + m[0].length, start: m.index });
    }
    if (heads.length) {
      var pairs = [];
      for (var i = 0; i < heads.length; i++) {
        var end = (i + 1 < heads.length) ? heads[i + 1].start : content.length;
        var body = content.slice(heads[i].after, end).trim();
        // 跳过文档尾部"汇总/说明/附录/备注"这类小节（不像是题目）
        if (/题/.test(heads[i].q) || !/(汇总|说明|附录|备注)/.test(heads[i].q)) {
          if (body) pairs.push({ question: heads[i].q, answer: body });
        }
      }
      if (pairs.length) return pairs;
    }

    // 兜底：Q：/问题：/任意标题分段
    var blocks = [];
    var re = /(?:^|\n)\s*(?:#{1,4}\s+|Q[：:]\s*|问题[：:]\s*|Q\d+[．.、\)]\s*)([^\n]+)/g;
    var lm;
    var matches = [];
    while ((lm = re.exec(content + '\n')) !== null) matches.push(lm);
    if (!matches.length) matches.push({ index: 0, 0: '', 1: filename || '整篇文档', lastIndex: 0 });
    for (var j = 0; j < matches.length; j++) {
      var qtext = (matches[j][1] || '').trim();
      var bstart = matches[j].index + matches[j][0].length;
      var bend = (j + 1 < matches.length) ? matches[j + 1].index : content.length;
      blocks.push({ question: qtext || filename || ('第 ' + (j + 1) + ' 题'), answer: content.slice(bstart, bend).trim() });
    }
    return blocks;
  }

  function handleUpload(side) {
    var input = side === 'left' ? uploadLeftInput : uploadRightInput;
    var nameNode = side === 'left' ? uploadLeftName : uploadRightName;
    var file = input && input.files && input.files[0];
    if (!file) return;
    var reader = new window.FileReader();
    reader.onload = function () {
      var pairs = parseDocument(reader.result, file.name);
      uploaded[side] = { name: file.name, pairs: pairs };
      if (nameNode) nameNode.textContent = file.name + '（' + pairs.length + ' 题）';
      refresh();
    };
    reader.onerror = function () {
      if (nameNode) nameNode.textContent = '读取失败';
    };
    reader.readAsText(file, 'utf-8');
  }

  function currentSelection() {
    return {
      left: leftSelect ? leftSelect.value : '',
      right: rightSelect ? rightSelect.value : '',
      judge: judgeSelect ? judgeSelect.value : JUDGE_MODELS[0]
    };
  }

  function selectedJudge() {
    return judgeSelect ? judgeSelect.value : (JUDGE_MODELS[0] || '判分模型');
  }

  // —— 卡片构建：上传模式优先 ——
  function buildCards(sel) {
    if (uploaded.left && uploaded.right) {
      var cards = [];
      var n = Math.max(uploaded.left.pairs.length, uploaded.right.pairs.length);
      for (var i = 0; i < n; i++) {
        var lp = uploaded.left.pairs[i]; var rp = uploaded.right.pairs[i];
        cards.push({
          taskId: 'upload-' + i,
          taskName: (lp && lp.question) || (rp && rp.question) || ('第 ' + (i + 1) + ' 题'),
          dimension: (lp && lp.type) || (rp && rp.type) || '上传文档',
          difficulty: '',
          question: (lp && lp.question) || (rp && rp.question) || '',
          leftModel: sel.left,
          rightModel: sel.right,
          leftAnswer: lp ? lp.answer : '（左侧无此答案）',
          rightAnswer: rp ? rp.answer : '（右侧无此答案）',
          judgeVerdict: null,
          judgeReason: ''
        });
      }
      return cards;
    }
    var demo = [];
    PAIRS.forEach(function (pair) {
      var normal = pair.left_model === sel.left && pair.right_model === sel.right;
      var swapped = pair.left_model === sel.right && pair.right_model === sel.left;
      if (!normal && !swapped) return;
      var leftModel = normal ? pair.left_model : pair.right_model;
      var rightModel = normal ? pair.right_model : pair.left_model;
      var judgeWinner = pair.judge_verdict === 'left' ? pair.left_model
        : (pair.judge_verdict === 'right' ? pair.right_model : null);
      demo.push({
        taskId: pair.task_id,
        taskName: pair.task_name,
        dimension: pair.dimension,
        difficulty: pair.difficulty,
        question: pair.question,
        leftModel: leftModel,
        rightModel: rightModel,
        leftAnswer: normal ? pair.left_answer : pair.right_answer,
        rightAnswer: normal ? pair.right_answer : pair.left_answer,
        judgeVerdict: judgeWinner ? (judgeWinner === leftModel ? 'left' : 'right') : null,
        judgeReason: pair.judge_reason
      });
    });
    return demo;
  }

  function verdictLabel(verdict) {
    if (verdict === 'left') return '左侧更好';
    if (verdict === 'right') return '右侧更好';
    return '平局';
  }

  function apiJudge(card) {
    return window.fetch(API_BASE + '/api/review/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: card.question,
        answer_a: card.leftAnswer,
        answer_b: card.rightAnswer,
        judge_model: selectedJudge()
      })
    }).then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    });
  }

  function renderStats(sel, cards) {
    if (!statsRoot) return;
    var scored = cards.filter(function (c) { return readGsb(storageKey(c.taskId, sel.left, sel.right)); });
    var wins = {}, ties = {}, losses = {}, counts = {};
    cards.forEach(function (c) {
      [c.leftModel, c.rightModel].forEach(function (m) {
        if (!(m in wins)) { wins[m] = 0; ties[m] = 0; losses[m] = 0; counts[m] = 0; }
      });
    });
    scored.forEach(function (c) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      var winner = gsb === 'left' ? c.leftModel : (gsb === 'right' ? c.rightModel : null);
      if (winner) {
        wins[winner] += 1;
        [c.leftModel, c.rightModel].forEach(function (m) { if (m !== winner) losses[m] += 1; });
      } else if (gsb === 'tie') {
        ties[c.leftModel] += 1; ties[c.rightModel] += 1;
      }
      counts[c.leftModel] += 1; counts[c.rightModel] += 1;
    });

    var ranking = Object.keys(wins).map(function (m) {
      var n = counts[m] || 0;
      return { model: m, wins: wins[m], ties: ties[m], losses: losses[m], n: n, rate: n ? (wins[m] + 0.5 * ties[m]) / n : 0 };
    }).sort(function (a, b) { return b.rate - a.rate || b.wins - a.wins; });

    var agree = scored.filter(function (c) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      return gsb && c.judgeVerdict && gsb === c.judgeVerdict;
    }).length;

    var dims = {};
    scored.forEach(function (c) {
      var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
      var d = dimLabel(c.dimension) || '综合';
      if (!dims[d]) dims[d] = { winsA: 0, winsB: 0, ties: 0 };
      if (gsb === 'left') dims[d].winsA += 1;
      else if (gsb === 'right') dims[d].winsB += 1;
      else dims[d].ties += 1;
    });

    var summary = '';
    var summaryDims = '';
    var summaryConsist = '';
    if (scored.length && ranking.length) {
      var best = ranking[0];
      var second = ranking[1];
      var decided = (best.rate - (second ? second.rate : 0)) > 0.01;
      summary = decided
        ? best.model + ' 综合更优，胜率 ' + (best.rate * 100).toFixed(1) + '%（胜 ' + best.wins + ' · 平 ' + best.ties + ' · 负 ' + best.losses + '）'
        : '双方势均力敌（胜率持平）。';
      var dimText = Object.keys(dims).map(function (d) {
        var r = dims[d];
        var t = '「' + d + '」 ' + r.winsA + ':' + r.winsB;
        if (r.ties) t += '（平 ' + r.ties + '）';
        return t;
      }).join(' · ');
      var bestDimA = null, bestDimB = null;
      Object.keys(dims).forEach(function (d) {
        var r = dims[d];
        if (r.winsA - r.winsB > 0 && (!bestDimA || (r.winsA - r.winsB) > (dims[bestDimA].winsA - dims[bestDimA].winsB))) bestDimA = d;
        if (r.winsB - r.winsA > 0 && (!bestDimB || (r.winsB - r.winsA) > (dims[bestDimB].winsB - dims[bestDimB].winsA))) bestDimB = d;
      });
      summaryDims = '场景表现：' + dimText + '。';
      if (decided && bestDimA) summaryDims += ' ' + best.model + ' 最强项「' + bestDimA + '」。';
      if (bestDimB) summaryDims += ' ' + sel.right + ' 优势项「' + bestDimB + '」。';

      var agreeRate = scored.length ? (agree / scored.length * 100) : 0;
      summaryConsist = '人机一致 ' + agree + '/' + scored.length + '（' + agreeRate.toFixed(1) + '%）';
      if (scored.length >= 2 && agreeRate < 60) summaryConsist += '，判分与你差异较大，建议重点复核分歧题。';
    }

    var html = '<div class="rv-stats-grid">';
    html += '<div class="rv-stat rv-stat-rank"><div class="rv-stat-head"><span>GSB 胜率排行</span><em>' + scored.length + '/' + cards.length + ' 已打分</em></div>';
    html += ranking.length
      ? '<ol class="rv-rank-list">' + ranking.map(function (r, i) {
          return '<li><span class="rv-rank-pos">' + (i + 1) + '</span><span class="rv-rank-name">' + esc(r.model) + '</span>' +
            '<span class="rv-rank-meta">胜 ' + r.wins + ' · 平 ' + r.ties + ' · 负 ' + r.losses + '</span>' +
            '<strong>' + (r.rate * 100).toFixed(1) + '%</strong></li>';
        }).join('') + '</ol>'
      : '<p class="rv-stat-empty">暂无打分，选一题开始复核。</p>';
    html += '</div>';
    html += '<div class="rv-stat"><div class="rv-stat-head"><span>人机一致率</span><em>' + esc(sel.judge) + ' vs 你</em></div>';
    html += '<strong class="rv-stat-big">' + (scored.length ? (agree / scored.length * 100).toFixed(1) + '%' : '--') + '</strong>';
    html += '<small>' + agree + '/' + scored.length + ' 题与判分结论一致</small></div>';
    html += '<div class="rv-stat rv-stat-summary"><div class="rv-stat-head"><span>自动总结</span><em>实时生成</em></div>';
    html += '<p class="rv-summary-lead">' + (summary || '打分后自动生成：总评、分场景表现与最强能力。') + '</p>';
    if (summaryDims) html += '<p class="rv-summary-dims">' + summaryDims + '</p>';
    if (summaryConsist) html += '<p class="rv-summary-consist">' + summaryConsist + '</p>';
    html += '</div>';
    html += '</div>';
    statsRoot.innerHTML = html;
  }

  function gsbButtons(card, sel) {
    var key = storageKey(card.taskId, sel.left, sel.right);
    var current = readGsb(key);
    var labels = { left: 'A 更好', tie: '平局', right: 'B 更好' };
    var html = '<div class="rv-gsb" role="group" aria-label="GSB 打分">';
    ['left', 'tie', 'right'].forEach(function (value) {
      html += '<button type="button" class="rv-gsb-button' + (current === value ? ' is-active' : '') + '" data-gsb="' + value + '">' + labels[value] + '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderCards(sel) {
    if (!cardsRoot) return;
    var cards = buildCards(sel);
    if (!cards.length) {
      cardsRoot.innerHTML = '';
      if (emptyRoot) emptyRoot.hidden = false;
      renderStats(sel, []);
      return;
    }
    if (emptyRoot) emptyRoot.hidden = true;

    if (uploadState) {
      if (uploaded.left && uploaded.right) {
        uploadState.hidden = false;
        uploadState.textContent = '正在使用上传文档：左 = ' + uploaded.left.name + '，右 = ' + uploaded.right.name + '（题序对齐，共 ' + cards.length + ' 题）。';
      } else if (uploaded.left || uploaded.right) {
        uploadState.hidden = false;
        uploadState.textContent = '已上传单侧文档，等另一侧上传后自动生成对照题卡。';
      } else {
        uploadState.hidden = true;
      }
    }

    var html = '';
    cards.forEach(function (card) {
      var current = readGsb(storageKey(card.taskId, sel.left, sel.right));
      var judgeStored = readStore(judgeKey(card.taskId, sel.left, sel.right));
      var judge = null;
      if (judgeStored) {
        try { judge = JSON.parse(judgeStored); } catch (e) { /* ignore */ }
      }
      var verdict = judge && judge.verdict ? judge.verdict : card.judgeVerdict;
      var reason = judge && judge.reason ? judge.reason : card.judgeReason;

      html += '<article class="rv-card" data-task="' + esc(card.taskId) + '">';
      html += '<header class="rv-card-head"><div><h2>' + esc(card.taskName) + '</h2>';
      html += '<div class="rv-card-meta">' +
        (card.dimension ? '<span>' + esc(dimLabel(card.dimension)) + '</span>' : '') +
        (card.difficulty ? '<span>' + esc(card.difficulty) + '</span>' : '') +
        (current ? '<span class="rv-card-done">已打分</span>' : '') +
        '</div></div>';
      html += '<span class="rv-card-id">' + esc(card.taskId) + '</span></header>';
      html += '<p class="rv-question">' + esc(card.question) + '</p>';
      html += '<div class="rv-panes">';
      html += '<div class="rv-pane"><div class="rv-pane-head"><strong>' + esc(card.leftModel) + '</strong><span>左侧</span></div><pre class="rv-answer">' + esc(card.leftAnswer) + '</pre></div>';
      html += '<div class="rv-pane"><div class="rv-pane-head"><strong>' + esc(card.rightModel) + '</strong><span>右侧</span></div><pre class="rv-answer">' + esc(card.rightAnswer) + '</pre></div>';
      html += '</div>';
      if (reason) {
        html += '<div class="rv-judge"><span class="rv-judge-badge">判分模型</span><strong>' + esc(selectedJudge()) + ' 判定：' + verdictLabel(verdict) + '</strong>';
        html += '<p>' + esc(reason) + '</p></div>';
      } else {
        html += '<div class="rv-judge rv-judge-wait"><span class="rv-judge-badge">判分模型</span><span>尚未判分。</span>';
        html += '<button type="button" class="bench-ghost-button rv-judge-button" data-judge="1">调用判分（' + esc(selectedJudge()) + '）</button></div>';
      }
      html += '<footer class="rv-card-foot">' + gsbButtons(card, sel) + '</footer>';
      html += '</article>';
    });
    cardsRoot.innerHTML = html;
    renderStats(sel, cards);
  }

  function refresh() { renderCards(currentSelection()); }

  function populateSelects() {
    var demoLeft = PAIRS.length ? PAIRS[0].left_model : null;
    var demoRight = PAIRS.length ? PAIRS[0].right_model : null;
    ['rv-left-model', 'rv-right-model'].forEach(function (id, idx) {
      var sel = document.getElementById(id);
      if (!sel) return;
      MODELS.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        sel.appendChild(opt);
      });
      var def = idx === 0 ? demoLeft : demoRight;
      if (def && MODELS.indexOf(def) >= 0) sel.value = def;
    });
    if (judgeSelect) {
      JUDGE_MODELS.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        judgeSelect.appendChild(opt);
      });
      if (JUDGE_MODELS.length) judgeSelect.value = JUDGE_MODELS[0];
    }
    if (demoNote && QA.demo) demoNote.hidden = false;
  }

  if (cardsRoot) {
    cardsRoot.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('.rv-gsb-button');
      if (button) {
        var card = button.closest('.rv-card');
        if (!card) return;
        var sel = currentSelection();
        var match = buildCards(sel).filter(function (c) { return c.taskId === card.dataset.task; })[0];
        if (!match) return;
        var key = storageKey(match.taskId, sel.left, sel.right);
        var value = button.dataset.gsb;
        writeGsb(key, readGsb(key) === value ? null : value);
        refresh();
        return;
      }
      var judgeButton = event.target.closest && event.target.closest('.rv-judge-button');
      if (judgeButton) {
        var cardEl = judgeButton.closest('.rv-card');
        if (!cardEl) return;
        var sel2 = currentSelection();
        var matchCard = buildCards(sel2).filter(function (c) { return c.taskId === cardEl.dataset.task; })[0];
        if (!matchCard) return;
        judgeButton.disabled = true;
        judgeButton.textContent = '判分中…';
        apiJudge(matchCard).then(function (data) {
          writeStore(judgeKey(matchCard.taskId, sel2.left, sel2.right), JSON.stringify(data));
          refresh();
        }).catch(function () {
          judgeButton.disabled = false;
          judgeButton.textContent = '判分失败（确认本地 API 已启动）';
          window.setTimeout(function () {
            judgeButton.textContent = '调用判分（' + sel2.judge + '）';
          }, 2600);
        });
      }
    });
  }

  if (leftSelect) leftSelect.addEventListener('change', refresh);
  if (rightSelect) rightSelect.addEventListener('change', refresh);
  if (judgeSelect) judgeSelect.addEventListener('change', refresh);
  if (uploadLeftInput) uploadLeftInput.addEventListener('change', function () { handleUpload('left'); });
  if (uploadRightInput) uploadRightInput.addEventListener('change', function () { handleUpload('right'); });
  if (uploadClearButton) {
    uploadClearButton.addEventListener('click', function () {
      uploaded = { left: null, right: null };
      if (uploadLeftInput) uploadLeftInput.value = '';
      if (uploadRightInput) uploadRightInput.value = '';
      if (uploadLeftName) uploadLeftName.textContent = '未上传';
      if (uploadRightName) uploadRightName.textContent = '未上传';
      refresh();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', function () {
      if (window.confirm('清空全部 GSB 打分记录？')) { clearAllGsb(); refresh(); }
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', function () {
      var sel = currentSelection();
      var cards = buildCards(sel);
      var results = [];
      cards.forEach(function (c) {
        var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
        if (!gsb) return;
        var judgeStored = readStore(judgeKey(c.taskId, sel.left, sel.right));
        var judge = null;
        if (judgeStored) { try { judge = JSON.parse(judgeStored); } catch (e) { /* ignore */ } }
        results.push({
          task_id: c.taskId,
          task_name: c.taskName,
          task_type: dimLabel(c.dimension) || '',
          left_model: c.leftModel,
          right_model: c.rightModel,
          human_gsb: gsb,
          judge_model: sel.judge,
          judge_verdict: judge ? judge.verdict : c.judgeVerdict,
          judge_reason: judge ? judge.reason : c.judgeReason
        });
      });
      if (submitButton) submitButton.disabled = true;
      submitButton.textContent = '提交中…';
      window.fetch(API_BASE + '/api/review/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          left_model: sel.left,
          right_model: sel.right,
          judge_model: sel.judge,
          uploaded: Boolean(uploaded.left || uploaded.right),
          uploaded_left_name: uploaded.left ? uploaded.left.name : '',
          uploaded_right_name: uploaded.right ? uploaded.right.name : '',
          results: results
        })
      }).then(function (resp) { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
        .then(function (data) {
          submitButton.disabled = false;
          addLocalSubmit({
            round: data.round,
            saved_at: new Date().toISOString(),
            left_model: sel.left,
            right_model: sel.right,
            judge_model: sel.judge,
            uploaded: Boolean(uploaded.left || uploaded.right),
            scored_count: results.length,
            results: results
          });
          submitButton.textContent = '第 ' + data.round + ' 次已提交（平台 + 本地）';
          renderHistory(data.entries);
          // 自动生成并下载评测报告
          submitRound = data.round;
          downloadText(buildReportText(sel, cards), reportFilename(data.round));
        })
        .catch(function () {
          submitButton.disabled = false;
          submitButton.textContent = '提交失败（确认本地 API 已启动）';
        });
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', function () {
      var sel = currentSelection();
      var results = [];
      buildCards(sel).forEach(function (c) {
        var gsb = readGsb(storageKey(c.taskId, sel.left, sel.right));
        if (!gsb) return;
        results.push({
          task_id: c.taskId, task_name: c.taskName,
          left_model: c.leftModel, right_model: c.rightModel,
          human_gsb: gsb, judge_model: sel.judge,
          judge_verdict: c.judgeVerdict, judge_reason: c.judgeReason
        });
      });
      var payload = {
        schema: 'review_gsb_result.v1',
        exported_at: new Date().toISOString(),
        left_model: sel.left, right_model: sel.right, judge_model: sel.judge,
        uploaded: Boolean(uploaded.left || uploaded.right),
        scored_count: results.length, results: results
      };
      var blob = new window.Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'auto-eval-gsb-' + sel.left.replace(/\s+/g, '-') + '-vs-' + sel.right.replace(/\s+/g, '-') + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
    });
  }

  populateSelects();
  initModeUI();
  renderModeUI();
  refresh();
  // 初始化提交记录：先渲染本地，再异步刷新平台计数
  renderHistory(localSubmits().length);
  window.fetch(API_BASE + '/api/review/results')
    .then(function (r) { return r.json(); })
    .then(function (data) { renderHistory(data.entries); })
    .catch(function () { /* 平台未启动时保持本地记录 */ });
})();
