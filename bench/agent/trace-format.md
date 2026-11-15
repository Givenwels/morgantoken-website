# Agent 轨迹格式规范 · morgan-agent-trace-v1

评分工作台按本格式导入轨迹。字段分**必填**与**可选**；可选字段缺失时对应评分区显示"未采集"。

## 顶层结构

```json
{
  "schema": "morgan-agent-trace-v1",
  "task_id": "AG-H1",
  "agent": {
    "name": "GLM-5.3-Flash",           // 必填：agent/模型名
    "framework": "WorkBuddy",          // 可选：运行框架
    "model_version": "…",              // 可选：实际模型版本（以返回为准）
    "run_tag": "run-1"                 // 可选：同 agent 多次运行时的批次标记
  },
  "run_meta": {                        // 可选
    "started_at": "2026-11-15T10:00:00+08:00",
    "duration_sec": 0,
    "cost": null,                      // 数字或 null
    "operator": "morgan"
  },
  "routing": {                         // 可选：中转/分流记录
    "path": "数据处理",
    "reason": "…"
  },
  "instruction_log": [                 // 多轮任务必填：逐轮用户指令
    {"round": 1, "content": "…"}
  ],
  "plan": [                            // 可选：规划文本
    {"step": 1, "action": "…"}
  ],
  "steps": [                           // 必填：执行时间线
    {"i": 1, "tool": "read_file", "args": {"path": "…"},
     "result_summary": "…", "ts_sec": 3, "error": null}
  ],
  "messages": [                        // 可选：完整对话
    {"role": "assistant", "content": "…"}
  ],
  "output": {                          // 必填
    "artifacts": ["reconciliation.csv"],   // 产物文件名（相对于运行工作区）
    "summary": "…"
  },
  "screenshots": [],                   // 可选：截图文件名
  "verify": null                       // 可选：verify.py 输出的 JSON 原样贴入
}
```

## 约定

- `steps[].error` 非 null 时，工作台在时间线上标红，便于定位 EXE/MT 类扣分。
- `instruction_log` 是"用户说了什么"，`steps` 是"agent 做了什么"——撤回类陷阱靠两者对照打分。
- 运行工作区目录命名：`runs/<task_id>/<agent_name>-<run_tag>/`，内含 trace.json、产物文件、截图。
- 产物核验：在工作区目录跑 `python ../../tasks/verify.py <task_id> <workspace_dir>`，把生成的 `verify_<task_id>.json` 贴进 trace 的 `verify` 字段，或在工作台单独导入。

## 示例

见 `example-trace.json`（AG-H1 的演示轨迹，标注为 demo，非真实运行）。
