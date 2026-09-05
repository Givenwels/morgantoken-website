#!/usr/bin/env python3
"""Build the CodeAgentBench SWE-Bench-Pro task browser data."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import yaml


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def clean_text(value: object) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if text.startswith('"') and text.endswith('"'):
        try:
            text = json.loads(text)
        except json.JSONDecodeError:
            pass
        text = str(text).replace("\r\n", "\n").replace("\r", "\n").strip()
    return re.sub(r"\n{4,}", "\n\n\n", text)


def markdown_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip()
            title = re.sub(r"`([^`]+)`", r"\1", title)
            title = re.sub(r"\s+", " ", title).strip()
            if title:
                return title[:180]
    for line in text.splitlines():
        stripped = re.sub(r"\s+", " ", line.strip())
        if stripped:
            return stripped[:180]
    return fallback


def combine_prompt(data: dict, language: str) -> str:
    suffix = "_zh" if language == "zh" else "_en"
    sections = []
    labels = {
        "en": {
            "problem_statement": "",
            "requirements": "## Requirements",
            "interface": "## Interface",
        },
        "zh": {
            "problem_statement": "",
            "requirements": "## 需求",
            "interface": "## 接口",
        },
    }[language]
    for key in ("problem_statement", "requirements", "interface"):
        text = clean_text(data.get(key + suffix))
        if not text:
            continue
        label = labels[key]
        sections.append(text if not label else f"{label}\n\n{text}")
    return "\n\n".join(sections).strip()


def load_report_task_order(report_path: Path) -> tuple[list[str], dict[str, str]]:
    with report_path.open("r", encoding="utf-8") as handle:
        report = json.load(handle)

    task_ids = []
    slot_by_task = {}
    seen = set()
    for record in report.get("records", []):
        ids = record.get("task_ids") or []
        if not ids:
            continue
        task_id = ids[0]
        if task_id in seen:
            continue
        seen.add(task_id)
        task_ids.append(task_id)

        unit_id = record.get("unit_id") or ""
        match = re.search(r"swepro151-(.+?)-instance_", unit_id)
        if match:
            slot_by_task[task_id] = match.group(1)

    return task_ids, slot_by_task


def build_tasks(report_path: Path, translations_root: Path) -> dict:
    task_ids, slot_by_task = load_report_task_order(report_path)
    tasks = []
    missing = []

    for index, task_id in enumerate(task_ids, start=1):
        yaml_path = translations_root / f"{task_id}.yaml"
        if not yaml_path.exists():
            missing.append(task_id)
            continue

        with yaml_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}

        repo = clean_text(data.get("repo")) or "unknown/unknown"
        problem_en = clean_text(data.get("problem_statement_en"))
        problem_zh = clean_text(data.get("problem_statement_zh")) or problem_en
        prompt_en = combine_prompt(data, "en") or problem_en
        prompt_zh = combine_prompt(data, "zh") or problem_zh
        fallback_title = f"{repo} task {index:03d}"
        title_en = markdown_title(problem_en, fallback_title)
        title_zh = markdown_title(problem_zh, title_en)
        base_commit = clean_text(data.get("base_commit"))
        suite_slot = slot_by_task.get(task_id, "")
        search_text = " ".join(
            part
            for part in [
                task_id,
                repo,
                base_commit,
                title_en,
                title_zh,
                problem_en[:1000],
                problem_zh[:1000],
                suite_slot,
                clean_text(data.get("review_status")),
            ]
            if part
        )
        search_text = re.sub(r"\s+", " ", search_text).strip()

        tasks.append(
            {
                "index": index,
                "id": task_id,
                "repo": repo,
                "repo_slug": slugify(repo),
                "base_commit": base_commit,
                "base_commit_short": base_commit[:12],
                "suite_slot": suite_slot,
                "suite_slot_slug": slugify(suite_slot),
                "title_en": title_en,
                "title_zh": title_zh,
                "problem_statement_en": problem_en,
                "problem_statement_zh": problem_zh,
                "prompt_en": prompt_en,
                "prompt_zh": prompt_zh,
                "requirements_en": clean_text(data.get("requirements_en")),
                "requirements_zh": clean_text(data.get("requirements_zh")),
                "interface_en": clean_text(data.get("interface_en")),
                "interface_zh": clean_text(data.get("interface_zh")),
                "translation_version": clean_text(data.get("translation_version")),
                "review_status": clean_text(data.get("review_status")),
                "search_text": search_text,
                "source_yaml": f"{task_id}.yaml",
            }
        )

    repo_counts = Counter(task["repo"] for task in tasks)
    repos = [
        {
            "key": slugify(repo),
            "label": repo,
            "count": count,
        }
        for repo, count in sorted(repo_counts.items(), key=lambda item: (-item[1], item[0]))
    ]

    return {
        "metadata": {
            "schema_version": "code_agent_tasks.v1",
            "benchmark": "SWE-Bench-Pro",
            "task_count": len(tasks),
            "expected_task_count": len(task_ids),
            "missing_task_count": len(missing),
            "source_report": str(report_path),
            "source_translations": str(translations_root),
        },
        "repos": repos,
        "tasks": tasks,
        "missing_tasks": missing,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--report",
        default="../SweResult/codex-gpt53-xhigh/full_suite_model_run_report.json",
        help="A completed 453-attempt SWE-Bench-Pro report.",
    )
    parser.add_argument(
        "--translations",
        default="../../openclawcodebench/translations/swebench_pro",
        help="Directory containing SWE-Bench-Pro translation YAML files.",
    )
    parser.add_argument(
        "--output",
        default="_data/code_agent_tasks.json",
        help="Output data JSON.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    report_path = (repo_root / args.report).resolve()
    translations_root = (repo_root / args.translations).resolve()
    output_path = (repo_root / args.output).resolve()

    data = build_tasks(report_path, translations_root)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(
        f"Wrote {output_path.relative_to(repo_root)} with "
        f"{data['metadata']['task_count']} tasks."
    )
    if data["missing_tasks"]:
        print(f"Missing {len(data['missing_tasks'])} translations.")


if __name__ == "__main__":
    main()
