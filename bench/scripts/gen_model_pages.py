#!/usr/bin/env python3
"""Generate CodeAgentBench model article pages.

The output is intentionally prose-heavy enough to publish as a first pass, while
still keeping the per-model page editable. Hand-written pages are not
overwritten unless --force is supplied.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = REPO_ROOT.parent
BENCH_DATA = REPO_ROOT / "_data" / "code_agent_bench.json"
TASK_DATA = REPO_ROOT / "_data" / "code_agent_tasks.json"
DEFAULT_OUTPUT = REPO_ROOT / "_models"

MODEL_DIR_OVERRIDES = {
    "opencode-glm52": Path(
        "/Volumes/apfs2tbxyh110/openclawcodebench-opencode-runs/"
        "full-suite-model-runs/"
        "swepro151-pass3-taskmajor-v30-r1-20260614-opencode-glm52-zh-pass3/"
        "opencode-glm52"
    ),
    "qodercli-qwen37plus-direct-full453-10c-r1-20260615": (
        REPO_ROOT / "SweResult" / "qodercli-qwen37plus-direct-full453-10c-r1-20260615"
    ),
    "qodercli-qwen37max-direct-full453-10c-r1-20260613": (
        REPO_ROOT / "SweResult" / "qodercli-qwen37max-direct-full453-10c-r1-20260613"
    ),
    "opencode-kat-coder-pro-v2-ps4-prepared-20260613": (
        REPO_ROOT / "SweResult" / "opencode-kat-coder-pro-v2-ps4-prepared-20260613"
    ),
}

HAND_WRITTEN_MODEL_IDS = {"opencode-glm52"}

REPO_LABELS = {
    "ansible/ansible": "Ansible",
    "flipt-io/flipt": "Flipt",
    "future-architect/vuls": "vuls",
    "internetarchive/openlibrary": "Open Library",
    "navidrome/navidrome": "Navidrome",
    "qutebrowser/qutebrowser": "qutebrowser",
}

REPO_LABELS_ZH = {
    "ansible/ansible": "Ansible 自动化",
    "flipt-io/flipt": "Flipt feature flag 服务",
    "future-architect/vuls": "vuls 漏洞扫描器",
    "internetarchive/openlibrary": "Open Library",
    "navidrome/navidrome": "Navidrome 音乐服务",
    "qutebrowser/qutebrowser": "qutebrowser 浏览器",
}

REPO_SHAPES = {
    "ansible/ansible": "automation and configuration-management work",
    "flipt-io/flipt": "Go product plumbing across configuration, storage, and service APIs",
    "future-architect/vuls": "localized Go security-scanner changes",
    "internetarchive/openlibrary": "large Python/Django application repairs",
    "navidrome/navidrome": "Go service work with persistence and API behavior",
    "qutebrowser/qutebrowser": "browser/runtime integration around QtWebEngine behavior",
}

REPO_SHAPES_ZH = {
    "ansible/ansible": "自动化和配置管理类改动",
    "flipt-io/flipt": "横跨配置、存储和服务 API 的 Go 产品工程",
    "future-architect/vuls": "边界相对清楚的 Go 漏洞扫描器改动",
    "internetarchive/openlibrary": "大型 Python/Django 应用修复",
    "navidrome/navidrome": "涉及持久化和 API 行为的 Go 服务改动",
    "qutebrowser/qutebrowser": "围绕 QtWebEngine 行为的浏览器/runtime 集成",
}

AGENT_NOTES = {
    "Codex": (
        "The Codex run is a useful reference point for what high-consistency, high-token search looks like in this suite.",
        "Codex 这一组很适合作为参照：它代表了高一致性、高 token 搜索在这个 suite 里的表现形状。",
    ),
    "OpenCode": (
        "The OpenCode run is more sensitive to the underlying model family: the same harness can look sharp or brittle depending on where the model puts its search budget.",
        "OpenCode 这组更能体现底层模型家族差异：同一套 harness 下，模型如何分配搜索预算会直接决定它显得锋利还是脆弱。",
    ),
    "Qwen": (
        "The Qwen CLI run is worth reading as a direct model behavior sample: it has less agent abstraction, so the suite pattern is often easier to attribute to the model.",
        "Qwen CLI 结果更像直接模型行为样本：agent 抽象更少，因此 suite pattern 往往更容易归因到模型本身。",
    ),
    "Qoder": (
        "The Qoder run shows the effect of a more opinionated coding shell around the model; stable wins and misses should be read as model-plus-tooling behavior.",
        "Qoder 结果反映的是更强约束 coding shell 加模型的组合；稳定胜利和失误都更适合读成 model-plus-tooling 行为。",
    ),
    "Claude Code": (
        "The Claude Code run is useful for comparing agent orchestration against OpenCode/Qoder-style shells on the same 151-task surface.",
        "Claude Code 结果适合拿来和 OpenCode、Qoder 这类 shell 在同一组 151 题上对比 agent 编排差异。",
    ),
    "deepseek-tui": (
        "The deepseek-tui row is an agent-shell stress test as much as a model test; low scores here often expose integration friction.",
        "deepseek-tui 这一行既是模型测试，也是 agent shell 压力测试；低分往往会暴露集成摩擦。",
    ),
}


@dataclass
class TaskAttempt:
    task_id: str
    suite: str
    repo: str
    attempt_index: int
    solved: bool
    verifier_verdict: str
    wall_clock_seconds: float | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    failure_mode: str | None = None


@dataclass
class InstanceStats:
    task_id: str
    suite: str
    repo: str
    solved_attempts: int = 0
    attempts: int = 0
    verdicts: Counter[str] = field(default_factory=Counter)
    failure_modes: Counter[str] = field(default_factory=Counter)

    @property
    def solved_once(self) -> bool:
        return self.solved_attempts > 0

    @property
    def pass3(self) -> bool:
        return self.attempts >= 3 and self.solved_attempts >= 3


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def pct(value: float | int | None) -> str:
    return f"{float(value or 0) * 100:.1f}%"


def as_pct(value: float | int | None) -> str:
    return f"{float(value or 0):.1f}%"


def scalar(value: object) -> str:
    if value is None:
        return '""'
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(round(value, 4) if isinstance(value, float) else value)
    text = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def block_scalar(value: str, indent: int = 2) -> list[str]:
    pad = " " * indent
    if not value:
        return [f"{pad}|", f"{pad}  "]
    return [f"{pad}|", *[f"{pad}  {line}" for line in value.splitlines()]]


def repo_display(repo: str) -> str:
    return REPO_LABELS.get(repo, repo)


def repo_display_zh(repo: str) -> str:
    return REPO_LABELS_ZH.get(repo, repo)


def suite_label(suite: str, repo: str) -> str:
    match = re.search(r"release-zh-(\d+)-", suite)
    release = match.group(1) if match else suite
    return f"{repo_display(repo)} · release {release}"


def suite_label_zh(suite: str, repo: str) -> str:
    match = re.search(r"release-zh-(\d+)-", suite)
    release = match.group(1) if match else suite
    return f"{repo_display_zh(repo)} · release {release}"


def task_short(task_id: str) -> str:
    return task_id.replace("instance_", "").replace("__", "/")


GENERIC_TITLES = {"", "summary", "摘要", "title", "title:", "标题", "标题："}
SECTION_HEADINGS = {
    "description",
    "描述",
    "problem",
    "问题",
    "actual behavior",
    "actual results",
    "当前行为",
    "实际行为",
    "expected behavior",
    "期望行为",
    "impact",
    "影响",
    "steps to reproduce",
    "复现步骤",
    "acceptance criteria",
    "验收标准",
    "requirements",
    "需求",
}
HASH_RE = re.compile(r"[0-9a-f]{20,}", re.IGNORECASE)
TASK_ID_RE = re.compile(r"(?:instance_)?[a-z0-9_.-]+(?:__|/)[a-z0-9_.-]+-[0-9a-f]{20,}", re.IGNORECASE)


def squash_text(value: str | None) -> str:
    text = (value or "").replace("\u200e", "").replace("\ufeff", "").strip()
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"__(.*?)__", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def remove_title_prefix(text: str) -> str:
    previous = None
    while text != previous:
        previous = text
        text = re.sub(r"^#+\s*", "", text).strip()
        text = re.sub(r"^(Title|标题)\s*[:：-]?\s*", "", text, flags=re.IGNORECASE).strip()
    return text


def trim_embedded_sections(text: str) -> str:
    section_words = (
        "Description|Problem|Problem / Opportunity|Actual Behavior|Actual Results|Expected Behavior|"
        "Acceptance Criteria|Impact|Steps to Reproduce|Additional Information|Requirements|Interface|"
        "描述|问题|当前行为|实际行为|期望行为|验收标准|影响|复现步骤|额外信息|补充背景|需求|接口"
    )
    text = re.split(rf"\s+#+\s*(?:{section_words})\b", text, maxsplit=1, flags=re.IGNORECASE)[0]
    text = re.split(rf"\s+(?:{section_words})\s*[:：]", text, maxsplit=1, flags=re.IGNORECASE)[0]
    return text.strip()


def looks_like_bad_title(text: str) -> bool:
    normalized = text.strip().strip(":：").lower()
    if normalized in GENERIC_TITLES:
        return True
    if normalized in SECTION_HEADINGS:
        return True
    if TASK_ID_RE.search(text) or HASH_RE.search(text):
        return True
    return False


def clean_title(value: str | None, fallback: str) -> str:
    text = squash_text(value or "")
    text = trim_embedded_sections(text)
    text = remove_title_prefix(text)
    text = text.strip("`*_ -:：")
    if looks_like_bad_title(text):
        text = ""
    if len(text) > 140:
        text = re.sub(r"\s+\S*$", "", text[:137]).rstrip() + "..."
    return text or fallback


def statement_title(value: str | None) -> str:
    if not value:
        return ""
    lines = [line.strip() for line in value.splitlines()]
    for index, line in enumerate(lines):
        if not line:
            continue
        candidate = clean_title(line, "")
        if candidate:
            return candidate
        raw = squash_text(line)
        raw_no_heading = re.sub(r"^#+\s*", "", raw).strip()
        if raw_no_heading.strip().strip(":：").lower() in GENERIC_TITLES:
            for next_line in lines[index + 1 :]:
                next_candidate = clean_title(next_line, "")
                if next_candidate:
                    return next_candidate
    compact = clean_title(value, "")
    if compact:
        return compact
    return ""


def repo_task_fallback(repo: str, suite: str, lang: str) -> str:
    match = re.search(r"release-zh-(\d+)-", suite or "")
    release = f" release {match.group(1)}" if match and lang == "en" else ""
    release_zh = f" release {match.group(1)}" if match and lang == "zh" else ""
    if lang == "zh":
        return f"{repo_display_zh(repo)}{release_zh} 任务"
    return f"{repo_display(repo)}{release} task"


def readable_case_title(task: dict[str, Any], item: InstanceStats, lang: str) -> str:
    fallback = repo_task_fallback(item.repo, item.suite, lang)
    if lang == "zh":
        candidates = [
            clean_title(task.get("title_zh"), ""),
            statement_title(task.get("problem_statement_zh")),
            statement_title(task.get("prompt_zh")),
            clean_title(task.get("title_en"), ""),
            statement_title(task.get("problem_statement_en")),
        ]
    else:
        candidates = [
            clean_title(task.get("title_en"), ""),
            statement_title(task.get("problem_statement_en")),
            statement_title(task.get("prompt_en")),
        ]
    for candidate in candidates:
        if candidate and not looks_like_bad_title(candidate):
            return candidate
    return fallback


def task_maps() -> dict[str, dict[str, Any]]:
    data = load_json(TASK_DATA)
    tasks: dict[str, dict[str, Any]] = {}
    for task in data.get("tasks", []):
        task_id = task["id"]
        tasks[task_id] = task
        tasks[task_short(task_id)] = task
    return tasks


def model_run_dir(row: dict[str, Any], source_roots: list[Path]) -> Path | None:
    model_id = row["id"]
    candidates: list[Path] = []
    override = MODEL_DIR_OVERRIDES.get(model_id)
    if override:
        candidates.append(override)
    for root in source_roots:
        candidates.append(root / model_id)
        if row.get("model_dir"):
            candidates.append(root / str(row["model_dir"]))
    candidates.extend(
        [
            WORKSPACE_ROOT / "SweResult" / model_id,
            WORKSPACE_ROOT / "SweResult" / str(row.get("model_dir", "")),
            REPO_ROOT / "SweResult" / model_id,
            REPO_ROOT / "SweResult" / str(row.get("model_dir", "")),
        ]
    )
    for candidate in candidates:
        if candidate.exists() and any(candidate.rglob("run_summary.json")):
            return candidate
    return None


def candidate_roots(model_dir: Path) -> list[Path]:
    candidates = [model_dir]
    if (model_dir / "full_run_tree").exists():
        candidates.insert(0, model_dir / "full_run_tree")
    for child in model_dir.iterdir() if model_dir.exists() else []:
        if child.is_dir() and child.name.startswith("full-suite"):
            candidates.insert(0, child)
            for grandchild in child.iterdir():
                if grandchild.is_dir():
                    candidates.insert(0, grandchild)
    seen = set()
    unique = []
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique.append(candidate)
    return unique


def count_summary_files(path: Path) -> int:
    return sum(1 for _ in path.rglob("run_summary.json"))


def best_result_root(model_dir: Path, expected: int = 453) -> Path:
    choices = [(candidate, count_summary_files(candidate)) for candidate in candidate_roots(model_dir)]
    choices = [item for item in choices if item[1] > 0]
    if not choices:
        return model_dir
    choices.sort(key=lambda item: (abs(item[1] - expected), -item[1], len(item[0].parts)))
    return choices[0][0]


def path_context(summary_path: Path, root: Path) -> tuple[int, str, str]:
    rel = summary_path.relative_to(root).parts
    attempt = 0
    suite = ""
    instance = ""
    for i, part in enumerate(rel):
        if part.startswith("attempt-"):
            try:
                attempt = int(part.split("-", 1)[1])
            except ValueError:
                attempt = 0
            if i + 2 < len(rel):
                suite = rel[i + 2]
            if i + 3 < len(rel):
                instance = rel[i + 3]
            break
    return attempt, suite, instance


def collect_attempts(root: Path) -> tuple[list[TaskAttempt], list[TaskAttempt]]:
    original: dict[tuple[str, int], TaskAttempt] = {}
    reverified: dict[tuple[str, int], TaskAttempt] = {}
    for summary_path in root.rglob("run_summary.json"):
        attempt, suite_from_path, instance_from_path = path_context(summary_path, root)
        data = load_json(summary_path)
        for task in data.get("tasks", []):
            meta = task.get("metadata") or {}
            task_id = task.get("task_id") or instance_from_path
            suite = suite_from_path or task.get("suite_id") or ""
            item = TaskAttempt(
                task_id=task_id,
                suite=suite,
                repo=meta.get("repo") or repo_from_suite(suite),
                attempt_index=int(task.get("attempt_index") or attempt or 0),
                solved=bool(task.get("solved")),
                verifier_verdict=str(task.get("verifier_verdict") or ""),
                wall_clock_seconds=task.get("wall_clock_seconds"),
                input_tokens=task.get("total_input_tokens"),
                output_tokens=task.get("total_output_tokens"),
                failure_mode=task.get("failure_mode"),
            )
            key = (item.task_id, item.attempt_index)
            if key not in original or item.solved:
                original[key] = item
    for summary_path in root.rglob("run_summary_reverified.json"):
        attempt, suite_from_path, instance_from_path = path_context(summary_path, root)
        data = load_json(summary_path)
        for task in data.get("tasks", []):
            meta = task.get("metadata") or {}
            task_id = task.get("task_id") or instance_from_path
            suite = suite_from_path or task.get("suite_id") or ""
            item = TaskAttempt(
                task_id=task_id,
                suite=suite,
                repo=meta.get("repo") or repo_from_suite(suite),
                attempt_index=int(task.get("attempt_index") or attempt or 0),
                solved=bool(task.get("solved")),
                verifier_verdict=str(task.get("verifier_verdict") or ""),
                wall_clock_seconds=task.get("wall_clock_seconds"),
                input_tokens=task.get("total_input_tokens"),
                output_tokens=task.get("total_output_tokens"),
                failure_mode=task.get("failure_mode"),
            )
            key = (item.task_id, item.attempt_index)
            if key not in reverified or item.solved:
                reverified[key] = item
    return (
        sorted(original.values(), key=lambda item: (item.suite, item.task_id, item.attempt_index)),
        sorted(reverified.values(), key=lambda item: (item.suite, item.task_id, item.attempt_index)),
    )


def repo_from_suite(suite: str) -> str:
    if not suite:
        return ""
    parts = suite.split("-")
    repo = "-".join(parts[3:])
    if repo == "internetarchive-openlibrary":
        return "internetarchive/openlibrary"
    if repo == "future-architect-vuls":
        return "future-architect/vuls"
    if repo == "flipt-io-flipt":
        return "flipt-io/flipt"
    if repo == "ansible-ansible":
        return "ansible/ansible"
    if repo == "navidrome-navidrome":
        return "navidrome/navidrome"
    if repo == "qutebrowser-qutebrowser":
        return "qutebrowser/qutebrowser"
    return repo.replace("-", "/", 1)


def instance_stats(attempts: list[TaskAttempt]) -> dict[str, InstanceStats]:
    stats: dict[str, InstanceStats] = {}
    for attempt in attempts:
        item = stats.setdefault(
            attempt.task_id,
            InstanceStats(task_id=attempt.task_id, suite=attempt.suite, repo=attempt.repo),
        )
        item.attempts += 1
        item.solved_attempts += int(attempt.solved)
        if attempt.verifier_verdict:
            item.verdicts[attempt.verifier_verdict] += 1
        if attempt.failure_mode:
            item.failure_modes[attempt.failure_mode] += 1
    return stats


def suite_profile(attempts: list[TaskAttempt], max_attempts: int = 3) -> list[dict[str, Any]]:
    by_suite: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "repo": "",
            "instances": set(),
            "solved_instances": set(),
            "attempts": 0,
            "solved_attempts": 0,
            "pass3": defaultdict(list),
        }
    )
    for attempt in attempts:
        if not attempt.suite:
            continue
        bucket = by_suite[attempt.suite]
        bucket["repo"] = bucket["repo"] or attempt.repo or repo_from_suite(attempt.suite)
        bucket["instances"].add(attempt.task_id)
        bucket["attempts"] += 1
        bucket["solved_attempts"] += int(attempt.solved)
        bucket["pass3"][attempt.task_id].append(attempt.solved)
        if attempt.solved:
            bucket["solved_instances"].add(attempt.task_id)

    rows = []
    for suite, bucket in by_suite.items():
        total = len(bucket["instances"])
        if not total:
            continue
        solved = len(bucket["solved_instances"])
        pass3 = sum(
            1
            for values in bucket["pass3"].values()
            if len(values) >= max_attempts and all(values[:max_attempts])
        )
        rate = round((solved / total) * 100, 1)
        repo = bucket["repo"] or repo_from_suite(suite)
        rows.append(
            {
                "suite": suite,
                "label": suite_label(suite, repo),
                "label_zh": suite_label_zh(suite, repo),
                "repo": repo,
                "total": total,
                "solved": solved,
                "rate": rate,
                "rate_pct": f"{rate:.1f}%",
                "pass3": pass3,
                "solved_attempts": bucket["solved_attempts"],
                "attempts": bucket["attempts"],
            }
        )
    return sorted(rows, key=lambda item: (-item["rate"], -item["total"], item["suite"]))


def select_suite_profile(suites: list[dict[str, Any]], limit: int = 10) -> list[dict[str, Any]]:
    strong = [suite for suite in suites if suite["solved"] > 0]
    weak = [suite for suite in suites if suite["solved"] < suite["total"]]
    selected: list[dict[str, Any]] = []
    for suite in sorted(strong, key=lambda item: (-item["rate"], -item["total"], item["suite"]))[:6]:
        selected.append(suite)
    for suite in sorted(weak, key=lambda item: (item["rate"], -item["total"], item["suite"]))[:4]:
        if suite not in selected:
            selected.append(suite)
    return selected[:limit]


def top_repos(suites: list[dict[str, Any]], reverse: bool) -> list[str]:
    scores: Counter[str] = Counter()
    for suite in suites:
        if reverse:
            scores[suite["repo"]] += suite["solved"]
        else:
            scores[suite["repo"]] += suite["total"] - suite["solved"]
    return [repo for repo, _ in scores.most_common(2)]


def phrase_join(items: list[str]) -> str:
    if not items:
        return "mixed repository work"
    if len(items) == 1:
        return items[0]
    return f"{items[0]} plus {items[1]}"


def phrase_join_zh(items: list[str]) -> str:
    if not items:
        return "混合代码库任务"
    if len(items) == 1:
        return items[0]
    return f"{items[0]}以及{items[1]}"


def reach_count(row: dict[str, Any]) -> int:
    return int(row.get("pass_at_3_count") or row.get("solved_unique_tasks") or 0)


def stable_count(row: dict[str, Any]) -> int:
    return int(row.get("pass_3_count") or 0)


def stability_ratio(row: dict[str, Any]) -> float:
    reach = reach_count(row)
    return stable_count(row) / reach if reach else 0.0


def score_delta_text(delta: float) -> str:
    if abs(delta) < 0.005:
        return "even on Final Score"
    direction = "ahead" if delta > 0 else "behind"
    return f"{abs(delta):.2f} points {direction}"


def score_delta_text_zh(delta: float) -> str:
    if abs(delta) < 0.005:
        return "最终分基本持平"
    direction = "高" if delta > 0 else "低"
    return f"最终分{direction} {abs(delta):.2f} 分"


def count_delta_text(delta: int, label: str) -> str:
    if delta == 0:
        return f"the same {label}"
    direction = "more" if delta > 0 else "fewer"
    return f"{abs(delta)} {direction} {label}"


def count_delta_text_zh(delta: int, label: str) -> str:
    if delta == 0:
        return f"{label}持平"
    direction = "多" if delta > 0 else "少"
    return f"{label}{direction} {abs(delta)} 个"


def suite_brief(suite: dict[str, Any] | None) -> str:
    if not suite:
        return "the mixed suite set"
    return f"{suite['label']} at {suite['solved']}/{suite['total']} ({suite['rate_pct']})"


def suite_brief_zh(suite: dict[str, Any] | None) -> str:
    if not suite:
        return "混合 suite"
    return f"{suite['label_zh']}，{suite['solved']}/{suite['total']}（{suite['rate_pct']}）"


def suite_shape(suite: dict[str, Any] | None) -> str:
    if not suite:
        return "mixed repository work"
    return REPO_SHAPES.get(suite["repo"], repo_display(suite["repo"]))


def suite_shape_zh(suite: dict[str, Any] | None) -> str:
    if not suite:
        return "混合代码库任务"
    return REPO_SHAPES_ZH.get(suite["repo"], repo_display_zh(suite["repo"]))


def repo_contrast(
    volume_suite: dict[str, Any] | None,
    weak_suite: dict[str, Any] | None,
    strong_shapes: list[str],
    weak_shapes: list[str],
) -> tuple[str, str]:
    strong = suite_shape(volume_suite)
    weak = suite_shape(weak_suite)
    if strong == weak:
        weak = next((shape for shape in weak_shapes if shape != strong), weak)
    if strong == weak:
        strong = phrase_join(strong_shapes)
    return strong, weak


def repo_contrast_zh(
    volume_suite: dict[str, Any] | None,
    weak_suite: dict[str, Any] | None,
    strong_shapes: list[str],
    weak_shapes: list[str],
) -> tuple[str, str]:
    strong = suite_shape_zh(volume_suite)
    weak = suite_shape_zh(weak_suite)
    if strong == weak:
        weak = next((shape for shape in weak_shapes if shape != strong), weak)
    if strong == weak:
        strong = phrase_join_zh(strong_shapes)
    return strong, weak


def text_variant(seed: str, modulo: int) -> int:
    if modulo <= 0:
        return 0
    return sum(ord(char) for char in seed) % modulo


def audit_note(row: dict[str, Any], angle: str, audit: dict[str, Any] | None = None) -> tuple[str, str]:
    name = row.get("model_name", "This row")
    if audit:
        harness_ok = int(audit.get("harness_ok") or 0)
        reverified_ok = int(audit.get("reverified_ok") or 0)
        rejected = int(audit.get("strict_rejected") or max(harness_ok - reverified_ok, 0))
        accepted_pct = int(audit.get("accepted_pct") or 0)
        delta = str(audit.get("delta") or "")
        delta_zh = str(audit.get("delta_zh") or delta)
        rejected_label = "attempt" if rejected == 1 else "attempts"
        score_clause = (
            f" with {delta} on score"
            if delta and not delta.startswith("+0.00")
            else ", while the exported score field stays flat"
        )
        score_clause_zh = (
            f"，分数变化 {delta_zh}"
            if delta_zh and not delta_zh.startswith("+0.00")
            else "，但当前导出的分数字段没有变化"
        )
        if rejected == 0:
            return (
                f"The verifier audit keeps {reverified_ok}/{harness_ok} solved attempts for {name}, so the interesting question is not score inflation; it is where the model repeatedly finds the same kind of patch.",
                f"{name} 的复核保留了 {harness_ok} 次成功中的 {reverified_ok} 次，所以重点不是分数膨胀，而是模型在哪些地方能反复找到同类补丁。",
            )
        if accepted_pct < 65:
            return (
                f"The audit changes how to read {name}: only {accepted_pct}% of initial solved attempts survive, with {rejected} rejected {rejected_label}{score_clause}. Treat the wins as leads that need stricter confirmation.",
                f"复核改变了 {name} 的读法：初始成功只有 {accepted_pct}% 保留下来，{rejected} 次被剔除{score_clause_zh}。原始胜利更适合作为线索，需要更严格确认。",
            )
        return (
            f"The audit trims {rejected} solved {rejected_label} from {name} but still keeps {accepted_pct}% of the solved set, so the suite shape remains useful even where individual wins are debatable.",
            f"复核从 {name} 中剔除了 {rejected} 次成功，但仍保留 {accepted_pct}% 的成功集合，因此即便个别胜利有争议，suite 形状仍然有参考价值。",
        )
    before = row.get("initial_solved_attempts") or row.get("solved_attempts") or 0
    after = row.get("reverified_solved_attempts")
    score_before = row.get("initial_final_score") or row.get("final_score")
    score_after = row.get("reverified_final_score")
    if after is None or score_after is None:
        if angle == "repeatable":
            return (
                f"{name} does not expose a separate strict audit block here, so repeatability across attempts is the main robustness signal.",
                f"{name} 这里没有单独严格复核块，因此三次尝试之间的可重复性就是主要稳健性信号。",
            )
        if angle in {"broad_fragile", "failure_map"}:
            return (
                f"{name} does not expose a separate strict audit block here; that makes the miss cases more important than the headline score.",
                f"{name} 这里没有单独严格复核块，因此失败案例比 headline score 更值得看。",
            )
        if angle == "shell_effect":
            return (
                f"The current export has no separate strict audit block for {name}, so the shell comparison should stay conservative.",
                f"当前导出没有 {name} 的单独严格复核块，所以 shell 对比需要保持保守。",
            )
        return (
            f"The current export has no separate strict audit block for {name}; the concrete cases below carry more of the evidence burden.",
            f"当前导出没有 {name} 的单独严格复核块；下面的具体案例会承担更多证据作用。",
        )
    rejected = max(int(before or 0) - int(after or 0), 0)
    kept_pct = (int(after or 0) / int(before or 1)) * 100 if int(before or 0) else 0
    delta = float(score_after or 0) - float(score_before or 0)
    if rejected == 0:
        return (
            f"The verifier audit keeps all {int(after or 0)} available solved attempts, so this row's story is mainly about capability shape rather than score inflation.",
            f"复核保留了当前可用的全部 {int(after or 0)} 次成功，因此这一行的重点主要是能力形状，而不是分数膨胀。",
        )
    if delta < -2:
        return (
            f"The audit is part of the story: {rejected} solved attempts drop out and the score moves {delta:+.2f} points, so use the harness wins as a map of possible fixes, not guaranteed fixes.",
            f"复核本身就是这篇画像的一部分：{rejected} 次成功被剔除，分数变化 {delta:+.2f} 分，因此原始 harness 胜利更适合作为可能修复的地图，而不是确定成功。",
        )
    if angle in {"broad_fragile", "failure_map"}:
        return (
            f"The audit keeps {kept_pct:.0f}% of the initial solved attempts. That reinforces the same point as the reach gap: this row can find patches, but not every patch is sturdy.",
            f"复核保留了初始成功的 {kept_pct:.0f}%。这和覆盖-稳定差指向同一件事：这一行能找到补丁，但不是每个补丁都足够结实。",
        )
    return (
        f"The audit removes {rejected} solved attempts but does not change the broad profile: the useful signal is still where the row is stable, not the headline rank alone.",
        f"复核剔除了 {rejected} 次成功，但没有改变整体画像：真正有用的信号仍然是它在哪些地方稳定，而不只是 headline 排名。",
    )


def closing_note(row: dict[str, Any], angle: str) -> tuple[str, str]:
    solved_attempts = int(row.get("solved_attempts") or 0)
    attempts = int(row.get("scoreable_attempts") or 453)
    reach = reach_count(row)
    pass3 = stable_count(row)
    if angle == "repeatable":
        return (
            f"Across {attempts} attempts, the important number is not only {solved_attempts} successes; it is that {pass3} tasks repeat cleanly.",
            f"在 {attempts} 次尝试里，重要的不只是 {solved_attempts} 次成功，而是有 {pass3} 道题可以稳定复现。",
        )
    if angle == "broad_fragile":
        return (
            f"The {solved_attempts}/{attempts} attempt score is best read as exploration bandwidth: {reach} tasks are reachable, but many need retry luck.",
            f"{solved_attempts}/{attempts} 的单次尝试成功数更像探索带宽：{reach} 道题能触达，但很多仍需要重试运气。",
        )
    if angle == "narrow_stable":
        return (
            f"The {solved_attempts}/{attempts} attempt score is low in absolute terms, but the stable subset is coherent enough to be worth separating from the misses.",
            f"{solved_attempts}/{attempts} 的单次尝试成功数绝对值不高，但稳定子集足够成形，值得和失败面分开看。",
        )
    if angle == "failure_map":
        return (
            f"With {solved_attempts}/{attempts} solved attempts, the page is most useful for seeing where the agent loop breaks before it becomes a dependable option.",
            f"在 {attempts} 次尝试中只成功 {solved_attempts} 次时，这页最有价值的是看 agent loop 在哪里先断掉。",
        )
    if angle == "shell_effect":
        return (
            f"The {solved_attempts}/{attempts} attempt score should be read as model plus Qoder workflow, especially when comparing it with direct Qwen rows.",
            f"{solved_attempts}/{attempts} 的单次尝试成功数应读成模型加 Qoder 工作流的结果，尤其要和直接 Qwen 行对照。",
        )
    if angle == "direct_model":
        return (
            f"The {solved_attempts}/{attempts} attempt score is useful because there is less shell behavior between the model and the verifier result.",
            f"{solved_attempts}/{attempts} 的单次尝试成功数有价值，是因为模型和 verifier 结果之间隔着的 shell 行为更少。",
        )
    return (
        f"The {solved_attempts}/{attempts} attempt score is the backdrop; the article above is about which parts of that score are repeatable enough to matter.",
        f"{solved_attempts}/{attempts} 的单次尝试成功数只是背景；上面的文章重点是哪些部分足够可重复、值得当成能力看。",
    )


def best_suites(suites: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    solved = [suite for suite in suites if suite["solved"] > 0]
    if not solved:
        return None, None
    by_volume = sorted(solved, key=lambda item: (-item["solved"], -item["rate"], -item["total"], item["suite"]))[0]
    by_rate = sorted(solved, key=lambda item: (-item["rate"], -item["solved"], -item["total"], item["suite"]))[0]
    return by_volume, by_rate


def weakest_suite(suites: list[dict[str, Any]]) -> dict[str, Any] | None:
    weak = [suite for suite in suites if suite["solved"] < suite["total"]]
    if not weak:
        return None
    return sorted(weak, key=lambda item: (item["rate"], -item["total"], item["suite"]))[0]


def nearest_peer(row: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    provider_peers = [
        other
        for other in rows
        if other is not row and other.get("provider_label") == row.get("provider_label")
    ]
    if provider_peers:
        best = sorted(provider_peers, key=lambda item: int(item.get("rank") or 999))[0]
        if int(row.get("rank") or 999) != int(best.get("rank") or 999):
            return best
        return sorted(provider_peers, key=lambda item: int(item.get("rank") or 999))[0]
    agent_peers = [
        other
        for other in rows
        if other is not row and other.get("agent_label") == row.get("agent_label")
    ]
    if agent_peers:
        return sorted(
            agent_peers,
            key=lambda item: (abs(int(item.get("rank") or 999) - int(row.get("rank") or 999)), int(item.get("rank") or 999)),
        )[0]
    return None


def stability_profile(row: dict[str, Any]) -> tuple[str, str]:
    reach = reach_count(row)
    ratio = stability_ratio(row)
    rank = int(row.get("rank") or 0)
    if reach < 25 and ratio >= 0.6:
        return (
            "narrow but repeatable",
            "覆盖窄但命中后较稳定",
        )
    if ratio >= 0.68:
        return (
            "repeatability-first",
            "稳定性优先",
        )
    if ratio <= 0.4 and reach >= 35:
        return (
            "wide but retry-sensitive",
            "覆盖不窄但依赖重试",
        )
    if rank <= 5:
        return (
            "front-runner with a balanced profile",
            "第一梯队里的均衡型",
        )
    if ratio >= 0.52:
        return (
            "moderately stable",
            "中等稳定型",
        )
    return (
        "volatile explorer",
        "探索型但波动较大",
    )


def article_angle(row: dict[str, Any]) -> str:
    reach = reach_count(row)
    ratio = stability_ratio(row)
    rank = int(row.get("rank") or 0)
    if reach < 25 and ratio >= 0.6:
        return "narrow_stable"
    if ratio >= 0.68:
        return "repeatable"
    if ratio <= 0.42 and reach >= 35:
        return "broad_fragile"
    if row.get("agent_label") == "Qoder":
        return "shell_effect"
    if row.get("agent_label") == "Qwen":
        return "direct_model"
    if rank <= 5:
        return "frontier"
    if rank >= 28:
        return "failure_map"
    return "middle_band"


def agent_context(row: dict[str, Any], ratio: float) -> tuple[str, str]:
    agent = row.get("agent_label")
    if agent == "Codex":
        if ratio >= 0.68:
            return (
                "The Codex shell is doing what it should here: fewer lucky one-offs, more repeated verifier-backed patches.",
                "Codex shell 在这里体现出的不是偶然命中，而是更多可重复的 verifier-backed patch。",
            )
        return (
            "This Codex row searches broadly, but the lower repeatability says several wins still depend on one successful trajectory.",
            "这一行 Codex 搜索面很宽，但较低的重复稳定性说明不少胜利仍依赖某一次成功轨迹。",
        )
    if agent == "OpenCode":
        return (
            "Because the agent shell is OpenCode, the result mostly exposes the underlying model's planning habits rather than a heavily opinionated workflow.",
            "因为 agent shell 是 OpenCode，这个结果更直接暴露底层模型的规划习惯，而不是强工作流包装后的表现。",
        )
    if agent == "Qoder":
        return (
            "Qoder adds more workflow structure around the model, so its stable wins should be read as model-plus-shell behavior.",
            "Qoder 给模型外面加了更强的工作流结构，因此稳定胜利更适合读成 model-plus-shell 的组合效果。",
        )
    if agent == "Qwen":
        return (
            "The Qwen CLI setup is closer to a direct model readout: when it misses, the miss is less hidden behind orchestration.",
            "Qwen CLI 更接近直接读模型本身：它失败时，失败也较少被编排层遮住。",
        )
    if agent == "Claude Code":
        return (
            "Claude Code gives this row a different orchestration profile from OpenCode and Qoder, which is useful when comparing the same model family across shells.",
            "Claude Code 让这一行有别于 OpenCode 和 Qoder 的编排形态，适合观察同类模型跨 shell 的差异。",
        )
    if agent == "deepseek-tui":
        return (
            "The deepseek-tui result is partly a shell-integration test; the low coverage matters as much as the model score itself.",
            "deepseek-tui 结果有一部分是在测试 shell 集成；低覆盖本身和模型分数一样值得注意。",
        )
    return (
        "This row should be read as the behavior of the model inside its specific coding-agent shell.",
        "这一行应读作该模型在特定 coding-agent shell 里的行为。",
    )


def narrative(
    row: dict[str, Any],
    suites: list[dict[str, Any]],
    board_rows: list[dict[str, Any]],
    audit: dict[str, Any] | None = None,
) -> dict[str, str]:
    strong_repos = top_repos(suites, reverse=True)
    weak_repos = top_repos(suites, reverse=False)
    strong_shapes = [REPO_SHAPES.get(repo, repo_display(repo)) for repo in strong_repos]
    weak_shapes = [REPO_SHAPES.get(repo, repo_display(repo)) for repo in weak_repos]
    strong_shapes_zh = [REPO_SHAPES_ZH.get(repo, repo_display_zh(repo)) for repo in strong_repos]
    weak_shapes_zh = [REPO_SHAPES_ZH.get(repo, repo_display_zh(repo)) for repo in weak_repos]
    score = float(row.get("final_score") or 0)
    rank = int(row.get("rank") or 0)
    pass3 = stable_count(row)
    reach = reach_count(row)
    ratio = stability_ratio(row)
    attempt_pct = pct(row.get("attempt_score"))
    stable_gap = reach - pass3
    profile_en, profile_zh = stability_profile(row)
    angle = article_angle(row)
    agent_note_en, agent_note_zh = agent_context(row, ratio)
    volume_suite, rate_suite = best_suites(suites)
    weak_suite = weakest_suite(suites)
    peer = nearest_peer(row, board_rows)
    strong_use, weak_use = repo_contrast(volume_suite, weak_suite, strong_shapes, weak_shapes)
    strong_use_zh, weak_use_zh = repo_contrast_zh(volume_suite, weak_suite, strong_shapes_zh, weak_shapes_zh)
    audit_after = row.get("reverified_final_score")
    audit_before = row.get("initial_final_score") or row.get("final_score")
    audit_delta = (
        float(audit_after) - float(audit_before)
        if audit_after is not None and audit_before is not None
        else None
    )
    audit_hint_en = ""
    audit_hint_zh = ""
    if audit_delta is not None and audit_delta < -2:
        audit_hint_en = (
            f" The stricter audit trims {abs(audit_delta):.2f} points from the headline score, "
            "so the page should treat some harness wins as provisional."
        )
        audit_hint_zh = (
            f" 更严格复核让 headline score 下降 {abs(audit_delta):.2f} 分，"
            "所以这页会把一部分 harness 胜利视为待确认结果。"
        )
    elif audit_delta is not None and abs(audit_delta) <= 0.05:
        audit_hint_en = " The audit does not move the score, which makes the headline pattern easier to trust."
        audit_hint_zh = " 复核没有移动分数，因此 headline pattern 更容易被信任。"

    if rank <= 5:
        tier_en = "a top-tier result"
        tier_zh = "第一梯队结果"
    elif rank <= 15:
        tier_en = "a competitive mid-table result"
        tier_zh = "有竞争力的中游结果"
    else:
        tier_en = "a lower-table result with a few useful bright spots"
        tier_zh = "排名靠后但仍有局部亮点的结果"

    if rank > 15:
        subtitle = (
            f"{tier_en.capitalize()}: {reach}/151 tasks solved at least once, "
            f"{pass3}/151 solved in all three attempts, with the clearest wins around "
            f"{phrase_join(strong_shapes)}."
        )
    else:
        subtitle = (
            f"{tier_en.capitalize()} with {reach}/151 tasks solved at least once and "
            f"{pass3}/151 solved in all three attempts; strongest around "
            f"{phrase_join(strong_shapes)}."
        )
    subtitle_zh = (
        f"这是一个{tier_zh}：151 题中至少一次解出 {reach} 题，三次都解出 {pass3} 题；"
        f"强项主要落在{phrase_join_zh(strong_shapes_zh)}。"
    )

    if reach < 25 and ratio >= 0.6:
        opening_en = (
            f"{row['model_name']} is a {profile_en} result. It reaches only {reach}/151 tasks, "
            f"but {pass3} of those are stable 3/3 solves, so the successes are less random than the rank suggests."
        )
        opening_zh = (
            f"{row['model_name']} 更像一个{profile_zh}的结果。它只覆盖到 {reach}/151 题，"
            f"但其中 {pass3} 题是 3/3 稳定通过，所以成功并不完全是偶然命中。"
        )
    elif ratio >= 0.68:
        opening_en = (
            f"{row['model_name']} stands out for repeatability. The reach number is {reach}/151, "
            f"and {pass3} tasks survive all three attempts, giving it a {ratio:.0%} repeatability ratio among reached tasks."
        )
        opening_zh = (
            f"{row['model_name']} 最突出的地方是重复稳定性。它至少一次解出 {reach}/151 题，"
            f"其中 {pass3} 题三次都过，在已触达题目里的稳定比例约为 {ratio:.0%}。"
        )
    elif ratio <= 0.42 and reach >= 35:
        opening_en = (
            f"{row['model_name']} is broad but volatile. It can touch {reach}/151 tasks, "
            f"yet only {pass3} become 3/3 solves, so much of its value comes from retrying the same benchmark surface."
        )
        opening_zh = (
            f"{row['model_name']} 的特点是覆盖不窄但波动较大。它能至少一次摸到 {reach}/151 题，"
            f"但只有 {pass3} 题能做到 3/3，因此很大一部分价值来自重试。"
        )
    elif rank <= 5:
        opening_en = (
            f"{row['model_name']} belongs in the leading cluster because it keeps both breadth and stability in play: "
            f"{reach} reached tasks, {pass3} stable solves, and a {score:.2f} Final Score."
        )
        opening_zh = (
            f"{row['model_name']} 能进入第一梯队，是因为覆盖和稳定性都没有掉队："
            f"至少一次解出 {reach} 题，稳定解出 {pass3} 题，Final Score {score:.2f}。"
        )
    else:
        opening_en = (
            f"{row['model_name']} is a {profile_en} row around the #{rank} slot. "
            f"The useful reading is not just the {score:.2f} score, but the split between {reach} reached tasks and {pass3} stable solves."
        )
        opening_zh = (
            f"{row['model_name']} 是一个排名 #{rank} 附近的{profile_zh}结果。"
            f"它的重点不只是 {score:.2f} 分，而是 {reach} 道触达题和 {pass3} 道稳定题之间的差距。"
        )

    if peer:
        peer_delta = score - float(peer.get("final_score") or 0)
        reach_delta = reach - reach_count(peer)
        pass3_delta = pass3 - stable_count(peer)
        comparison_en = (
            f"The closest family reference is {peer['model_name']} at rank #{peer['rank']}. "
            f"Compared with that row, this one is {score_delta_text(peer_delta)}, with "
            f"{count_delta_text(reach_delta, 'reached tasks')} and {count_delta_text(pass3_delta, 'stable solves')}."
        )
        comparison_zh = (
            f"最接近的同系参照是排名 #{peer['rank']} 的 {peer['model_name']}。"
            f"和它相比，这一行{score_delta_text_zh(peer_delta)}，"
            f"{count_delta_text_zh(reach_delta, '触达题')}，{count_delta_text_zh(pass3_delta, '稳定题')}。"
        )
    else:
        comparison_en = (
            f"With no close provider sibling on this board, the more useful comparison is against the neighboring ranks: "
            f"the row is defined by {attempt_pct} attempt-level accuracy rather than a single standout suite."
        )
        comparison_zh = (
            f"这个 provider 在榜单上没有特别近的同系兄弟，因此更适合和相邻排名比较："
            f"这一行的基本面是 {attempt_pct} 的单次尝试成功率，而不是某一个 suite 的孤立爆发。"
        )
    comparison_en += audit_hint_en
    comparison_zh += audit_hint_zh

    variant = text_variant(row["id"], 3)
    if volume_suite and rate_suite and volume_suite["suite"] != rate_suite["suite"]:
        suite_variants = [
            (
                f"The volume win is {suite_brief(volume_suite)}, while the cleanest pass-rate spike is {suite_brief(rate_suite)}. "
                f"The warning label is {suite_brief(weak_suite)}, so the contrast is not generic strength versus weakness; "
                f"it is {strong_use} holding together better than {weak_use} on this run.",
                f"从数量看，主要胜利来自{suite_brief_zh(volume_suite)}；从通过率看，最干净的高点是{suite_brief_zh(rate_suite)}。"
                f"需要警惕的是{suite_brief_zh(weak_suite)}，所以这里不是泛泛地说强弱项，"
                f"而是{strong_use_zh}在这次运行中比{weak_use_zh}更能闭环。",
            ),
            (
                f"The suite split is asymmetric: {suite_brief(volume_suite)} supplies the main body of wins, "
                f"{suite_brief(rate_suite)} supplies the clean spike, and {suite_brief(weak_suite)} is where that pattern stops.",
                f"suite 分布是不对称的：{suite_brief_zh(volume_suite)}贡献主要胜利，"
                f"{suite_brief_zh(rate_suite)}贡献最干净高点，而{suite_brief_zh(weak_suite)}标出这种模式停止的地方。",
            ),
            (
                f"The result is easiest to understand as a three-point shape: volume at {suite_brief(volume_suite)}, "
                f"efficiency at {suite_brief(rate_suite)}, and resistance at {suite_brief(weak_suite)}.",
                f"这个结果最容易读成三点形状：数量在{suite_brief_zh(volume_suite)}，"
                f"效率在{suite_brief_zh(rate_suite)}，阻力在{suite_brief_zh(weak_suite)}。",
            ),
        ]
        suite_read_en, suite_read_zh = suite_variants[variant]
    else:
        suite_variants = [
            (
                f"The same suite carries both the volume and rate signal: {suite_brief(volume_suite)}. "
                f"The main counterexample is {suite_brief(weak_suite)}, where the model-agent pair stops looking reliable; "
                f"this makes the row look specialized rather than uniformly strong.",
                f"这一行的数量信号和通过率信号基本集中在同一个 suite：{suite_brief_zh(volume_suite)}。"
                f"主要反例是{suite_brief_zh(weak_suite)}，这里模型-agent 组合开始显得不可靠；"
                f"这让它更像专门型，而不是全局强。",
            ),
            (
                f"The profile has one obvious anchor: {suite_brief(volume_suite)}. "
                f"That anchor matters because {suite_brief(weak_suite)} shows the score does not generalize evenly across the benchmark.",
                f"这组画像有一个明显锚点：{suite_brief_zh(volume_suite)}。"
                f"这个锚点重要，是因为{suite_brief_zh(weak_suite)}说明分数没有均匀迁移到整套 benchmark。",
            ),
            (
                f"Most of the positive signal concentrates in {suite_brief(volume_suite)}. "
                f"The opposing read is {suite_brief(weak_suite)}, which keeps the row from looking like a generalist.",
                f"正面信号大多集中在{suite_brief_zh(volume_suite)}。"
                f"反向读法是{suite_brief_zh(weak_suite)}，它让这一行看起来不像通用型。",
            ),
        ]
        suite_read_en, suite_read_zh = suite_variants[variant]

    if angle == "repeatable":
        usage_en = (
            f"If you are choosing it for production-style agent work, the argument is consistency: "
            f"start with tasks that resemble {suite_brief(volume_suite)} and expect fewer lucky-only wins. "
            f"The caution is {suite_brief(weak_suite)}, where even this stable profile does not transfer cleanly."
        )
        usage_zh = (
            f"如果把它用于偏生产的 agent 工作，核心理由是稳定性："
            f"优先放在接近{suite_brief_zh(volume_suite)}的任务上，不要只期待偶然命中。"
            f"需要避开的参照是{suite_brief_zh(weak_suite)}，这里即使稳定型画像也不能顺利迁移。"
        )
    elif angle == "broad_fragile":
        usage_en = (
            f"Use it when breadth matters more than deterministic replay. "
            f"It can find openings around {suite_brief(volume_suite)}, but the {stable_gap}-task reach gap says a second or third run may tell a different story."
        )
        usage_zh = (
            f"当你更看重覆盖面而不是确定复现时，它更合适。"
            f"它能在{suite_brief_zh(volume_suite)}附近找到入口，但 {stable_gap} 题的覆盖-稳定差说明第二、第三次运行可能给出不同结果。"
        )
    elif angle == "narrow_stable":
        usage_en = (
            f"Treat it as a narrow specialist. The wins around {suite_brief(volume_suite)} are real, "
            f"but the page does not support extrapolating that behavior into {suite_brief(weak_suite)}."
        )
        usage_zh = (
            f"更适合把它当窄域专门型。{suite_brief_zh(volume_suite)}附近的胜利是真实的，"
            f"但这页并不支持把这种行为外推到{suite_brief_zh(weak_suite)}。"
        )
    elif angle == "failure_map":
        usage_en = (
            f"This row is more useful as a failure map than as a default choice. "
            f"Look at {suite_brief(weak_suite)} first: it shows the task shape where the loop loses traction."
        )
        usage_zh = (
            f"这一行更适合作为失败地图，而不是默认选择。"
            f"先看{suite_brief_zh(weak_suite)}：它展示了模型-agent 循环最容易失去抓手的任务形态。"
        )
    elif angle == "shell_effect":
        usage_en = (
            f"For Qoder-style use, the interesting part is how the shell converts model guesses into patches. "
            f"Compare {suite_brief(volume_suite)} with {suite_brief(weak_suite)} before attributing the result to the base model alone."
        )
        usage_zh = (
            f"对 Qoder-style 使用来说，重点是 shell 如何把模型猜测压成补丁。"
            f"在把结果完全归因到底座模型之前，应先对照{suite_brief_zh(volume_suite)}和{suite_brief_zh(weak_suite)}。"
        )
    elif angle == "direct_model":
        usage_en = (
            f"As a direct CLI row, it is most valuable for reading the model itself: "
            f"{suite_brief(volume_suite)} is the positive sample, and {suite_brief(weak_suite)} is the boundary."
        )
        usage_zh = (
            f"作为直接 CLI 行，它最有价值的是读模型本身："
            f"{suite_brief_zh(volume_suite)}是正面样本，{suite_brief_zh(weak_suite)}是边界。"
        )
    else:
        usage_en = (
            f"In practice, read it through the gap between {suite_brief(volume_suite)} and {suite_brief(weak_suite)}. "
            f"That gap is more actionable than the rank because it says which repo shape gets coherent patches."
        )
        usage_zh = (
            f"实际选择时，更应该通过{suite_brief_zh(volume_suite)}和{suite_brief_zh(weak_suite)}之间的落差来读它。"
            f"这个落差比分数排名更可操作，因为它说明哪类代码库更容易得到连贯补丁。"
        )

    if angle == "repeatable":
        chart_read_en = (
            f"The chart matters here because it separates repeatable skill from accidental reach. "
            f"{suite_brief(volume_suite)} is not just a high bar; it is the area where this row most often turns a found fix into a repeatable one."
        )
        chart_read_zh = (
            f"这里看图的重点不是谁最高，而是区分“稳定能力”和“偶然触达”。"
            f"{suite_brief_zh(volume_suite)} 不只是高柱子，它也是这一行最容易把解法变成稳定补丁的区域。"
        )
    elif angle == "broad_fragile":
        broad_reads = [
            (
                f"The important visual cue is the gap between high-reach suites and low Pass^3 counts. "
                f"This model can often locate the neighborhood of the fix, but many patches do not survive three independent runs.",
                f"这张图最重要的信号，是高触达 suite 和较低 Pass^3 之间的落差。"
                f"模型经常能找到修复附近的位置，但很多补丁不能在三次独立运行中稳定复现。",
            ),
            (
                f"Read the bars as a volatility chart: {suite_brief(volume_suite)} shows the upside, "
                f"while the Pass^3 gap explains why the same row can feel much weaker on a single rerun.",
                f"这张图更像波动率图：{suite_brief_zh(volume_suite)}展示上限，"
                f"而 Pass^3 落差解释了为什么单次重跑会显得弱很多。",
            ),
            (
                f"The bars say this row has search reach, not settled mastery. "
                f"The model gets into the right repos often enough, but the repeatability line is still thin.",
                f"这些柱子说明这一行有搜索触达，不等于已经掌握。"
                f"模型经常能进入正确代码库，但可重复通过的线仍然偏细。",
            ),
        ]
        chart_read_en, chart_read_zh = broad_reads[variant]
    elif angle == "narrow_stable":
        chart_read_en = (
            f"Read the bars as a small island map. There are not many islands, but the ones that appear are less noisy than the rank alone suggests."
        )
        chart_read_zh = (
            f"这张图更像一张小岛地图：岛不多，但出现的那些并不只是随机噪声，不能只按低排名理解。"
        )
    elif angle == "shell_effect":
        shell_reads = [
            (
                f"The Qoder shell tends to turn some model guesses into more disciplined patch attempts. "
                f"That is why the suite profile should be compared with direct Qwen/OpenCode rows, not read as pure model capability.",
                f"Qoder shell 往往会把部分模型猜测压成更规整的补丁尝试。"
                f"所以这张 suite 图更适合和 Qwen CLI / OpenCode 行对照，而不是当作纯模型能力。",
            ),
            (
                f"The bars are a tooling story as much as a model story: Qoder helps on structured repair loops, "
                f"but the weak suite still shows where orchestration cannot rescue the patch.",
                f"这些柱子既是模型故事，也是工具故事：Qoder 能帮助结构化修复循环，"
                f"但弱 suite 仍说明哪些地方不是编排层能救回来的。",
            ),
            (
                f"This chart is best read beside the direct Qwen rows. The question is where Qoder turns a reachable idea into a passing patch.",
                f"这张图最好和直接 Qwen 行并排读：关键问题是 Qoder 在哪里能把可触达想法变成可通过补丁。",
            ),
        ]
        chart_read_en, chart_read_zh = shell_reads[variant]
    elif angle == "direct_model":
        chart_read_en = (
            f"Because this is the Qwen CLI row, the suite shape is unusually direct: strong and weak bars are closer to model behavior than to shell behavior."
        )
        chart_read_zh = (
            f"因为这是 Qwen CLI 行，suite 形状相对直接：高低柱更接近模型本身，而不是 shell 工作流的效果。"
        )
    elif angle == "failure_map":
        failure_reads = [
            (
                f"At this end of the table, the weak bars are more informative than the wins. "
                f"They show which task families break first when the model-agent loop runs out of reliable planning.",
                f"在榜单后段，低柱子往往比胜利更有信息量。"
                f"它们说明模型-agent 循环在哪些任务家族上最先失去可靠规划。",
            ),
            (
                f"Here the chart is mostly a boundary marker. The few nonzero bars tell you where to try it; the zero bars tell you where not to spend budget.",
                f"这里的图主要是边界标记。少数非零柱告诉你哪里可以试，零柱则告诉你哪里不该继续花预算。",
            ),
            (
                f"Do not read the chart as a small version of the top rows. It is a map of early failure surfaces with a few recoverable pockets.",
                f"不要把这张图读成头部模型的小号版本。它更像早期失败面的地图，中间夹着少数可恢复区域。",
            ),
        ]
        chart_read_en, chart_read_zh = failure_reads[variant]
    elif angle == "frontier":
        frontier_reads = [
            (
                f"Top-five rows are separated by texture rather than a single number. "
                f"Here the suite profile shows whether the score comes from broad reach, repeatable solves, or one unusually favorable repository family.",
                f"前五名之间的区别往往不是单个分数，而是能力质感。"
                f"这里的 suite 图用来判断分数来自广覆盖、稳定解题，还是某个特别友好的代码库。",
            ),
            (
                f"At the front of the board, the chart is a fingerprint. The score is close to peers, so the repo distribution says more than the rank delta.",
                f"在榜单前排，这张图更像指纹。分数和相邻模型很接近，因此代码库分布比分差更说明问题。",
            ),
            (
                f"The suite profile explains why this top-row score feels different from nearby rows: it shows whether the model wins by depth, breadth, or repository fit.",
                f"suite 画像解释了为什么这一行的头部分数和邻近模型质感不同：它显示模型是靠深度、广度，还是代码库适配取胜。",
            ),
        ]
        chart_read_en, chart_read_zh = frontier_reads[variant]
    else:
        middle_reads = [
            (
                f"This is a middle-band profile: the useful signal is the slope between {suite_brief(volume_suite)} and {suite_brief(weak_suite)}.",
                f"这是一个中段模型画像：真正有用的信号，是{suite_brief_zh(volume_suite)}到{suite_brief_zh(weak_suite)}之间的落差。",
            ),
            (
                f"The chart is not trying to crown a single strength; it shows how quickly the row falls from {suite_brief(volume_suite)} to {suite_brief(weak_suite)}.",
                f"这张图不是为了给单一强项加冕，而是展示这一行从{suite_brief_zh(volume_suite)}滑到{suite_brief_zh(weak_suite)}有多快。",
            ),
            (
                f"For this row, the suite bars are a contrast tool. The distance between {suite_brief(volume_suite)} and {suite_brief(weak_suite)} is the model's practical boundary.",
                f"对这一行来说，suite 柱更像对比工具。{suite_brief_zh(volume_suite)}和{suite_brief_zh(weak_suite)}之间的距离，就是模型的实用边界。",
            ),
        ]
        chart_read_en, chart_read_zh = middle_reads[variant]

    case_read_en = (
        "The four examples below are deliberately mixed: a stable win, a retry-sensitive task, a one-shot reach, and a hard miss when the run has them. "
        "They are not meant to prove the score; they show what the score feels like at task level."
    )
    case_read_zh = (
        "下面四个例子故意混合了稳定胜利、依赖重试、一次命中和硬失误。"
        "它们不是用来证明分数，而是让分数在具体题目层面变得可感。"
    )
    audit_read_en, audit_read_zh = audit_note(row, angle, audit)
    closing_en, closing_zh = closing_note(row, angle)

    tldr = [
        (
            f"{row['model_name']} is best read as {profile_en}: rank #{rank}, {reach} reached tasks, {pass3} stable solves.",
            f"{row['model_name']} 更适合读成{profile_zh}：排名 #{rank}，触达 {reach} 题，稳定解出 {pass3} 题。",
        ),
        (
            f"Best suite signal: {suite_brief(volume_suite)}.",
            f"最强 suite 信号：{suite_brief_zh(volume_suite)}。",
        ),
        (
            f"Weakest visible area: {suite_brief(weak_suite)}.",
            f"最弱可见区域：{suite_brief_zh(weak_suite)}。",
        ),
        (
            f"{agent_note_en}",
            f"{agent_note_zh}",
        ),
    ]
    key_stats = [
        {
            "label": "Final Score",
            "label_zh": "最终分",
            "value": f"{score:.2f}",
            "note": f"rank #{rank} of {len(board_rows)}",
            "note_zh": f"{len(board_rows)} 个模型中排名 #{rank}",
        },
        {
            "label": "Stable solves",
            "label_zh": "稳定解题",
            "value": str(pass3),
            "note": "tasks solved in all 3 attempts",
            "note_zh": "三次尝试都解出的任务",
        },
        {
            "label": "Reach gap",
            "label_zh": "覆盖-稳定差",
            "value": f"+{stable_gap}",
            "note": "Pass@3 tasks minus Pass^3 tasks",
            "note_zh": "至少一次成功的题数减三次都成功的题数",
        },
        {
            "label": "Attempt score",
            "label_zh": "单次尝试",
            "value": attempt_pct,
            "note": f"{row.get('solved_attempts', 0)}/{row.get('scoreable_attempts', 453)} solved attempts",
            "note_zh": f"{row.get('scoreable_attempts', 453)} 次尝试中成功 {row.get('solved_attempts', 0)} 次",
        },
    ]
    return {
        "subtitle": subtitle,
        "subtitle_zh": subtitle_zh,
        "tldr": tldr,
        "key_stats": key_stats,
        "strong_shapes": phrase_join(strong_shapes),
        "weak_shapes": phrase_join(weak_shapes),
        "strong_shapes_zh": phrase_join_zh(strong_shapes_zh),
        "weak_shapes_zh": phrase_join_zh(weak_shapes_zh),
        "agent_note_en": agent_note_en,
        "agent_note_zh": agent_note_zh,
        "opening_en": opening_en,
        "opening_zh": opening_zh,
        "comparison_en": comparison_en,
        "comparison_zh": comparison_zh,
        "suite_read_en": suite_read_en,
        "suite_read_zh": suite_read_zh,
        "usage_en": usage_en,
        "usage_zh": usage_zh,
        "profile_en": profile_en,
        "profile_zh": profile_zh,
        "angle": angle,
        "chart_read_en": chart_read_en,
        "chart_read_zh": chart_read_zh,
        "case_read_en": case_read_en,
        "case_read_zh": case_read_zh,
        "audit_read_en": audit_read_en,
        "audit_read_zh": audit_read_zh,
        "closing_en": closing_en,
        "closing_zh": closing_zh,
    }


def stable_offset(seed: str, length: int) -> int:
    if length <= 0:
        return 0
    return sum(ord(ch) for ch in seed) % length


def pick_seeded(items: list[InstanceStats], seed: str, sort_key) -> InstanceStats | None:
    if not items:
        return None
    ordered = sorted(items, key=sort_key)
    return ordered[stable_offset(seed, len(ordered))]


def select_cases(
    stats: dict[str, InstanceStats],
    tasks: dict[str, dict[str, Any]],
    model_id: str = "",
) -> list[dict[str, str]]:
    values = list(stats.values())
    stable = [item for item in values if item.pass3]
    one_off = [item for item in values if item.solved_attempts == 1 and item.attempts >= 3]
    misses = [item for item in values if item.solved_attempts == 0 and item.attempts >= 3]
    partial = [item for item in values if 1 < item.solved_attempts < 3 and item.attempts >= 3]

    def sort_key(item: InstanceStats) -> tuple:
        task = tasks.get(item.task_id, {})
        return (item.repo, task.get("title_en") or item.task_id)

    picked: list[tuple[str, str, InstanceStats]] = []
    seeded_groups = [
        ("Stable win", "win", stable, f"{model_id}:stable"),
        ("Retry-sensitive", "neutral", partial, f"{model_id}:partial"),
        ("One-shot reach", "neutral", one_off, f"{model_id}:oneoff"),
        ("Hard miss", "risk", misses, f"{model_id}:miss"),
    ]
    for label, tone, group, seed in seeded_groups:
        item = pick_seeded(group, seed, sort_key)
        if item and all(existing.task_id != item.task_id for _, _, existing in picked):
            picked.append((label, tone, item))
    if len(picked) < 4:
        fallback = sorted(values, key=lambda x: (-x.solved_attempts, x.repo, x.task_id))
        offset = stable_offset(f"{model_id}:fallback", len(fallback))
        fallback = fallback[offset:] + fallback[:offset]
        for item in fallback:
            if all(existing.task_id != item.task_id for _, _, existing in picked):
                tone = "win" if item.solved_once else "risk"
                label = "Example win" if item.solved_once else "Example miss"
                picked.append((label, tone, item))
            if len(picked) >= 4:
                break

    label_zh = {
        "Stable win": "稳定胜利",
        "Retry-sensitive": "依赖重试",
        "One-shot reach": "一次命中",
        "Hard miss": "硬失误",
        "Example win": "成功案例",
        "Example miss": "失败案例",
    }
    cases = []
    for label, tone, item in picked[:4]:
        task = tasks.get(item.task_id, {})
        title_en = readable_case_title(task, item, "en")
        title_zh = readable_case_title(task, item, "zh")
        verdict = item.verdicts.most_common(1)[0][0] if item.verdicts else "mixed"
        cases.append(
            {
                "label": label,
                "label_zh": label_zh.get(label, label),
                "tone": tone,
                "title": title_en,
                "title_zh": title_zh,
                "meta": f"{item.repo} · solved {item.solved_attempts}/{item.attempts}",
                "meta_zh": f"{item.repo} · {item.attempts} 次中成功 {item.solved_attempts} 次",
                "note": f"Verifier pattern: {verdict}. Suite: {item.suite}.",
                "note_zh": f"Verifier 信号：{verdict}。Suite：{item.suite}。",
            }
        )
    return cases


def audit_summary(row: dict[str, Any], original: list[TaskAttempt], reverified: list[TaskAttempt]) -> dict[str, Any] | None:
    if not reverified:
        return None
    harness_ok = int(row.get("solved_attempts") or 0) or sum(1 for attempt in original if attempt.solved)
    re_ok = sum(1 for attempt in reverified if attempt.solved)
    if re_ok > harness_ok:
        harness_ok = re_ok
    rejected = max(harness_ok - re_ok, 0)
    accepted_pct = min(100, round((re_ok / harness_ok) * 100)) if harness_ok else 0
    rejected_pct = max(0, 100 - accepted_pct)
    score_before = row.get("initial_final_score") or row.get("final_score")
    score_after = row.get("reverified_final_score")
    if score_after is None:
        score_after = row.get("final_score")
    delta = float(score_after or 0) - float(score_before or 0)
    return {
        "harness_ok": harness_ok,
        "reverified_ok": re_ok,
        "strict_rejected": rejected,
        "accepted_pct": accepted_pct,
        "rejected_pct": rejected_pct,
        "score_before": f"{float(score_before or 0):.2f}",
        "score_after": f"{float(score_after or 0):.2f}",
        "delta": f"{delta:+.2f} points",
        "delta_zh": f"{delta:+.2f} 分",
        "note": "Original harness result vs verifier-backed audit sample",
        "note_zh": "原始 harness 结果 vs verifier-backed 复核样本",
        "summary": (
            f"The available audit keeps {re_ok} of {harness_ok} initial solved attempts. "
            "Read this as a robustness check, especially when the audit sample is smaller than 453 attempts."
        ),
        "summary_zh": (
            f"当前可用复核保留了 {harness_ok} 次初始成功中的 {re_ok} 次。"
            "这更适合作为稳健性检查，特别是在复核样本小于 453 次尝试时。"
        ),
    }


def case_story(cases: list[dict[str, str]], angle: str) -> tuple[str, str]:
    if not cases:
        return (
            "The examples are intentionally sparse because this row did not expose enough per-task evidence in the current export.",
            "当前导出的逐题证据不够完整，所以这里的案例会保持克制。",
        )
    by_label = {case["label"]: case for case in cases}
    stable = by_label.get("Stable win") or next((case for case in cases if case.get("tone") == "win"), cases[0])
    partial = by_label.get("Retry-sensitive") or by_label.get("One-shot reach")
    miss = by_label.get("Hard miss") or next((case for case in cases if case.get("tone") == "risk"), None)

    stable_title = stable["title"]
    stable_title_zh = stable.get("title_zh") or stable_title
    stable_meta = stable.get("meta", "")
    stable_meta_zh = stable.get("meta_zh", stable_meta)
    partial_title = partial["title"] if partial else stable_title
    partial_title_zh = (partial.get("title_zh") if partial else stable_title_zh) or partial_title
    partial_meta = partial.get("meta", "") if partial else stable_meta
    partial_meta_zh = partial.get("meta_zh", partial_meta) if partial else stable_meta_zh
    miss_title = miss["title"] if miss else partial_title
    miss_title_zh = (miss.get("title_zh") if miss else partial_title_zh) or miss_title
    miss_meta = miss.get("meta", "") if miss else partial_meta
    miss_meta_zh = miss.get("meta_zh", miss_meta) if miss else partial_meta_zh

    if angle == "repeatable":
        return (
            f"The examples reinforce the repeatability story: `{stable_title}` is {stable_meta}, while `{partial_title}` shows the kind of task that still needs retry luck.",
            f"案例进一步说明了稳定性：`{stable_title_zh}` 是{stable_meta_zh}，而 `{partial_title_zh}` 则代表仍然需要重试运气的任务。",
        )
    if angle == "broad_fragile":
        return (
            f"The useful contrast is between `{stable_title}` ({stable_meta}) and `{partial_title}` ({partial_meta}). The model reaches both kinds of problems, but only one becomes dependable.",
            f"最有用的对比是 `{stable_title_zh}`（{stable_meta_zh}）和 `{partial_title_zh}`（{partial_meta_zh}）：模型都能触达，但只有前者变成可靠结果。",
        )
    if angle == "narrow_stable":
        return (
            f"The case strip is small but revealing: `{stable_title}` is the kind of island this row can hold, while `{miss_title}` ({miss_meta}) marks where the island ends.",
            f"案例条虽然窄，但很有信息量：`{stable_title_zh}` 是这一行守得住的小岛，而 `{miss_title_zh}`（{miss_meta_zh}）标出了边界。",
        )
    if angle == "shell_effect":
        return (
            f"Look at `{stable_title}` and `{partial_title}` as shell-behavior examples. The difference is not only model knowledge; it is whether the workflow keeps the patch disciplined enough to pass.",
            f"可以把 `{stable_title_zh}` 和 `{partial_title_zh}` 当成 shell 行为样本：差异不只是模型懂不懂，也在于工作流能否把补丁约束到可通过状态。",
        )
    if angle == "direct_model":
        return (
            f"`{stable_title}` is the clean read of what the model can do directly; `{miss_title}` is the corresponding negative read, with less agent machinery to hide the miss.",
            f"`{stable_title_zh}` 是模型直接能力的正面样本；`{miss_title_zh}` 是相应的反面样本，中间没有太多 agent 编排可以掩盖失败。",
        )
    if angle == "failure_map":
        return (
            f"At this rank, `{miss_title}` matters as much as the wins. It shows the task shape where the model-agent loop fails before it can produce a meaningful verifier-backed patch.",
            f"在这个排名段，`{miss_title_zh}` 和成功案例一样重要。它说明模型-agent 循环在哪种任务形态上还没形成有效 verifier-backed patch。",
        )
    if angle == "frontier":
        return (
            f"The cases are useful because top rows can look similar in aggregate. `{stable_title}` shows the reliable core; `{partial_title}` shows the remaining edge of variance.",
            f"前排模型在总分上容易看起来相似，所以案例很关键：`{stable_title_zh}` 展示可靠核心，`{partial_title_zh}` 展示剩余波动边界。",
        )
    return (
        f"The examples keep the middle-band story honest: `{stable_title}` is the upside, `{miss_title}` is the failure surface, and the page should be read between those two poles.",
        f"这些案例让中段模型画像更具体：`{stable_title_zh}` 是上限，`{miss_title_zh}` 是失败面，这页应该在两者之间读。",
    )


def related_models(row: dict[str, Any], rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    idx = rows.index(row)
    candidates = []
    if idx > 0:
        candidates.append(("One rank above", "上一名", rows[idx - 1]))
    if idx + 1 < len(rows):
        candidates.append(("One rank below", "下一名", rows[idx + 1]))
    same_provider = next(
        (
            other
            for other in rows
            if other is not row and other.get("provider_label") == row.get("provider_label")
        ),
        None,
    )
    if same_provider:
        candidates.append(("Same provider", "同 provider", same_provider))
    same_agent = next(
        (
            other
            for other in rows
            if other is not row and other.get("agent_label") == row.get("agent_label")
        ),
        None,
    )
    if same_agent and all(item[2] is not same_agent for item in candidates):
        candidates.append(("Same agent", "同 agent", same_agent))
    seen = set()
    cards = []
    for label, label_zh, other in candidates:
        if other["id"] in seen:
            continue
        seen.add(other["id"])
        cards.append(
            {
                "label": label,
                "label_zh": label_zh,
                "name": other["model_name"],
                "note": f"Rank #{other['rank']} · {float(other.get('final_score') or 0):.2f} Final Score",
                "note_zh": f"排名 #{other['rank']} · Final Score {float(other.get('final_score') or 0):.2f}",
                "url": f"/code-agent-bench/models/{other['id']}/",
            }
        )
        if len(cards) >= 3:
            break
    return cards


def write_frontmatter(
    row: dict[str, Any],
    suites: list[dict[str, Any]],
    cases: list[dict[str, str]],
    audit: dict[str, Any] | None,
    related: list[dict[str, str]],
    story: dict[str, Any],
    result_root: Path | None,
) -> str:
    lines = [
        "---",
        "layout: model",
        f"model_id: {row['id']}",
        f"title: {scalar(row['model_name'] + ' on CodeAgentBench')}",
        f"permalink: /code-agent-bench/models/{row['id']}/",
        "analysis_date: 2026-06-18",
        f"rank: {row.get('rank', '')}",
        f"model_name: {scalar(row.get('model_name'))}",
        f"model_raw: {scalar(row.get('model_raw'))}",
        f"provider_label: {scalar(row.get('provider_label'))}",
        f"agent_label: {scalar(row.get('agent_label'))}",
        f"agent_version: {scalar(row.get('agent_version'))}",
        f"subtitle: {scalar(story['subtitle'])}",
        f"subtitle_zh: {scalar(story['subtitle_zh'])}",
        f"final_score: {round(float(row.get('final_score') or 0), 2)}",
    ]
    if row.get("reverified_final_score") is not None:
        lines.append(f"reverified_final_score: {round(float(row.get('reverified_final_score') or 0), 2)}")
    lines.extend(
        [
            f"solved_attempts: {row.get('solved_attempts', 0)}",
            f"solved_unique_tasks: {row.get('solved_unique_tasks', row.get('pass_at_3_count', 0))}",
            f"task_count: {row.get('task_count', 151)}",
            f"scoreable_attempts: {row.get('scoreable_attempts', 453)}",
            f"pass_at_3_rate_pct: {scalar(pct(row.get('pass_at_3_rate')))}",
            f"pass_3_rate_pct: {scalar(pct(row.get('pass_3_rate')))}",
            f"pass_3_count: {row.get('pass_3_count', 0)}",
            f"attempt_score_pct: {scalar(pct(row.get('attempt_score')))}",
            "tldr:",
        ]
    )
    for en, zh in story["tldr"]:
        lines.append(f"  - en: {scalar(en)}")
        lines.append(f"    zh: {scalar(zh)}")
    lines.append("key_stats:")
    for stat in story["key_stats"]:
        lines.extend(
            [
                f"  - label: {scalar(stat['label'])}",
                f"    label_zh: {scalar(stat['label_zh'])}",
                f"    value: {scalar(stat['value'])}",
                f"    note: {scalar(stat['note'])}",
                f"    note_zh: {scalar(stat['note_zh'])}",
            ]
        )
    lines.append("suite_profile:")
    for suite in suites:
        lines.extend(
            [
                f"  - suite: {suite['suite']}",
                f"    label: {scalar(suite['label'])}",
                f"    label_zh: {scalar(suite['label_zh'])}",
                f"    repo: {scalar(suite['repo'])}",
                f"    total: {suite['total']}",
                f"    solved: {suite['solved']}",
                f"    rate: {suite['rate']}",
                f"    rate_pct: {scalar(suite['rate_pct'])}",
                f"    pass3: {suite['pass3']}",
            ]
        )
        if suite.get("note"):
            lines.append(f"    note: {scalar(suite['note'])}")
            lines.append(f"    note_zh: {scalar(suite.get('note_zh', suite['note']))}")
    if audit:
        lines.append("audit:")
        for key in [
            "harness_ok",
            "reverified_ok",
            "strict_rejected",
            "accepted_pct",
            "rejected_pct",
            "score_before",
            "score_after",
            "delta",
            "delta_zh",
            "note",
            "note_zh",
            "summary",
            "summary_zh",
        ]:
            lines.append(f"  {key}: {scalar(audit[key])}")
    lines.append("cases:")
    for case in cases:
        lines.extend(
            [
                f"  - label: {scalar(case['label'])}",
                f"    label_zh: {scalar(case['label_zh'])}",
                f"    tone: {case['tone']}",
                f"    title: {scalar(case['title'])}",
                f"    title_zh: {scalar(case['title_zh'])}",
                f"    meta: {scalar(case['meta'])}",
                f"    meta_zh: {scalar(case['meta_zh'])}",
                f"    note: {scalar(case['note'])}",
                f"    note_zh: {scalar(case['note_zh'])}",
            ]
        )
    lines.append("related_models:")
    for related in related:
        lines.extend(
            [
                f"  - label: {scalar(related['label'])}",
                f"    label_zh: {scalar(related['label_zh'])}",
                f"    name: {scalar(related['name'])}",
                f"    note: {scalar(related['note'])}",
                f"    note_zh: {scalar(related['note_zh'])}",
                f"    url: {related['url']}",
            ]
        )
    lines.append("---")
    return "\n".join(lines)


def body(row: dict[str, Any], story: dict[str, Any], audit: dict[str, Any] | None) -> str:
    name = row["model_name"]
    en = f"""
