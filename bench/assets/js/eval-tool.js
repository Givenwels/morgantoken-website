/* ============================================================
   AutoEval 评测工具：Excel 测试集 + 两模型对谈 + 大模型裁判
   - 纯前端：Excel 解析、模型选择、API 配置本地保存
   - 真实 API 调用需本地后端（当前为 UI 演示 + 校验）
   ============================================================ */
(function () {
  'use strict';

  var MODELS = [
    /* ---- 美国 ---- */
    { label: 'Claude Opus 5',          provider: 'Anthropic',       base: 'https://api.anthropic.com/v1',                        name: 'claude-opus-5' },
    { label: 'Claude Sonnet 5',        provider: 'Anthropic',       base: 'https://api.anthropic.com/v1',                        name: 'claude-sonnet-5' },
    { label: 'Claude Fable 5',         provider: 'Anthropic',       base: 'https://api.anthropic.com/v1',                        name: 'claude-fable-5' },
    { label: 'GPT-5.6 Luna',           provider: 'OpenAI',          base: 'https://api.openai.com/v1',                           name: 'gpt-5.6-luna' },
    { label: 'Gemini 3.7 Flash',       provider: 'Google',          base: 'https://generativelanguage.googleapis.com/v1beta',    name: 'gemini-3.7-flash' },
    { label: 'Gemini 3.6 Flash',       provider: 'Google',          base: 'https://generativelanguage.googleapis.com/v1beta',    name: 'gemini-3.6-flash' },
    { label: 'Gemini 3.1 Pro',         provider: 'Google',          base: 'https://generativelanguage.googleapis.com/v1beta',    name: 'gemini-3.1-pro' },
    { label: 'Grok 4.6',               provider: 'xAI',             base: 'https://api.x.ai/v1',                                 name: 'grok-4-6' },
    { label: 'Muse Spark 1.2',         provider: 'Meta',            base: 'https://api.meta.ai/v1',                              name: 'muse-spark-1.2' },
    /* ---- 中国 ---- */
    { label: 'Qwen3.8-Max',            provider: '阿里云 DashScope', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',   name: 'qwen3.8-max' },
    { label: 'Qwen3.8-27B',            provider: '阿里云 DashScope', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',   name: 'qwen3.8-27b' },
    { label: 'GLM-5.3',                provider: '智谱 AI',         base: 'https://open.bigmodel.cn/api/paas/v4',                name: 'glm-5.3' },
    { label: 'GLM-5.2',                provider: '智谱 AI',         base: 'https://open.bigmodel.cn/api/paas/v4',                name: 'glm-5.2' },
    { label: 'DeepSeek-V4-Pro',        provider: 'DeepSeek',        base: 'https://api.deepseek.com/v1',                        name: 'deepseek-chat' },
    { label: 'DeepSeek-V4-Flash（视觉）', provider: 'DeepSeek',       base: 'https://api.deepseek.com/v1',                        name: 'deepseek-vl-4-flash' },
    { label: 'Kimi K3',                provider: '月之暗面',        base: 'https://api.moonshot.cn/v1',                         name: 'kimi-k3' },
    { label: 'MiniMax-M3',             provider: 'MiniMax',         base: 'https://api.minimax.chat/v1',                        name: 'MiniMax-M3' },
    { label: 'Hunyuan 3',              provider: '腾讯混元',        base: 'https://api.hunyuan.cloud.tencent.com/v1',            name: 'hunyuan-turbos-latest' },
    { label: 'Doubao-Seed',            provider: '字节跳动',        base: 'https://ark.cn-beijing.volces.com/api/v3',             name: 'doubao-seed-1-6-250615' },
    { label: 'Step-3.7-Flash',         provider: '阶跃星辰',        base: 'https://api.stepfun.com/v1',                          name: 'step-3.7-flash' },
    { label: '其他（自定义）',          provider: '自定义',          base: '',                                                    name: '' }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    tasks: null,
    fileName: '',
    running: false
  };

  /* ---------- 1. 渲染模型下拉 ---------- */
  function fillSelect(sel) {
    MODELS.forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.label;
      opt.textContent = m.label + '（' + m.provider + '）';
      sel.appendChild(opt);
    });
  }

  function applyModel(sel, baseEl, nameEl) {
    var m = MODELS.filter(function (x) { return x.label === sel.value; })[0];
    if (!m) return;
    baseEl.value = m.base;
    nameEl.value = m.name;
    if (m.provider === '自定义') { baseEl.placeholder = '填写你的 Base URL'; }
  }

  /* ---------- 2. Excel 解析 ---------- */
  function parseExcel(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: 'array' });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) { cb(new Error('表格是空的')); return; }

        var head = Object.keys(rows[0]);
        var col = function (names) {
          for (var i = 0; i < names.length; i++) {
            var hit = head.filter(function (h) { return h.toLowerCase().indexOf(names[i]) >= 0; })[0];
            if (hit) return hit;
          }
          return null;
        };
        var cId = col(['task_id', 'taskid', 'id']);
        var cP = col(['prompt', '任务', '题目', 'question']);
        var cR = col(['reference', 'answer', '标准', '答案']);
        var cRu = col(['rubric', '评分', '要点']);

        var tasks = rows.map(function (r, i) {
          return {
            id: (cId && r[cId]) ? String(r[cId]) : ('task-' + (i + 1)),
            prompt: cP ? String(r[cP]) : '',
            reference: cR ? String(r[cR]) : '',
            rubric: cRu ? String(r[cRu]) : ''
          };
        }).filter(function (t) { return t.prompt; });

        if (!tasks.length) { cb(new Error('没有找到带 prompt（任务描述）列的数据')); return; }
        state.tasks = tasks;
        state.fileName = file.name;
        cb(null, tasks);
      } catch (err) { cb(err); }
    };
    reader.onerror = function () { cb(new Error('读取文件失败')); };
    reader.readAsArrayBuffer(file);
  }

  function renderPreview(tasks) {
    var body = $('evalPreviewBody');
    body.innerHTML = '';
    tasks.slice(0, 3).forEach(function (t) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(t.id) + '</td><td title="' + escapeHtml(t.prompt) + '">' + escapeHtml(t.prompt) + '</td><td>' + escapeHtml((t.reference || '—').slice(0, 40)) + '</td><td>' + escapeHtml((t.rubric || '—').slice(0, 40)) + '</td>';
      body.appendChild(tr);
    });
    $('evalPreview').hidden = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- 3. localStorage 保存 API 配置 ---------- */
  function saveKeys() {
    try {
      localStorage.setItem('eval_key_a', $('evalKeyA').value);
      localStorage.setItem('eval_key_b', $('evalKeyB').value);
    } catch (e) { /* 隐私模式忽略 */ }
  }
  function loadKeys() {
    try {
      if (localStorage.getItem('eval_key_a')) $('evalKeyA').value = localStorage.getItem('eval_key_a');
      if (localStorage.getItem('eval_key_b')) $('evalKeyB').value = localStorage.getItem('eval_key_b');
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 4. 校验 + 开始 ---------- */
  function validate() {
    var msgs = [];
    if (!state.tasks) msgs.push('请先上传 Excel 测试集');
    if (!$('evalModelA').value || !$('evalModelB').value) msgs.push('请选择模型 A 和 B');
    if (!$('evalKeyA').value || !$('evalKeyB').value) msgs.push('请填写两个模型的 API Key');
    if (!$('evalBaseA').value || !$('evalBaseB').value) msgs.push('请填写两个模型的 Base URL');
    return msgs;
  }

  function runDemo() {
    var tasks = state.tasks;
    var modelA = $('evalModelA').value;
    var modelB = $('evalModelB').value;
    var rounds = parseInt($('evalRounds').value, 10) || 2;

    var total = tasks.length * rounds;
    var done = 0;
    var bar = $('evalProgressFill');
    var text = $('evalProgressText');
    var step = Math.max(1, Math.round(total / 30));

    var timer = setInterval(function () {
      done = Math.min(total, done + step);
      bar.style.width = (done / total * 100).toFixed(0) + '%';
      text.textContent = '模型 ' + modelA + ' 与 ' + modelB + ' 对谈中… ' + done + '/' + total + ' 步';
      if (done >= total) {
        clearInterval(timer);
        showResult(tasks, modelA, modelB, rounds);
      }
    }, 120);
  }

  function showResult(tasks, modelA, modelB, rounds) {
    var box = $('evalResult');
    var judged = tasks.length;
    var winA = tasks.filter(function (_, i) { return (i * 7 + 3) % 3 !== 0; }).length;
    var winB = judged - winA;
    var html =
      '<p><strong>评测完成 ✅</strong> ' + judged + ' 道任务 × ' + rounds + ' 轮对谈</p>' +
      '<pre>' + escapeHtml(JSON.stringify({
        测试集: state.fileName,
        任务数: judged,
        对谈轮数: rounds,
        '模型A(进攻)': modelA,
        '模型B(防守/裁判)': modelB,
        模型A胜出: winA + ' 题',
        模型B胜出: winB + ' 题',
        平局: (judged - winA - winB) + ' 题',
        状态: '演示模式 — 真实评测需接入本地后端调用 API'
      }, null, 2)) + '</pre>';
    box.innerHTML = html;
    box.hidden = false;
    state.running = false;
    $('evalStartBtn').disabled = false;
    $('evalStartBtn').textContent = '重新评测 ▶';
  }

  /* ---------- 5. 事件绑定 ---------- */
  function init() {
    if (!$('evalStartBtn')) return; // 页面不存在则不初始化

    fillSelect($('evalModelA'));
    fillSelect($('evalModelB'));
    loadKeys();

    $('evalModelA').addEventListener('change', function () {
      applyModel(this, $('evalBaseA'), $('evalModelNameA'));
      saveKeys();
    });
    $('evalModelB').addEventListener('change', function () {
      applyModel(this, $('evalBaseB'), $('evalModelNameB'));
      saveKeys();
    });
    ['evalKeyA', 'evalKeyB'].forEach(function (id) {
      $(id).addEventListener('change', saveKeys);
    });

    // 上传
    var zone = $('evalUploadZone');
    var fileInput = $('evalFileInput');
    $('evalBrowseBtn').addEventListener('click', function (e) { e.stopPropagation(); fileInput.click(); });
    zone.addEventListener('click', function () { fileInput.click(); });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('is-dragover'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('is-dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); zone.classList.remove('is-dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () { if (this.files.length) handleFile(this.files[0]); });

    $('evalFileClear').addEventListener('click', function (e) {
      e.stopPropagation();
      state.tasks = null; state.fileName = '';
      $('evalFileInfo').hidden = true;
      $('evalPreview').hidden = true;
      fileInput.value = '';
    });

    $('evalStartBtn').addEventListener('click', function () {
      if (state.running) return;
      var msgs = validate();
      if (msgs.length) { $('evalStartHint').textContent = '⚠ ' + msgs.join('；'); return; }
      $('evalStartHint').textContent = '';
      saveKeys();
      state.running = true;
      this.disabled = true;
      $('evalProgress').hidden = false;
      $('evalResult').hidden = true;
      runDemo();
    });
  }

  function handleFile(file) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      alert('请上传 .xlsx / .xls / .csv 文件');
      return;
    }
    parseExcel(file, function (err, tasks) {
      if (err) { alert('解析失败：' + err.message); return; }
      $('evalFileName').textContent = file.name;
      $('evalFileStats').textContent = tasks.length + ' 个任务';
      $('evalFileInfo').hidden = false;
      renderPreview(tasks);
      $('evalStartHint').textContent = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
