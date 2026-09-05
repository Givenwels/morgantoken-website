(function () {
  "use strict";

  const API = "/api/localbench";
  const LIST_INTERVAL = 5000;
  const DETAIL_INTERVAL = 2000;
  const stateLabels = {
    queued: "排队中",
    preflighting: "环境检查",
    running: "运行中",
    paused: "已暂停",
    cancelling: "正在取消",
    cancelled: "已取消",
    failed: "失败",
    validating: "校验结果",
    publishing: "发布榜单",
    completed: "已完成"
  };

  const elements = {
    status: document.getElementById("admin-live-status"),
    runtime: document.getElementById("admin-runtime"),
    form: document.getElementById("admin-new-run"),
    model: document.getElementById("admin-model"),
    profile: document.getElementById("admin-profile"),
    workers: document.getElementById("admin-workers"),
    summary: document.getElementById("admin-run-summary"),
    start: document.getElementById("admin-start-run"),
    refresh: document.getElementById("admin-refresh"),
    jobs: document.getElementById("admin-job-list"),
    detail: document.getElementById("admin-job-detail"),
    log: document.getElementById("admin-log")
  };

  let selectedJobId = "";
  let listTimer = null;
  let detailTimer = null;
  let busy = false;

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = String(content);
    return element;
  }

  function replaceChildren(target, children) {
    target.replaceChildren(...children);
  }

  async function request(path, options) {
    const response = await fetch(API + path, Object.assign({
      headers: { "Content-Type": "application/json" }
    }, options || {}));
    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      payload = {};
    }
    if (!response.ok) throw new Error(payload.detail || "请求失败（" + response.status + "）");
    return payload;
  }

  function setConnection(ok, message) {
    elements.status.className = "admin-live-status " + (ok ? "is-online" : "is-offline");
    elements.status.lastElementChild.textContent = message;
  }

  function cardHeading(eyebrow, title) {
    const copy = node("div");
    copy.append(node("p", "admin-eyebrow", eyebrow), node("h2", "", title));
    const head = node("div", "admin-card-head");
    head.append(copy);
    return head;
  }

  function definition(label, value) {
    const row = node("div");
    row.append(node("dt", "", label), node("dd", "", value));
    return row;
  }

  async function loadRuntime() {
    try {
      const runtime = await request("/runtime");
      const list = node("dl", "admin-definition-list");
      list.append(
        definition("服务", "已连接 · 仅限本机"),
        definition("OpenClaw", runtime.version || "未知"),
        definition("可用模型", String((runtime.models || []).length))
      );
      replaceChildren(elements.runtime, [cardHeading("RUNTIME", "本机环境"), list]);

      const options = (runtime.models || []).map(function (model) {
        const option = node("option", "", model);
        option.value = model;
        option.selected = model === runtime.default_model;
        return option;
      });
      if (!options.length) {
        const option = node("option", "", "OpenClaw 未配置模型");
        option.value = "";
        options.push(option);
      }
      replaceChildren(elements.model, options);
      elements.model.disabled = !runtime.models || !runtime.models.length;
      elements.start.disabled = elements.model.disabled;
      setConnection(true, "本地服务已连接");
    } catch (error) {
      setConnection(false, error.message);
      elements.start.disabled = true;
      const message = node("p", "admin-error", error.message);
      replaceChildren(elements.runtime, [cardHeading("RUNTIME", "本机环境"), message]);
    }
  }

  function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
  }

  function progress(job) {
    const completed = Number(job.progress_completed || 0);
    const total = Number(job.progress_total || 0);
    const percent = total ? Math.min(100, Math.round(completed * 100 / total)) : 0;
    return { completed: completed, total: total, percent: percent };
  }

  function renderJobs(jobs) {
    if (!jobs.length) {
      replaceChildren(elements.jobs, [node("p", "admin-empty", "还没有评测任务。可以从上方先跑一次冒烟测试。")]);
      return;
    }
    const cards = jobs.map(function (job) {
      const item = node("button", "admin-job-item state-" + job.state);
      item.type = "button";
      item.dataset.jobId = job.id;
      if (job.id === selectedJobId) item.classList.add("is-selected");

      const top = node("span", "admin-job-top");
      top.append(node("strong", "admin-model-name", job.request.model), node("span", "admin-state", stateLabels[job.state] || job.state));
      const meta = node("span", "admin-job-meta", job.request.profile.toUpperCase() + " · " + formatTime(job.created_at));
      const runProgress = progress(job);
      const meter = node("span", "admin-progress-track");
      const bar = node("span", "admin-progress-bar");
      bar.style.width = runProgress.percent + "%";
      meter.append(bar);
      const count = node("span", "admin-job-count", runProgress.completed + " / " + runProgress.total);
      item.append(top, meta, meter, count);
      item.addEventListener("click", function () { selectJob(job.id); });
      return item;
    });
    replaceChildren(elements.jobs, cards);
  }

  async function loadJobs() {
    try {
      const jobs = await request("/jobs");
      jobs.sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
      renderJobs(jobs);
      if (!selectedJobId && jobs.length) selectJob(jobs[0].id);
      setConnection(true, "本地服务已连接");
    } catch (error) {
      setConnection(false, error.message);
      replaceChildren(elements.jobs, [node("p", "admin-error", "读取任务失败：" + error.message)]);
    }
  }

  function actionButton(label, action, danger) {
    const button = node("button", danger ? "admin-action-button is-danger" : "admin-action-button", label);
    button.type = "button";
    button.addEventListener("click", function () { runAction(action); });
    return button;
  }

  function renderDetail(job) {
    const runProgress = progress(job);
    const idText = node("p", "admin-job-id", job.id);
    const model = node("p", "admin-detail-model admin-model-name", job.request.model);
    const badge = node("span", "admin-state state-" + job.state, stateLabels[job.state] || job.state);
    const progressElement = document.createElement("progress");
    progressElement.max = Math.max(1, runProgress.total);
    progressElement.value = runProgress.completed;
    progressElement.setAttribute("aria-label", "评测进度");
    const progressText = node("p", "admin-detail-progress", runProgress.completed + " / " + runProgress.total + " 个场景 · " + runProgress.percent + "%");
    const facts = node("dl", "admin-definition-list admin-detail-facts");
    facts.append(
      definition("评测规模", job.request.profile),
      definition("重复次数", job.request.trials),
      definition("并行任务", job.request.workers),
      definition("最后更新", formatTime(job.updated_at))
    );
    const actions = node("div", "admin-actions");
    if (job.state === "running") actions.append(actionButton("暂停", "pause"), actionButton("取消", "cancel", true));
    if (job.state === "paused") actions.append(actionButton("继续", "resume"), actionButton("取消", "cancel", true));
    if (job.state === "queued") actions.append(actionButton("取消", "cancel", true));
    if (["failed", "cancelled"].includes(job.state)) actions.append(actionButton("重跑失败项", "rerun-failures"));
    if (job.report_path && job.request.profile !== "smoke" && job.state !== "publishing") actions.append(actionButton("发布到本地榜单", "publish"));

    const children = [cardHeading("RUN DETAIL", "任务详情"), idText, model, badge, progressElement, progressText, facts];
    if (job.last_message) children.push(node("p", "admin-detail-message", job.last_message));
    if (job.error) children.push(node("p", "admin-error", job.error));
    if (actions.childElementCount) children.push(actions);
    replaceChildren(elements.detail, children);
  }

  async function loadDetail() {
    if (!selectedJobId || document.hidden) return;
    try {
      const job = await request("/jobs/" + encodeURIComponent(selectedJobId));
      renderDetail(job);
      const log = await request("/jobs/" + encodeURIComponent(selectedJobId) + "/log?after=0");
      elements.log.textContent = log.lines.length ? log.lines.join("\n") : "当前还没有日志输出。";
      elements.log.scrollTop = elements.log.scrollHeight;
    } catch (error) {
      elements.log.textContent = "读取任务失败：" + error.message;
    }
  }

  function selectJob(jobId) {
    selectedJobId = jobId;
    Array.from(elements.jobs.querySelectorAll(".admin-job-item")).forEach(function (item) {
      item.classList.toggle("is-selected", item.dataset.jobId === jobId);
    });
    loadDetail();
  }

  async function runAction(action) {
    if (!selectedJobId || busy) return;
    busy = true;
    try {
      const job = await request("/jobs/" + encodeURIComponent(selectedJobId) + "/" + action, { method: "POST" });
      renderDetail(job);
      await loadJobs();
      await loadDetail();
    } catch (error) {
      elements.log.textContent = "操作失败：" + error.message;
    } finally {
      busy = false;
    }
  }

  function updateSummary() {
    const profile = elements.profile.value;
    const trials = profile === "smoke" ? 1 : 3;
    const scenarios = { smoke: 1, core: 26, full: 102 }[profile];
    replaceChildren(elements.summary, [
      node("span", "", trials + " 次重复 · " + scenarios + " 个场景"),
      node("span", "", profile === "smoke" ? "冒烟结果不进入榜单" : "通过校验后自动进入本地榜单")
    ]);
  }

  async function submitRun(event) {
    event.preventDefault();
    if (busy || !elements.model.value) return;
    busy = true;
    elements.start.disabled = true;
    elements.start.textContent = "正在创建任务…";
    const profile = elements.profile.value;
    try {
      const job = await request("/jobs", {
        method: "POST",
        body: JSON.stringify({
          model: elements.model.value,
          profile: profile,
          trials: profile === "smoke" ? 1 : 3,
          workers: Number(elements.workers.value)
        })
      });
      selectedJobId = job.id;
      await loadJobs();
      await loadDetail();
    } catch (error) {
      setConnection(false, "创建失败：" + error.message);
    } finally {
      busy = false;
      elements.start.disabled = elements.model.disabled;
      elements.start.textContent = "开始评测";
    }
  }

  function startPolling() {
    stopPolling();
    if (document.hidden) return;
    listTimer = window.setInterval(loadJobs, LIST_INTERVAL);
    detailTimer = window.setInterval(loadDetail, DETAIL_INTERVAL);
  }

  function stopPolling() {
    if (listTimer) window.clearInterval(listTimer);
    if (detailTimer) window.clearInterval(detailTimer);
    listTimer = null;
    detailTimer = null;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopPolling();
    else {
      loadRuntime();
      loadJobs();
      loadDetail();
      startPolling();
    }
  });
  elements.profile.addEventListener("change", updateSummary);
  elements.form.addEventListener("submit", submitRun);
  elements.refresh.addEventListener("click", function () { loadRuntime(); loadJobs(); loadDetail(); });

  updateSummary();
  loadRuntime();
  loadJobs();
  startPolling();
}());