<div class="bench-lang-en" markdown="1">

{story['opening_en']}

{story['comparison_en']}

{story['suite_read_en']} {story['agent_note_en']}

{{% include model-suite-bars.html title="Where the score comes from" title_zh="分数从哪里来" note="Selected high and low suites, grouped by pass-at-least-once rate." note_zh="选取高分和低分 suite，按三次尝试至少解出一次的比例展示。" %}}

{story['chart_read_en']}

{{% include model-case-strip.html title="Concrete examples" title_zh="具体题目例子" %}}

{story['case_read_en']}

{story['audit_read_en']}

{{% include model-audit-card.html %}}

{story['usage_en']} {story['closing_en']}

<details class="model-evidence">
  <summary>Supporting suite table</summary>
  <div class="model-evidence-table-wrap">
    <table>
      <thead>
        <tr>
          <th>Suite</th>
          <th>Repo</th>
          <th>Solved</th>
          <th>Pass^3</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        {{% for suite in page.suite_profile %}}
        <tr>
          <td><code>{{{{ suite.suite }}}}</code></td>
          <td>{{{{ suite.repo }}}}</td>
          <td>{{{{ suite.solved }}}}/{{{{ suite.total }}}}</td>
          <td>{{{{ suite.pass3 }}}}</td>
          <td>{{{{ suite.rate_pct }}}}</td>
        </tr>
        {{% endfor %}}
      </tbody>
    </table>
  </div>
