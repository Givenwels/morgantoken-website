#!/usr/bin/env python3
"""Build the CodeAgentBench data file from exported SWEPro results."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


AGENT_LABELS = {
    "claude-code": "Claude Code",
    "codex": "Codex",
    "deepseek": "deepseek-tui",
    "opencode": "OpenCode",
    "qwen": "Qwen",
    "qodercli": "Qoder",
    "kimi": "Kimi",
}

PROVIDER_LABELS = {
    "deepseek": "DeepSeek",
    "deepseek-v4-flash": "DeepSeek",
    "gpt": "OpenAI",
    "kimi-code": "Moonshot",
    "longcat": "LongCat",
    "minimax-cn-coding-plan": "MiniMax",
    "qwen": "Qwen",
    "sensenova": "SenseNova",
    "stepfun": "StepFun",
    "streamlake": "StreamLake",
    "volcengine-plan": "Volcengine",
    "xiaomi": "Xiaomi",
    "xiaomi-token-plan-cn": "Xiaomi",
    "zai-coding-plan": "Zhipu GLM",
}

LOGOS = {
    "deepseek": "logo-deepseek.png",
    "deepseek-v4-flash": "logo-deepseek.png",
    "gpt": "logo-openai.png",
    "kimi-code": "logo-kimi.jpeg",
    "longcat": "logo-longcat.png",
    "minimax-cn-coding-plan": "logo-minimax.jpeg",
    "qwen": "logo-qwen.png",
    "sensenova": "logo-shangtang.png",
    "stepfun": "logo-stepfun.png",
    "streamlake": "logo-kuaishou.png",
    "volcengine-plan": "logo-seed.png",
    "xiaomi": "logo-xiaomi.png",
    "xiaomi-token-plan-cn": "logo-xiaomi.png",
    "zai-coding-plan": "logo-glm.png",
}

MODEL_DISPLAY_OVERRIDES = {
    "codex-gpt55": {
        "model_raw": "gpt-5.5#effort=xhigh",
        "model_name": "GPT 5.5 (xhigh)",
    },
    "codex-gpt54": {
        "model_raw": "gpt-5.4#effort=xhigh",
        "model_name": "GPT 5.4 (xhigh)",
    },
    "kimi-for-coding": {
        "model_name": "Kimi K2.6(Kimi for Coding)",
    },
    "qoder-qwen35-plus-direct-20260612": {
        "model_raw": "qwen3.5-plus-cp#context-window=180000",
        "model_name": "Qwen 3.5 plus (180k)",
    },
    "qoder-qwen36-plus-forward-20260610": {
        "model_name": "Qwen 3.6 plus (180k)",
    },
    "opencode-kat-coder-pro-v2-kat2": {
        "model_name": "KAT Coder Pro v2",
    },
    "opencode-deepseek-v4-flash-max": {
        "model_raw": "deepseek/deepseek-v4-pro#variant=max",
        "model_name": "DeepSeek v4 pro (max)",
    },
    "opencode-deepseek-v4-pro-max": {
        "model_raw": "deepseek/deepseek-v4-flash#variant=max",
        "model_name": "DeepSeek v4 flash (max)",
    },
}

CANONICAL_MODEL_DIR_OVERRIDES = {
    "opencode-stepfun35-2603-rerun-20260607": "opencode-stepfun35-2603",
}

AGENT_VERSION_OVERRIDES = {
    "claude-code": {
        "display": "claude-code 2.1.158",
        "source": "claude --version in current local environment",
    },
    "codex-cli": {
        "display": "codex-cli 0.135.0",
        "source": "codex --version in current local environment",
    },
    "deepseek-tui": {
        "display": "deepseek-tui v0.8.39",
        "source": "deepseek-tui --version in current local environment",
    },
    "opencode-cli": {
        "display": "opencode-cli 1.14.32",
        "source": "opencode --version in current local environment",
    },
    "qwen-cli": {
        "display": "qwen-cli 0.14.5",
        "source": "qwen --version in current local environment",
    },
    "qodercli-1.0.10": {
        "display": "qodercli 1.0.10",
        "source": "full_suite_model_run_report completion.lane.agent_version",
    },
    "qodercli-1.0.14-sdk-byok-forward": {
        "display": "qodercli 1.0.14 sdk-byok-forward",
        "source": "full_suite_model_run_report completion.lane.agent_version",
    },
    "qodercli-1.0.14-sdk-byok-proxy": {
        "display": "qodercli 1.0.14 sdk-byok-proxy",
        "source": "full_suite_model_run_report completion.lane.agent_version",
    },
    "qoderclicn-1.0.14-sdk-byok-forward": {
        "display": "qoderclicn 1.0.14 sdk-byok-forward",
        "source": "full_suite_model_run_report completion.lane.agent_version",
    },
    "kimi-cli": {
        "display": "kimi-cli 1.40.0",
        "source": "historical run version for the scoreable Kimi attempts",
    },
}

MODEL_AGENT_VERSION_OVERRIDES = {
    "qoder-qwen35-plus-direct-20260612": {
        "display": "qodercli 1.0.14",
        "source": "qodercli-1.0.14-direct: display override for the primary historical run version",
    },
    "qoder-qwen36-plus-forward-20260610": {
        "display": "qodercli 1.0.10",
        "source": "qodercli-1.0.10: display override for the primary historical run version",
    },
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def first_present(*values):
    for value in values:
        if value is not None:
            return value
    return None


def title_model_piece(value: str) -> str:
    replacements = {
        "gpt-": "GPT-",
        "glm-": "GLM-",
        "mimo-": "MiMo-",
        "qwen": "Qwen ",
        "deepseek": "DeepSeek",
        "minimax": "MiniMax",
        "sensenova": "SenseNova",
        "step-": "Step-",
    }
    text = value
    for src, dst in replacements.items():
        text = re.sub(src, dst, text, flags=re.IGNORECASE)
    text = text.replace("-", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_model(raw_model: str) -> tuple[str, str, str]:
    main, _, variant = raw_model.partition("#")
    parts = main.split("/")
    if len(parts) > 1:
        provider_key = parts[0].lower()
        model_key = parts[-1]
    else:
        lower_main = main.lower()
        if lower_main.startswith("gpt-"):
            provider_key = "gpt"
        elif lower_main.startswith("qwen"):
            provider_key = "qwen"
        else:
            provider_key = parts[0].lower()
        model_key = parts[-1]

    provider_label = PROVIDER_LABELS.get(provider_key, title_model_piece(provider_key))
    model_label = title_model_piece(model_key)
    if variant:
        variant_label = variant.replace("effort=", "").replace("variant=", "")
        model_label = f"{model_label} ({variant_label})"
    return provider_key, provider_label, model_label


def mb(value: int | float | None) -> float:
    return round((value or 0) / (1024 * 1024), 2)


def compact_count(value: int | float | None) -> str:
    if value is None:
        return "--"
    text = f"{float(value) / 1000:,.1f}".rstrip("0").rstrip(".")
    return f"{text}K"


def code_agent_final_score(pass_3_rate: float, pass_at_3_rate: float, attempt_score: float) -> float:
    stable = pass_3_rate ** (1 / 3) if pass_3_rate > 0 else 0
    reach = 1 - ((1 - pass_at_3_rate) ** (1 / 3)) if pass_at_3_rate < 1 else 1
    attempt = max(attempt_score, 0)
    if stable <= 0 or reach <= 0 or attempt <= 0:
        return 0
    return 100 * (stable ** 0.55) * (reach ** 0.25) * (attempt ** 0.20)


def directory_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    total = 0
    for child in path.rglob("*"):
        if child.is_file():
            try:
                total += child.stat().st_size
            except OSError:
                pass
    return total


def load_manifest_items(source_root: Path) -> dict[str, dict]:
    manifest_path = source_root / "swepro151_pass3_completed_models_manifest.json"
    if not manifest_path.exists():
        return {}
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    items = {}
    for item in manifest.get("exported_models", []) + manifest.get("legacy_or_pending_exports", []):
        model_dir = item.get("model_dir")
        if model_dir:
            items[model_dir] = item
    return items


def load_score_summary(source_root: Path, model_dir: str) -> dict:
    path = source_root / model_dir / "score_summary.json"
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def is_backup_model_dir(model_dir: str) -> bool:
    return ".backup" in model_dir or model_dir.startswith("backup-")


def load_full_suite_report(source_root: Path, model_dir: str) -> dict:
    path = source_root / model_dir / "full_suite_model_run_report.json"
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def report_agent_version(report: dict, fallback: str) -> tuple[str, str]:
    runtime_labels = []
    for record in report.get("records", []):
        lane = (record.get("completion") or {}).get("lane") or {}
        label = lane.get("agent_version")
        if label and label not in runtime_labels:
            runtime_labels.append(str(label))

    if runtime_labels:
        displays = []
        sources = []
        for label in runtime_labels:
            override = AGENT_VERSION_OVERRIDES.get(label)
            if override:
                displays.append(override["display"])
                sources.append(f"{label}: {override['source']}")
            else:
                displays.append(label)
                sources.append(f"{label}: full_suite_model_run_report completion.lane.agent_version")
        return ", ".join(displays), "; ".join(sources)

    lane_binding = report.get("lane_binding") or {}
    label = lane_binding.get("agent")
    if label:
        override = AGENT_VERSION_OVERRIDES.get(str(label))
        if override:
            return override["display"], f"{label}: {override['source']}"
        return str(label), "full_suite_model_run_report lane_binding.agent"

    return fallback, "not exported"


def local_archive_size_bytes(source_root: Path, model_dir: str) -> int:
    path = source_root / model_dir / "complete_run_logs.tar.gz"
    if path.exists():
        return path.stat().st_size
    return 0


def local_full_tree_size_bytes(source_root: Path, model_dir: str) -> int:
    return directory_size_bytes(source_root / model_dir / "full_run_tree")


def numeric_token_value(value) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.replace(",", "").strip()
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    return None


def command_log_token_usage(full_tree: Path) -> dict:
    input_tokens = 0.0
    output_tokens = 0.0
    reasoning_tokens = 0.0
    total_tokens = 0.0
    log_count = 0

    for path in full_tree.glob("**/*.command.log"):
        log_input = 0.0
        log_output = 0.0
        log_reasoning = 0.0
        log_total = 0.0
        found_tokens = False
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue

        for line in lines:
            if not line.startswith("{"):
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") != "step_finish":
                continue
            tokens = ((event.get("part") or {}).get("tokens") or {})
            cache = tokens.get("cache") or {}
            input_value = sum(
                value
                for value in (
                    numeric_token_value(tokens.get("input")),
                    numeric_token_value(cache.get("read")),
                    numeric_token_value(cache.get("write")),
                )
                if value is not None
            )
            reasoning_value = numeric_token_value(tokens.get("reasoning")) or 0.0
            output_value = (numeric_token_value(tokens.get("output")) or 0.0) + reasoning_value
            total_value = numeric_token_value(tokens.get("total"))
            if total_value is None:
                total_value = input_value + output_value
            log_input += input_value
            log_output += output_value
            log_reasoning += reasoning_value
            log_total += total_value
            found_tokens = True

        if found_tokens:
            input_tokens += log_input
            output_tokens += log_output
            reasoning_tokens += log_reasoning
            total_tokens += log_total
            log_count += 1

    return {
        "input_tokens": int(round(input_tokens)) if log_count else None,
        "output_tokens": int(round(output_tokens)) if log_count else None,
        "reasoning_tokens": int(round(reasoning_tokens)) if log_count else None,
        "total_tokens": int(round(total_tokens)) if log_count else None,
        "token_task_count": log_count,
        "token_input_task_count": log_count if log_count else 0,
        "token_output_task_count": log_count if log_count else 0,
        "token_summary_task_count": log_count,
        "token_usage_source": "command_log_step_finish",
    }


def run_summary_token_usage(source_root: Path, model_dir: str) -> dict:
    full_tree = source_root / model_dir / "full_run_tree"
    command_log_usage = command_log_token_usage(full_tree)
    if command_log_usage["token_task_count"]:
        return command_log_usage

    input_tokens = 0.0
    output_tokens = 0.0
    input_task_count = 0
    output_task_count = 0
    token_task_count = 0
    summary_task_count = 0

    for path in full_tree.glob("**/run/run_summary.json"):
        try:
            with path.open("r", encoding="utf-8") as handle:
                summary = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue

        for task in summary.get("tasks") or []:
            summary_task_count += 1
            adapter = ((task.get("metadata") or {}).get("adapter") or {})
            task_input = first_present(
                numeric_token_value(task.get("total_input_tokens")),
                numeric_token_value(adapter.get("total_input_tokens")),
            )
            raw_output = first_present(
                numeric_token_value(task.get("total_output_tokens")),
                numeric_token_value(adapter.get("total_output_tokens")),
            )
            task_reasoning = first_present(
                numeric_token_value(task.get("reasoning_tokens")),
                numeric_token_value(adapter.get("reasoning_tokens")),
            )
            task_output = (raw_output or 0.0) + (task_reasoning or 0.0) if (raw_output is not None or task_reasoning is not None) else None
            has_token = False
            if task_input is not None:
                input_tokens += task_input
                input_task_count += 1
                has_token = True
            if task_output is not None:
                output_tokens += task_output
                output_task_count += 1
                has_token = True
            if has_token:
                token_task_count += 1

    has_input = input_task_count > 0
    has_output = output_task_count > 0
    return {
        "input_tokens": int(round(input_tokens)) if has_input else None,
        "output_tokens": int(round(output_tokens)) if has_output else None,
        "total_tokens": int(round(input_tokens + output_tokens)) if (has_input or has_output) else None,
        "token_task_count": token_task_count,
        "token_input_task_count": input_task_count,
        "token_output_task_count": output_task_count,
        "token_summary_task_count": summary_task_count,
        "token_usage_source": "run_summary_task_totals",
    }


def strict_retryable_enabled(score_summary: dict, item: dict, source_dir: str) -> bool:
    gate = score_summary.get("strict_retryable_gate")
    if isinstance(gate, dict):
        return bool(gate.get("enabled"))
    if gate is not None:
        return bool(gate)
    return bool(item.get("strict_retryable_gate") or source_dir == "kimi-for-coding")


def build_row(model_dir: str, source_root: Path, manifest_item: dict | None = None, source_model_dir: str | None = None) -> dict:
    source_dir = source_model_dir or model_dir
    item = manifest_item or {}
    score_summary = load_score_summary(source_root, source_dir)
    full_suite_report = load_full_suite_report(source_root, source_dir)
    agent = score_summary.get("agent") or item.get("agent") or "unknown"
    raw_model = score_summary.get("model") or item.get("model") or model_dir
    provider_key, provider_label, model_label = split_model(raw_model)
    display_override = MODEL_DISPLAY_OVERRIDES.get(model_dir, {})
    display_raw_model = display_override.get("model_raw", raw_model)
    if display_raw_model != raw_model:
        provider_key, provider_label, model_label = split_model(display_raw_model)
    display_model_label = display_override.get("model_name", model_label)
    agent_label = AGENT_LABELS.get(agent, title_model_piece(agent))
    agent_version, agent_version_source = report_agent_version(full_suite_report, agent_label)
    agent_version_override = MODEL_AGENT_VERSION_OVERRIDES.get(model_dir)
    if agent_version_override:
        agent_version = agent_version_override["display"]
        agent_version_source = agent_version_override["source"]
    attempts = int(score_summary.get("planned_task_attempts") or item.get("planned_task_attempts") or 0)
    tasks = int(score_summary.get("planned_unique_tasks") or score_summary.get("scoreable_unique_tasks") or 151)
    scoreable_attempts = int(score_summary.get("scoreable_attempts") or item.get("scoreable_attempts") or 0)
    pass_at_3_count = int(score_summary.get("pass_at_k_count") or item.get("pass_at_k_count") or 0)
    pass_3_count = int(score_summary.get("pass^k_count") or score_summary.get("pass_caret_k_count") or item.get("pass^k_count") or item.get("pass_caret_k_count") or 0)
    complete_task_count_for_k = int(score_summary.get("complete_task_count_for_k") or tasks)
    pass_at_3_denominator = tasks
    pass_3_denominator = tasks
    pass_at_3_rate_value = first_present(score_summary.get("pass_at_k_rate"), item.get("pass_at_k_rate"))
    if pass_at_3_rate_value is None and score_summary.get("pass_at_k_complete_rate") is not None:
        pass_at_3_rate_value = score_summary.get("pass_at_k_complete_rate")
        pass_at_3_denominator = complete_task_count_for_k
    pass_3_rate_value = first_present(
        score_summary.get("pass^k_rate"),
        score_summary.get("pass_caret_k_rate"),
        item.get("pass^k_rate"),
        item.get("pass_caret_k_rate"),
    )
    if pass_3_rate_value is None and score_summary.get("pass_caret_k_complete_rate") is not None:
        pass_3_rate_value = score_summary.get("pass_caret_k_complete_rate")
        pass_3_denominator = complete_task_count_for_k
    pass_at_3_rate = float(pass_at_3_rate_value or 0)
    pass_3_rate = float(pass_3_rate_value or 0)
    attempt_score = float(score_summary.get("attempt_score") or item.get("attempt_score") or 0)
    partial_export = bool(score_summary.get("partial_export"))
    final_score_status = score_summary.get("final_score_status") or ""
    final_score = code_agent_final_score(pass_3_rate, pass_at_3_rate, attempt_score)
    if final_score_status:
        final_score = float(score_summary.get("final_score") or 0)
    archive_size_bytes = (
        score_summary.get("complete_run_logs_archive_size_bytes")
        or item.get("archive_size_bytes")
        or local_archive_size_bytes(source_root, source_dir)
    )
    full_tree_size_bytes = item.get("full_run_tree_size_bytes")
    if full_tree_size_bytes is None:
        full_tree_size_bytes = local_full_tree_size_bytes(source_root, source_dir)
    token_usage = run_summary_token_usage(source_root, source_dir)

    row = {
        "id": slugify(model_dir),
        "model_dir": model_dir,
        "lane_key": score_summary.get("lane_key") or item.get("lane_key") or model_dir,
        "agent": agent,
        "agent_label": agent_label,
        "agent_slug": slugify(agent),
        "agent_version": agent_version,
        "agent_version_source": agent_version_source,
        "provider": provider_key,
        "provider_label": provider_label,
        "model_raw": display_raw_model,
        "model_name": display_model_label,
        "logo": LOGOS.get(provider_key, ""),
        "group": "partial" if partial_export else "completed_453",
        "status": score_summary.get("score_coverage_status") or item.get("score_coverage_status") or "",
        "strict_retryable_gate": strict_retryable_enabled(score_summary, item, source_dir),
        "language_variant": score_summary.get("language_variant") or "",
        "attempts_per_task": int(score_summary.get("attempts") or 3),
        "task_count": tasks,
        "planned_task_attempts": attempts,
        "scoreable_attempts": scoreable_attempts,
        "scoreable_attempt_coverage": (scoreable_attempts / attempts) if attempts else 0,
        "non_scoreable_attempts": int(first_present(score_summary.get("non_scoreable_attempts"), item.get("non_scoreable_attempts"), 0)),
        "tasks_missing_k_scoreable_attempts": int(first_present(score_summary.get("tasks_missing_k_scoreable_attempts"), item.get("tasks_missing_k_scoreable_attempts"), 0)),
        "solved_attempts": int(score_summary.get("solved_attempts") or 0),
        "solved_unique_tasks": int(score_summary.get("solved_unique_tasks") or pass_at_3_count),
        "pass_at_3_count": pass_at_3_count,
        "pass_at_3_rate": pass_at_3_rate,
        **({"pass_at_3_denominator": pass_at_3_denominator} if pass_at_3_denominator != tasks else {}),
        "pass_3_count": pass_3_count,
        "pass_3_rate": pass_3_rate,
        **({"pass_3_denominator": pass_3_denominator} if pass_3_denominator != tasks else {}),
        "attempt_score": attempt_score,
        "final_score": final_score,
        **({"final_score_status": final_score_status} if final_score_status else {}),
        **({"partial_export": True} if partial_export else {}),
        **(
            {"partial_final_score_complete_rate": float(score_summary.get("partial_final_score_complete_rate"))}
            if score_summary.get("partial_final_score_complete_rate") is not None
            else {}
        ),
        "archive_size_mb": mb(archive_size_bytes),
        "full_run_tree_size_mb": mb(full_tree_size_bytes),
        "input_tokens": token_usage["input_tokens"],
        "output_tokens": token_usage["output_tokens"],
        "total_tokens": token_usage["total_tokens"],
        "input_tokens_display": compact_count(token_usage["input_tokens"]),
        "output_tokens_display": compact_count(token_usage["output_tokens"]),
        "total_tokens_display": compact_count(token_usage["total_tokens"]),
        "token_task_count": token_usage["token_task_count"],
        "token_input_task_count": token_usage["token_input_task_count"],
        "token_output_task_count": token_usage["token_output_task_count"],
        "token_summary_task_count": token_usage["token_summary_task_count"],
        "token_task_coverage": (token_usage["token_task_count"] / attempts) if attempts else 0,
        "token_usage_source": token_usage["token_usage_source"],
        "archive_member_count": int(score_summary.get("complete_run_logs_archive_member_count") or 0),
        "sha256": score_summary.get("exported_full_suite_report_sha256") or item.get("exported_full_suite_report_sha256") or "",
        "sha256_short": (score_summary.get("exported_full_suite_report_sha256") or item.get("exported_full_suite_report_sha256") or "")[:12],
        "job_name": score_summary.get("job_name") or "",
        "exported_at": score_summary.get("exported_at") or "",
        "relative_report_path": f"{source_dir}/full_suite_model_run_report.json",
        "relative_summary_path": f"{source_dir}/score_summary.json",
    }
    return row


def rank_rows(rows: list[dict]) -> list[dict]:
    ranked = sorted(
        rows,
        key=lambda row: (
            row["final_score"],
            row["pass_3_rate"],
            row["pass_at_3_rate"],
            row["attempt_score"],
            row["solved_attempts"],
        ),
        reverse=True,
    )
    for index, row in enumerate(ranked, start=1):
        row["rank"] = index
    return ranked


def append_partial_rows(rows: list[dict], partial_rows: list[dict]) -> list[dict]:
    ranked = sorted(
        partial_rows,
        key=lambda row: (
            row["scoreable_attempt_coverage"],
            row.get("partial_final_score_complete_rate", 0),
            row["pass_3_rate"],
            row["pass_at_3_rate"],
            row["attempt_score"],
        ),
        reverse=True,
    )
    for index, row in enumerate(ranked, start=len(rows) + 1):
        row["rank"] = index
    return rows + ranked


def build_data(source_root: Path) -> dict:
    manifest_items = load_manifest_items(source_root)
    score_summaries = sorted(source_root.glob("*/score_summary.json"))
    rows = []
    partial_rows = []
    excluded_rows = []
    superseded_dirs = {
        canonical_dir
        for source_dir, canonical_dir in CANONICAL_MODEL_DIR_OVERRIDES.items()
        if (source_root / source_dir / "score_summary.json").exists()
    }

    for path in score_summaries:
        source_model_dir = path.parent.name
        if is_backup_model_dir(source_model_dir):
            continue
        if source_model_dir in superseded_dirs:
            continue
        model_dir = CANONICAL_MODEL_DIR_OVERRIDES.get(source_model_dir, source_model_dir)
        score_summary = load_score_summary(source_root, source_model_dir)
        completed = int(score_summary.get("observed_completed_task_attempts") or 0)
        scoreable = int(score_summary.get("scoreable_attempts") or 0)
        planned = int(score_summary.get("planned_task_attempts") or 453)
        row = build_row(
            model_dir,
            source_root,
            manifest_items.get(model_dir) or manifest_items.get(source_model_dir),
            source_model_dir=source_model_dir,
        )
        if completed == 453 and scoreable == 453 and planned == 453:
            rows.append(row)
        elif score_summary.get("partial_export"):
            partial_rows.append(row)
        else:
            excluded_rows.append(row)

    rows = rank_rows(rows)
    display_rows = append_partial_rows(rows, partial_rows)
    excluded_rows = rank_rows(excluded_rows)

    agents = []
    agent_keys = {row["agent"] for row in display_rows}
    ordered_agents = [agent for agent in AGENT_LABELS if agent in agent_keys]
    ordered_agents.extend(sorted(agent for agent in agent_keys if agent not in AGENT_LABELS))
    for agent in ordered_agents:
        agent_rows = [row for row in display_rows if row["agent"] == agent]
        agents.append({
            "key": agent,
            "slug": slugify(agent),
            "label": AGENT_LABELS.get(agent, title_model_piece(agent)),
            "count": len(agent_rows),
            "best_pass_at_3_rate": max(row["pass_at_3_rate"] for row in agent_rows),
        })

    return {
        "metadata": {
            "schema_version": "code_agent_bench_data.v1",
            "benchmark": "SWE-Bench-Pro",
            "suite": "SWEPro 151 zh pass@3",
            "language_variant": "zh",
            "task_count": 151,
            "attempts_per_task": 3,
            "total_attempts": 453,
            "rank_metric": "final_score",
            "final_score_formula": "100 * ((Pass^3)^(1/3))^0.55 * (1 - (1 - Pass@3)^(1/3))^0.25 * (Attempt Score)^0.20",
            "completed_model_count": len(rows),
            "partial_model_count": len(partial_rows),
            "excluded_model_count": len(excluded_rows),
            "exported_at": max((row["exported_at"] for row in display_rows if row["exported_at"]), default=""),
            "source_manifest": "SweResult/*/score_summary.json",
            "token_usage_source": "full_run_tree/**/*.command.log step_finish.tokens when available; otherwise full_run_tree/**/run/run_summary.json",
        },
        "agents": agents,
        "rows": display_rows,
        "excluded_rows": excluded_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="../SweResult", help="Path to SweResult")
    parser.add_argument("--output", default="_data/code_agent_bench.json", help="Output data JSON")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    source_root = (repo_root / args.source).resolve()
    output_path = (repo_root / args.output).resolve()

    data = build_data(source_root)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    try:
        display_path = output_path.relative_to(repo_root)
    except ValueError:
        display_path = output_path
    print(f"Wrote {display_path} with {len(data['rows'])} displayed rows.")


if __name__ == "__main__":
    main()
