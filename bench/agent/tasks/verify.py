# -*- coding: utf-8 -*-
"""Agent 任务自动核验：python verify.py <task_id> <workspace_dir>
workspace_dir = agent 运行后产出物所在目录（含 output 文件）。
输出：每条 checklist 的 pass/fail + JSON 汇总（可直接导入评分工作台）。
"""
import csv, hashlib, json, os, re, sys

TASKS = os.path.dirname(os.path.abspath(__file__))


def load_gold(task_id):
    return json.load(open(os.path.join(TASKS, task_id, "task.json"), encoding="utf-8"))["gold"]


def out(path):
    return os.path.join(os.path.abspath(sys.argv[2]), path)


def read_json(p):
    return json.load(open(p, encoding="utf-8"))


def read_csv_rows(p):
    with open(p, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def cjk_len(s):
    return len(re.sub(r"\s|\[S\d\]", "", s))


# ---------------- AG-H1 ----------------
def verify_h1(ws):
    gold = load_gold("AG-H1")
    res = {}
    p = out("reconciliation.csv")
    res["C1"] = (os.path.exists(p), "reconciliation.csv 不存在" if not os.path.exists(p) else "")
    if not res["C1"][0]:
        return res
    rows = read_csv_rows(p)
    res["C1"] = (set(rows[0].keys()) >= {"sku", "name", "qty", "unit_price", "amount", "source"},
                 "列名不完整")
    by_sku = {}
    for r in rows:
        by_sku[re.sub(r"\s+", "", r["sku"])] = r
    ok = len(rows) == len(gold["skus"]) and all(re.sub(r"\s+", "", s) in by_sku for s in gold["skus"])
    res["C2"] = (ok, f"行数 {len(rows)}，应为 {len(gold['skus'])}")
    c3 = True
    for r in rows:
        if re.sub(r"\s+", "", r["sku"]) == "sku-003" and int(r["qty"]) != 45:
            c3 = False
        if re.sub(r"\s+", "", r["sku"]) == "sku-008" and abs(float(r["unit_price"]) - 82.0) > 0.01:
            c3 = False
    res["C3"] = (c3, "邮件更正未生效" if not c3 else "")
    res["C4"] = ("sku-011" not in by_sku, "sku-011 仍存在")
    res["C5"] = ("sku-006" in by_sku, "sku-006 缺失")
    res["C6"] = (all((r.get("source") or "").strip() for r in rows), "source 列有空白")
    c7 = all(abs(float(r["amount"]) - (int(r["qty"]) * float(r["unit_price"]))) < 0.01 for r in rows)
    total = round(sum(float(r["amount"]) for r in rows), 2)
    res["C7"] = (c7 and total == gold["total"], f"合计 {total}，应为 {gold['total']}")
    return res


# ---------------- AG-H2 ----------------
def verify_h2(ws):
    gold = load_gold("AG-H2")
    res = {}
    rep = out("output/final_report.json")
    ok_run = os.path.exists(rep)
    res["C1"] = (ok_run, "final_report.json 未生成")
    if ok_run:
        areas = read_json(rep).get("areas", {})
        c2 = set(areas.keys()) == set(gold["totals"].keys()) and all(
            areas.get(k, {}).get("qty") == v["qty"] and abs(areas.get(k, {}).get("amount", 0) - v["amount"]) < 0.01
            for k, v in gold["totals"].items())
        res["C2"] = (c2, f"区域合计不符：应为 {gold['totals']}")
    else:
        return res
    env = os.path.join(TASKS, "AG-H2", "environment")
    changed = []
    for rel, h0 in gold["original_hashes"].items():
        p = os.path.join(env, rel)
        if not os.path.exists(p) or hashlib.sha256(open(p, "rb").read()).hexdigest()[:16] != h0:
            changed.append(rel)
    scripts_changed = [c for c in changed if c.startswith("scripts/")]
    data_untouched = "data/sales_raw.csv" not in changed
    res["C3"] = (len(scripts_changed) <= 2, f"改动了 {len(scripts_changed)} 个脚本: {scripts_changed}")
    res["C5"] = (data_untouched, "sales_raw.csv 被改动")
    res["C4"] = (res["C2"][0] and len(scripts_changed) <= 2, "流水线未真正跑通或改动异常")
    return res


# ---------------- AG-H3 ----------------
def verify_h3(ws):
    gold = load_gold("AG-H3")
    res = {}
    p = out("brief.md")
    res["C1"] = (os.path.exists(p), "brief.md 不存在")
    if not res["C1"][0]:
        return res
    text = open(p, encoding="utf-8").read()
    body = re.sub(r"^#.*$", "", text, flags=re.M).strip()
    res["C1"] = (res["C1"][0] and cjk_len(body) <= 300, f"字数 {cjk_len(body)} 超 300")
    fact_sets = {
        "C2": ["A-1", "星驰电子", "459"],
        "C3": ["B-2", "蓝湾科技", "不支持"],
        "C4": ["C-3", "云岭智造", "1299"],
    }
    for cid, facts in fact_sets.items():
        miss = [f for f in facts if f not in text]
        res[cid] = (not miss, f"缺少事实: {miss}")
    res["C5"] = ("499" not in text, "引用了被取代的旧价 499")
    res["C6"] = (len(re.findall(r"\[S\d\]", text)) >= 4, "来源编号不足 4 处")
    return res


# ---------------- AG-H4 ----------------
def verify_h4(ws):
    gold = load_gold("AG-H4")
    res = {}
    p = out("config.json")
    res["C1"] = (os.path.exists(p), "config.json 不存在")
    if not res["C1"][0]:
        return res
    cfg = read_json(p)
    f = gold["final"]
    c1 = (cfg.get("group_by") == f["group_by"] and cfg.get("fields") == f["fields"]
          and cfg.get("sort_by") == f["sort_by"] and cfg.get("sort_order") == f["sort_order"]
          and cfg.get("output_file") == f["output_file"] and cfg.get("filters") == f["filters"])
    res["C1"] = (c1, f"最终态不符：{json.dumps(cfg, ensure_ascii=False)}")
    res["C2"] = (cfg.get("sort_by") == "amount" and cfg.get("sort_order") == "desc", "排序未撤回到金额降序")
    res["C3"] = ("margin" not in json.dumps(cfg.get("fields", [])), "margin 字段未移除")
    res["C4"] = (cfg.get("output_file") == "region_report.json"
                 and cfg.get("filters", {}).get("amount_gt") == 2000, "文件名或阈值不符")
    s2 = read_json(out("snap_r2.json")) if os.path.exists(out("snap_r2.json")) else {}
    exp2 = gold["snap_r2"]
    c5 = s2.get("fields") == exp2["fields"] and s2.get("sort_by") == exp2["sort_by"] and s2.get("output_file") == exp2["output_file"]
    res["C5"] = (c5, "snap_r2 快照与第 2 轮状态不符")
    s5 = read_json(out("snap_r5.json")) if os.path.exists(out("snap_r5.json")) else {}
    exp5 = gold["snap_r5"]
    c6 = s5.get("fields") == exp5["fields"] and s5.get("filters") == exp5["filters"] and s5.get("output_file") == exp5["output_file"]
    res["C6"] = (c6, "snap_r5 快照与第 5 轮状态不符")
    res["C7"] = (res["C3"][0] and cfg.get("sort_by") == "amount", "已撤回约束复活")
    return res


# ---------------- AG-H5 ----------------
def verify_h5(ws):
    gold = load_gold("AG-H5")
    res = {}
    outdir = out("results")
    sums = gold["sums"]
    ok, wrong = 0, []
    for name, s in sums.items():
        p = os.path.join(outdir, name.replace(".txt", ".sum"))
        if os.path.exists(p):
            try:
                if int(open(p, encoding="utf-8").read().strip()) == s:
                    ok += 1
                else:
                    wrong.append(name)
            except Exception:
                wrong.append(name)
        else:
            wrong.append(name)
    res["C1"] = (ok == 20, f"正确 {ok}/20，缺失或错误: {wrong[:5]}")
    bp = out("budget.json")
    res["C2"] = (False, "budget.json 不存在")
    spend = None
    if os.path.exists(bp):
        spend = read_json(bp).get("spend")
        res["C2"] = (spend is not None and spend <= gold["budget"], f"spend={spend} 超预算 {gold['budget']}" if spend is not None else "spend 缺失")
    logp = os.path.join(ws, "tool_log.jsonl")
    log_cost = None
    if os.path.exists(logp):
        log_cost = sum(json.loads(l).get("cost", 0) for l in open(logp, encoding="utf-8") if l.strip())
    res["C3"] = (log_cost is not None and spend == log_cost,
                 f"budget spend={spend} 与工具日志累计 {log_cost} 不一致" if log_cost is not None else "tool_log.jsonl 不存在（未用工具）")
    res["C4"] = (ok == 20, "同 C1")
    res["C5"] = (os.path.exists(logp) and log_cost is not None, "无工具日志：疑似绕过工具")
    return res


VERIFIERS = {"AG-H1": verify_h1, "AG-H2": verify_h2, "AG-H3": verify_h3, "AG-H4": verify_h4, "AG-H5": verify_h5}

if __name__ == "__main__":
    task_id, ws = sys.argv[1], os.path.abspath(sys.argv[2])
    results = VERIFIERS[task_id](ws)
    passed = sum(1 for ok, _ in results.values() if ok)
    print(f"\n{task_id} 自动核验：{passed}/{len(results)} 通过")
    for cid, (ok, msg) in results.items():
        print(f"  {cid}: {'PASS' if ok else 'FAIL — ' + msg}")
    json.dump({"task_id": task_id, "results": {k: {"pass": v[0], "msg": v[1]} for k, v in results.items()},
               "passed": passed, "total": len(results)},
              open(os.path.join(ws, f"verify_{task_id}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("结果已写入", os.path.join(ws, f"verify_{task_id}.json"))