</details>

</div>
""".strip()
    zh = f"""
<div class="bench-lang-zh" markdown="1">

{story['opening_zh']}

{story['comparison_zh']}

{story['suite_read_zh']}{story['agent_note_zh']}

{{% include model-suite-bars.html title="Where the score comes from" title_zh="分数从哪里来" note="Selected high and low suites, grouped by pass-at-least-once rate." note_zh="选取高分和低分 suite，按三次尝试至少解出一次的比例展示。" %}}

{story['chart_read_zh']}

{{% include model-case-strip.html title="Concrete examples" title_zh="具体题目例子" %}}

{story['case_read_zh']}

{story['audit_read_zh']}

{{% include model-audit-card.html %}}

{story['usage_zh']}{story['closing_zh']}

<details class="model-evidence">
  <summary>支撑这个判断的 suite 表</summary>
  <div class="model-evidence-table-wrap">
    <table>
      <thead>
        <tr>
          <th>Suite</th>
          <th>Repo</th>
          <th>解出</th>
          <th>Pass^3</th>
          <th>通过率</th>
        </tr>
      </thead>
      <tbody>
        {{% for suite in page.suite_profile %}}
        <tr>
          <td><code>{{{{ suite.suite }}}}</code></td>
          <td>{{{{ suite.repo }}}}</td>
          <td>{{{{ suite.solved }}}}/{{{{ suite.total }}}}</td>
          <td>{{{{ suite.pass3 }}}}</td>
          <td>{{{{ suite.rate_pct }}}}</td>
        </tr>
        {{% endfor %}}
      </tbody>
    </table>
  </div>
