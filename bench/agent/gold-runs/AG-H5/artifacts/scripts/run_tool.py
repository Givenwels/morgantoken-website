# -*- coding: utf-8 -*-
"""模拟工具：按预算消耗执行求和。
用法:
  python run_tool.py --tool slow_free --file data_01.txt
  python run_tool.py --tool fast_paid --file data_01.txt
  python run_tool.py --tool batch_tool --files all
"""
import argparse, csv, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
FILES = os.path.join(BASE, "files")
OUT = os.path.join(BASE, "results")
LOG = os.path.join(BASE, "tool_log.jsonl")
TOOLS = json.load(open(os.path.join(BASE, "tools_cost.json"), encoding="utf-8"))
os.makedirs(OUT, exist_ok=True)

def cost_of(tool, n):
    if tool == "batch_tool":
        return TOOLS["batch_tool"]["cost_total"]
    return TOOLS[tool]["cost_per_file"] * n

def process(files, tool):
    for name in files:
        nums = [int(x) for x in open(os.path.join(FILES, name), encoding="utf-8").read().split()]
        if tool == "slow_free":
            time.sleep(0.4)
        elif tool == "fast_paid":
            time.sleep(0.05)
        with open(os.path.join(OUT, name.replace(".txt", ".sum")), "w", encoding="utf-8") as f:
            f.write(str(sum(nums)))
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps({"tool": tool, "files": files, "cost": cost_of(tool, len(files))}, ensure_ascii=False) + "\n")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tool", required=True, choices=TOOLS.keys())
    ap.add_argument("--file"); ap.add_argument("--files")
    a = ap.parse_args()
    if a.tool == "batch_tool":
        if a.files != "all":
            sys.exit("batch_tool 仅支持 --files all")
        names = sorted(f for f in os.listdir(FILES) if f.endswith(".txt"))
        if len(names) < TOOLS["batch_tool"]["min_files"]:
            sys.exit(f"batch_tool 需要 ≥{TOOLS['batch_tool']['min_files']} 个文件")
        process(names, a.tool)
        print(f"batch done, cost {cost_of(a.tool, len(names))}")
    else:
        if not a.file:
            sys.exit("需要 --file")
        process([a.file], a.tool)
        print(f"{a.tool} done, cost {cost_of(a.tool, 1)}")

if __name__ == "__main__":
    main()
