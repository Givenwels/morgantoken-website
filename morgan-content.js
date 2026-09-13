const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function appendTextElement(parent, tagName, text, className) {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "日期未知" : dateFormatter.format(date);
}

function safeRepositoryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderSummaryCard(container, label, value, note) {
  const card = document.createElement("article");
  card.className = "summary-card";
  appendTextElement(card, "p", label, "summary-label");
  appendTextElement(card, "strong", value, "summary-value");
  appendTextElement(card, "p", note, "summary-note");
  container.append(card);
}

function renderBenchmark(data) {
  const summary = document.querySelector("#summary-cards");
  const tableBody = document.querySelector("#leaderboard-body");
  if (!summary || !tableBody || !data?.meta || !Array.isArray(data.leaderboard)) {
    throw new TypeError("评测快照格式无效");
  }

  renderSummaryCard(summary, "任务", String(data.meta.taskCount), "覆盖基准任务");
  renderSummaryCard(summary, "模型", String(data.meta.modelCount), "快照收录模型");
  renderSummaryCard(summary, "榜首", data.leaderboard[0]?.name ?? "—", "当前快照最高最终得分");

  for (const model of data.leaderboard) {
    const row = document.createElement("tr");
    const values = [
      String(model.rank ?? "—"),
      model.name ?? "未命名模型",
      model.provider ?? "未知",
      formatScore(model.final),
      formatScore(model.overall),
      `${formatScore(model.efficiency)}%`,
    ];
    for (const value of values) appendTextElement(row, "td", value);
    tableBody.append(row);
  }
}

function createRepositoryCard(repository) {
  const card = document.createElement("article");
  card.className = "repository-card";

  const heading = document.createElement("h3");
  const repositoryUrl = safeRepositoryUrl(repository.html_url);
  if (repositoryUrl) {
    const link = document.createElement("a");
    link.href = repositoryUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = repository.name ?? "未命名仓库";
    heading.append(link);
  } else {
    heading.textContent = repository.name ?? "未命名仓库";
  }
  card.append(heading);

  appendTextElement(card, "p", repository.description || "暂无描述", "repository-description");
  const details = document.createElement("dl");
  details.className = "repository-meta";
  for (const [label, value] of [
    ["语言", repository.language || "未标注"],
    ["星标", String(repository.stargazers_count ?? 0)],
    ["更新", formatDate(repository.updated_at)],
  ]) {
    const group = document.createElement("div");
    appendTextElement(group, "dt", label);
    appendTextElement(group, "dd", value);
    details.append(group);
  }
  card.append(details);
  return card;
}

function renderRepositories(repositories) {
  const grid = document.querySelector("#repository-grid");
  const count = document.querySelector("#repository-count");
  const search = document.querySelector("#repository-search");
  if (!grid || !count || !search || !Array.isArray(repositories)) {
    throw new TypeError("仓库快照格式无效");
  }

  const render = (query = "") => {
    grid.replaceChildren();
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const matches = repositories.filter((repository) => [
      repository.name,
      repository.description,
      repository.language,
    ].some((value) => String(value ?? "").toLocaleLowerCase("zh-CN").includes(normalizedQuery)));

    count.textContent = normalizedQuery
      ? `找到 ${matches.length} 个仓库`
      : `共 ${matches.length} 个仓库`;
    for (const repository of matches) grid.append(createRepositoryCard(repository));
    if (matches.length === 0) {
      appendTextElement(grid, "p", "没有匹配的仓库。", "empty-state");
    }
  };

  search.addEventListener("input", () => render(search.value));
  render();
}

async function loadCollection() {
  const { collection, source } = document.body.dataset;
  const loadingStatus = document.querySelector("#loading-status");
  const errorStatus = document.querySelector("#error-status");

  try {
    if (!source) throw new Error("页面未配置本地数据源");
    const response = await fetch(source, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`数据请求失败（${response.status}）`);
    const data = await response.json();
    if (collection === "bench") renderBenchmark(data);
    else if (collection === "github") renderRepositories(data);
    else throw new Error("不支持的数据集合");
    loadingStatus.hidden = true;
  } catch (error) {
    loadingStatus.hidden = true;
    errorStatus.hidden = false;
    errorStatus.textContent = `无法加载内容：${error instanceof Error ? error.message : String(error)}`;
  }
}

loadCollection();