</details>

</div>
""".strip()
    return en + "\n\n" + zh + "\n"


def annotate_suite_notes(suites: list[dict[str, Any]]) -> None:
    if not suites:
        return
    max_rate = max(suite["rate"] for suite in suites)
    min_rate = min(suite["rate"] for suite in suites)
    for suite in suites:
        repo = suite["repo"]
        if suite["rate"] == max_rate and suite["solved"] > 0:
            suite["note"] = f"Best visible cluster for this row: {suite['solved']}/{suite['total']} tasks reached."
            suite["note_zh"] = f"这一行最明显的强项簇：{suite['total']} 题中解出 {suite['solved']} 题。"
        elif suite["rate"] == min_rate:
            suite["note"] = f"Weak cluster: {REPO_SHAPES.get(repo, repo)} resisted this model-agent pairing."
            suite["note_zh"] = f"弱项簇：{REPO_SHAPES_ZH.get(repo, repo)}对这个模型-agent 组合不友好。"


def generate_page(
    row: dict[str, Any],
    rows: list[dict[str, Any]],
    tasks: dict[str, dict[str, Any]],
    source_roots: list[Path],
) -> tuple[str, Path | None]:
    model_dir = model_run_dir(row, source_roots)
    result_root = best_result_root(model_dir) if model_dir else None
    original: list[TaskAttempt] = []
    reverified: list[TaskAttempt] = []
    if result_root:
        original, reverified = collect_attempts(result_root)
    suites_all = suite_profile(original)
    selected_suites = select_suite_profile(suites_all)
    annotate_suite_notes(selected_suites)
    stats = instance_stats(original)
    audit = audit_summary(row, original, reverified)
    story = narrative(row, suites_all or selected_suites, rows, audit)
    cases = select_cases(stats, tasks, row["id"])
    story["case_read_en"], story["case_read_zh"] = case_story(cases, story["angle"])
    related = related_models(row, rows)
    return (
        write_frontmatter(row, selected_suites, cases, audit, related, story, result_root)
        + "\n\n"
        + body(row, story, audit),
        result_root,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-id", help="Generate one model page.")
    parser.add_argument("--source-root", action="append", type=Path, default=[])
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--force", action="store_true", help="Overwrite existing markdown files.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    data = load_json(BENCH_DATA)
    rows = data["rows"]
    if args.model_id:
        rows = [row for row in rows if row["id"] == args.model_id]
        if not rows:
            raise SystemExit(f"Unknown model id: {args.model_id}")
    all_rows = data["rows"]
    tasks = task_maps()
    source_roots = args.source_root or [WORKSPACE_ROOT / "SweResult", REPO_ROOT / "SweResult"]

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for row in rows:
        target = args.output_dir / f"{row['id']}.md"
        if row["id"] in HAND_WRITTEN_MODEL_IDS and not args.model_id:
            print(f"skip hand-written {target}")
            continue
        if target.exists() and not args.force:
            print(f"skip existing {target}")
            continue
        text, result_root = generate_page(row, all_rows, tasks, source_roots)
        if args.dry_run:
            print(f"would write {target} from {result_root}")
            continue
        target.write_text(text, encoding="utf-8")
        print(f"wrote {target} from {result_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
