# -*- coding: utf-8 -*-
"""Generate the 5 agent task packages (environment files, task.json with golds)."""
import csv, hashlib, io, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
TASKS = ROOT


def w(path, content, binary=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = "wb" if binary else "w"
    with open(path, mode, encoding=None if binary else "utf-8", newline="\n") as f:
        f.write(content)


def file_hashes(base):
    out = {}
    for dirpath, _, files in os.walk(base):
        for fn in files:
            p = os.path.join(dirpath, fn)
            rel = os.path.relpath(p, base).replace("\\", "/")
            out[rel] = hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
    return out


# ---------------- AG-H1 对账仲裁 ----------------
def gen_h1():
    d = os.path.join(TASKS, "AG-H1", "environment")
    v1 = [
        ("sku-001", "陶瓷马克杯", 120, 25.0, "2026-09-02"),
        ("sku-002", "帆布托特包", 80, 42.0, "2026-09-02"),
        ("sku-003", "不锈钢保温杯", 60, 68.0, "2026-09-03"),
        ("sku-004", "亚麻桌布", 35, 59.0, "2026-09-03"),
        ("sku-005", "香薰蜡烛", 200, 19.9, "2026-09-04"),
        ("sku-006", "蓝牙耳机Pro", 45, 199.0, "2026-09-05"),
        ("sku-007", "木质相框", 90, 15.5, "2026-09-05"),
        ("sku-008", "户外露营灯", 50, 88.0, "2026-09-06"),
        ("sku-009", "硅胶收纳袋", 300, 6.8, "2026-09-06"),
        ("sku-010", "羊毛围巾", 60, 79.0, "2026-09-07"),
        ("sku-011", "折叠野餐垫", 40, 95.0, "2026-09-08"),
        ("sku-012x", "旧款台灯（已停产）", 10, 120.0, "2026-09-08"),
    ]
    # v2 变化：sku-001 qty 120->135, sku-005 price 19.9->18.5, sku-007 qty 90->72；
    # v2 缺 sku-012x 行（已删除），sku-006 名称带空格
    v2_rows = []
    for sku, name, qty, price, dt in v1:
        if sku == "sku-012x":
            continue
        if sku == "sku-001":
            qty = 135
        if sku == "sku-005":
            price = 18.5
        if sku == "sku-007":
            qty = 72
        if sku == "sku-006":
            name = "蓝牙耳机 Pro"
        v2_rows.append((sku, name, qty, price, dt))

    buf = io.StringIO()
    wr = csv.writer(buf)
    wr.writerow(["sku", "name", "qty", "unit_price", "order_date"])
    wr.writerows(v1)
    w(os.path.join(d, "orders_v1.csv"), buf.getvalue())

    buf = io.StringIO()
    wr = csv.writer(buf)
    wr.writerow(["sku", "name", "qty", "unit_price", "order_date"])
    wr.writerows(v2_rows)
    w(os.path.join(d, "orders_v2.csv"), buf.getvalue())

    email = """# 供应商更正函（2026-09-10）

各位好，以下更正以本函为准，覆盖此前两版订单快照：

1. sku-003（不锈钢保温杯）：实际供应数量为 **45**，此前两版快照均为 60，请以本函为准。
2. sku-008（户外露营灯）：单价调整为 **82.0** 元，88.0 为旧价。
3. sku-011（折叠野餐垫）：该笔订单**整单取消**，不计入对账。
4. 新增订单：sku-013，羊毛抱枕，数量 55，单价 39.0，下单日期 2026-09-09。
5. 提醒：sku-006 两个版本中的名称写法不一致（有无空格），属同一商品，不要重复统计。

数据组
"""
    w(os.path.join(d, "correction_email.md"), email)

    # gold: v2 为基础 + 邮件更正（sku-003 qty=45, sku-008 price=82, sku-011 移除, sku-013 新增）
    gold_rows = []
    for sku, name, qty, price, dt in v2_rows:
        if sku == "sku-003":
            qty = 45
        if sku == "sku-008":
            price = 82.0
        if sku == "sku-011":
            continue
        gold_rows.append({"sku": sku, "name": name, "qty": qty, "unit_price": price,
                          "amount": round(qty * price, 2)})
    gold_rows.append({"sku": "sku-013", "name": "羊毛抱枕", "qty": 55, "unit_price": 39.0,
                      "amount": round(55 * 39.0, 2)})
    gold_rows.sort(key=lambda r: r["sku"])
    task = {
        "id": "AG-H1",
        "title": "三源对账与冲突仲裁",
        "dimensions": ["信息冲突处理", "长时程一致性"],
        "difficulty": "困难",
        "environment": {
            "files": ["orders_v1.csv", "orders_v2.csv", "correction_email.md"],
            "description": "两版订单快照（v1 旧、v2 新，互有出入）+ 一封供应商更正函。没有任何单一文件是完整真相：v2 是最新基础，但 3 处以邮件为准，1 单被取消，1 单只在邮件里，同一商品在两版中的名称写法不一致。"
        },
        "instruction": [
            "阅读目录下的 orders_v1.csv、orders_v2.csv 和 correction_email.md，生成最终对账单 reconciliation.csv，列：sku,name,qty,unit_price,amount,source。"
        ],
        "checklist": [
            {"id": "C1", "check": "输出文件 reconciliation.csv 存在且列名正确", "verify": "auto"},
            {"id": "C2", "check": "11 行商品齐全：v2 的 11 个 sku + 邮件新增的 sku-013，共 12 行", "verify": "auto"},
            {"code": "", "id": "C3", "check": "邮件更正生效：sku-003 qty=45、sku-008 price=82.0", "verify": "auto"},
            {"id": "C4", "check": "sku-011（整单取消）未出现在对账单中", "verify": "auto"},
            {"id": "C5", "check": "sku-006 只出现一次（名称写法差异被识别为同一商品）", "verify": "auto"},
            {"id": "C6", "check": "source 列对每行标注了数据依据（如 v2+邮件更正）", "verify": "auto"},
            {"id": "C7", "check": "amount = qty × unit_price，计算正确", "verify": "auto"}
        ],
        "traps": ["邮件更正 vs 新版快照的优先级", "整单取消的行", "只在邮件中存在的新增行", "名称空格差异导致重复统计"],
        "gold": {"rows": gold_rows, "skus": [r["sku"] for r in gold_rows], "total": round(sum(r["amount"] for r in gold_rows), 2)}
    }
    w(os.path.join(TASKS, "AG-H1", "task.json"), json.dumps(task, ensure_ascii=False, indent=1))


# ---------------- AG-H2 流水线修复 ----------------
def gen_h2():
    d = os.path.join(TASKS, "AG-H2", "environment")
    rows = [
        ("SO-1001", "华东", "键盘", 3, 129.0, "2026-10-01"),
        ("SO-1002", "华南", "鼠标", 0, 89.0, "2026-10-01"),
        ("SO-1003", "华东", "键盘", 2, 129.0, "2026-10-02"),
        ("SO-1003", "华东", "键盘", 2, 129.0, "2026-10-02"),  # 重复行
        ("SO-1004", "华北", "显示器", 1, 999.0, "2026-10-03"),
        ("SO-1005", "华南", "键盘", 5, 119.0, "2026-10-03"),
        ("SO-1006", "华北", "鼠标", -2, 89.0, "2026-10-04"),  # qty<=0 剔除
        ("SO-1007", "华东", "显示器", 2, 959.0, "2026-10-05"),
        ("SO-1008", "西南", "键盘", 4, 125.0, "2026-10-05"),
        ("SO-1009", "华东", "鼠标", 6, 85.0, "2026-10-06"),
        ("SO-1010", "华北", "键盘", 1, 135.0, "2026-10-07"),
        ("SO-1011", "西南", "显示器", 3, 979.0, "2026-10-08"),
    ]
    buf = io.StringIO()
    wr = csv.writer(buf)
    wr.writerow(["order_id", "area", "product", "qty", "price", "date"])
    wr.writerows(rows)
    w(os.path.join(d, "data", "sales_raw.csv"), buf.getvalue())

    w(os.path.join(d, "scripts", "01_validate.py"), '''# -*- coding: utf-8 -*-
# Step 1: validate raw input.
import csv, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "data", "sales_raw.csv")

def main():
    with open(RAW, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    bad = [r for r in rows if not r["order_id"]]
    print(f"validated {len(rows)} rows, {len(bad)} missing order_id")

if __name__ == "__main__":
    main()
''')
    w(os.path.join(d, "scripts", "02_clean.py"), '''# -*- coding: utf-8 -*-
# Step 2: clean rows — drop qty<=0, dedupe by order_id (keep first).
import csv, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "data", "sales_raw.csv")
OUT = os.path.join(HERE, "..", "data", "cleaned.csv")

def main():
    with open(RAW, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    seen, out = set(), []
    for r in rows:
        if int(r["qty"]) <= 0:
            continue
        if r["order_id"] in seen:
            continue
        seen.add(r["order_id"])
        out.append(r)
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(out)
    json.dump({"kept": len(out)}, open(os.path.join(HERE, "..", "data", "clean_meta.json"), "w"))

if __name__ == "__main__":
    main()
''')
    w(os.path.join(d, "scripts", "03_merge.py"), '''# -*- coding: utf-8 -*-
# Step 3: merge cleaned rows with the price list.
import csv, os

HERE = os.path.dirname(os.path.abspath(__file__))
CLEANED = os.path.join(HERE, "..", "data", "cleaned_final.csv")  # BUG: 02 输出的是 cleaned.csv

def main():
    if not os.path.exists(CLEANED):
        raise SystemExit(f"FileNotFoundError: merged input missing: {CLEANED}")
    with open(CLEANED, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"merged {len(rows)} rows")

if __name__ == "__main__":
    main()
''')
    w(os.path.join(d, "scripts", "04_stats.py"), '''# -*- coding: utf-8 -*-
# Step 4: per-area totals.
import csv, os, json
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CLEANED = os.path.join(HERE, "..", "data", "cleaned.csv")

def main():
    with open(CLEANED, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    totals = defaultdict(lambda: {"qty": 0, "amount": 0.0})
    for r in rows:
        t = totals[r["area"]]
        t["qty"] += int(r["quantity"])  # BUG: 实际列名是 qty
        t["amount"] += int(r["quantity"]) * float(r["price"])
    json.dump(dict(totals), open(os.path.join(HERE, "..", "data", "stats.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
''')
    w(os.path.join(d, "scripts", "05_report.py"), '''# -*- coding: utf-8 -*-
# Step 5: final report.
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
STATS = os.path.join(HERE, "..", "data", "stats.json")

def main():
    stats = json.load(open(STATS, encoding="utf-8"))
    report = {"areas": stats, "area_count": len(stats)}
    out = os.path.join(HERE, "..", "output")
    os.makedirs(out, exist_ok=True)
    json.dump(report, open(os.path.join(out, "final_report.json"), "w"), ensure_ascii=False, indent=1)
    print("final_report.json written")

if __name__ == "__main__":
    main()
''')
    w(os.path.join(d, "run.bat"), '''@echo off
cd /d %~dp0
python scripts\\01_validate.py || goto :fail
python scripts\\02_clean.py || goto :fail
python scripts\\03_merge.py || goto :fail
python scripts\\04_stats.py || goto :fail
python scripts\\05_report.py || goto :fail
echo PIPELINE OK
exit /b 0
:fail
echo PIPELINE FAILED
exit /b 1
''')
    hashes = file_hashes(d)
    # gold: clean 后按规则剔除（qty<=0、order_id 重复），按区域合计
    kept = [r for r in rows if r[3] > 0]
    seen, dedup = set(), []
    for r in kept:
        if r[0] in seen:
            continue
        seen.add(r[0])
        dedup.append(r)
    totals = {}
    for r in dedup:
        t = totals.setdefault(r[1], {"qty": 0, "amount": 0.0})
        t["qty"] += r[3]
        t["amount"] = round(t["amount"] + r[3] * r[4], 2)
    task = {
        "id": "AG-H2",
        "title": "埋坑流水线修复（最小改动）",
        "dimensions": ["诊断与级联恢复", "执行边界"],
        "difficulty": "困难",
        "environment": {
            "files": ["run.bat", "scripts/01_validate.py", "scripts/02_clean.py", "scripts/03_merge.py", "scripts/04_stats.py", "scripts/05_report.py", "data/sales_raw.csv"],
            "description": "五步数据处理流水线，埋了 2 个 bug：03 引用了不存在的 cleaned_final.csv（02 实际输出 cleaned.csv）；04 读取的列名 quantity 与实际列名 qty 不符。两个 bug 依次暴露——修好第一个才会撞上第二个。"
        },
        "instruction": [
            "运行 run.bat，让流水线端到端跑通并生成 output/final_report.json。约束：最小改动修复，不允许重写架构或重排步骤；除必要的 bug 修复外不得改动其他文件。"
        ],
        "checklist": [
            {"id": "C1", "check": "run.bat 端到端跑通，exit 0，生成 output/final_report.json", "verify": "auto"},
            {"id": "C2", "check": "final_report.json 的各区域 qty/amount 与数据正确值一致", "verify": "auto"},
            {"id": "C3", "check": "改动范围最小：被修改的脚本 ≤ 2 个，未重写架构", "verify": "auto"},
            {"id": "C4", "check": "两个 bug 都修了（只修一个时流水线仍会在下一步失败）", "verify": "auto"},
            {"id": "C5", "check": "未改动 data/sales_raw.csv 和清理规则本身", "verify": "auto"}
        ],
        "traps": ["文件名不匹配的误导性报错", "修完第一个 bug 才暴露的第二个 bug", "最小改动约束"],
        "gold": {"totals": totals, "kept_rows": len(dedup), "original_hashes": hashes}
    }
    w(os.path.join(TASKS, "AG-H2", "task.json"), json.dumps(task, ensure_ascii=False, indent=1))


# ---------------- AG-H3 多源简报 ----------------
def gen_h3():
    d = os.path.join(TASKS, "AG-H3", "environment")

    def page(title, date, body):
        return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>{title}</title></head>
<body><article><h1>{title}</h1><p class="pubdate">发布日期：{date}</p>
{body}</article></body></html>'''

    w(os.path.join(d, "pages", "s1.html"), page("无线充电技术白皮书（摘要）", "2026-09-12",
        "<p>型号 A-1（厂商：星驰电子）与本季度起标配 15W 无线充电，支持 Qi2 协议。</p><p>型号 B-2 的无线充电方案仍在评估，本白皮书不作结论。</p>"))
    w(os.path.join(d, "pages", "s2.html"), page("2026 春季价格速览（已被 10 月刊取代）", "2026-03-20",
        "<p>本刊价格为春季活动价，后续以 10 月刊为准。</p><table><tr><th>型号</th><th>价格</th></tr><tr><td>A-1</td><td>499 元</td></tr></table>"))
    w(os.path.join(d, "pages", "s3.html"), page("型号 B-2 测评", "2026-08-02",
        "<p>实测确认：型号 B-2 <strong>不支持</strong>无线充电，仅提供有线快充。</p><p>生产厂商：蓝湾科技。</p>"))
    w(os.path.join(d, "pages", "s4.html"), page("型号 C-3 产品页", "2026-09-28",
        '''<p>详细规格见 <a href="specs.html">specs.html</a>（注：该页已下线，镜像存档见 s6.html）。</p>
<table><tr><th>型号</th><th rowspan="2">C-3</th></tr>
<tr><td>无线充电</td></tr>
<tr><td>支持，厂商：云岭智造</td></tr></table>
<p>定价与发售信息见后续刊。</p>'''))
    w(os.path.join(d, "pages", "s5.html"), page("2026 秋季价格月刊", "2026-10-15",
        "<p>本刊为最新价格口径，取代春季速览。</p><table><tr><th>型号</th><th>价格</th></tr><tr><td>A-1</td><td>459 元</td></tr></table>"))
    w(os.path.join(d, "pages", "s6.html"), page("型号 C-3 规格镜像存档", "2026-10-02",
        "<p>本页为 specs.html 的镜像存档：型号 C-3 支持 10W 无线充电，生产厂商：云岭智造，官方定价 1299 元。</p>"))
    w(os.path.join(d, "sources_index.md"), """# 资料编号对照

- S1 = pages/s1.html
- S2 = pages/s2.html
- S3 = pages/s3.html
- S4 = pages/s4.html
- S5 = pages/s5.html
- S6 = pages/s6.html
""")
    task = {
        "id": "AG-H3",
        "title": "六源简报：冲突仲裁与产出约束",
        "dimensions": ["信息冲突处理", "指令遵循（产出约束）", "交付质量"],
        "difficulty": "困难",
        "environment": {
            "files": ["pages/s1.html", "pages/s2.html", "pages/s3.html", "pages/s4.html", "pages/s5.html", "pages/s6.html", "sources_index.md"],
            "description": "6 份资料页：价格有新旧两版（按发布日期取新）、一个关键事实藏在 rowspan 合并表格里、一个失效链接旁有镜像存档、一个负向事实（不支持）。"
        },
        "instruction": [
            "阅读 pages/ 下全部资料，写一份简报 brief.md 回答：哪些型号支持无线充电、各自由哪家厂商生产、最新价格分别是多少？要求：不超过 300 字；每个事实后附来源编号（如 [S1]）；资料冲突时按发布日期取新；不引用已被取代的旧价格。"
        ],
        "checklist": [
            {"id": "C1", "check": "brief.md 存在，≤300 字（不含编号标记）", "verify": "auto"},
            {"id": "C2", "check": "A-1：支持无线充电、厂商星驰电子、最新价 459 元（[S5] 而非 [S2]）", "verify": "auto"},
            {"id": "C3", "check": "B-2：不支持无线充电，厂商蓝湾科技（[S3]）", "verify": "auto"},
            {"id": "C4", "check": "C-3：支持无线充电、厂商云岭智造、1299 元（[S4]+[S6]）", "verify": "auto"},
            {"id": "C5", "check": "全文没有引用被取代的旧价 499", "verify": "auto"},
            {"id": "C6", "check": "每个事实都有来源编号标注", "verify": "auto"}
        ],
        "traps": ["新旧价格冲突需按日期仲裁", "rowspan 表格里的关键事实", "失效链接 + 镜像页", "负向事实（不支持）也要写"],
        "gold": {"facts": ["A-1 星驰电子 459", "B-2 蓝湾科技 不支持", "C-3 云岭智造 1299"], "forbidden": ["499"]}
    }
    w(os.path.join(TASKS, "AG-H3", "task.json"), json.dumps(task, ensure_ascii=False, indent=1))


# ---------------- AG-H4 需求变更风暴 ----------------
def gen_h4():
    d = os.path.join(TASKS, "AG-H4", "environment")
    w(os.path.join(d, "requirements.md"), """# 报表生成需求（初始版 v0）

生成区域销售报表的输出配置 config.json，字段：
- group_by: 汇总维度（当前：week，按周汇总）
- fields: 包含字段（当前：channel 销量 amount）
- sort_by: 排序字段（当前：amount），sort_order: desc
- output_file: 输出文件名（当前：weekly_report.json）
- filters: 过滤条件（当前：无）
- extras: 附加字段（当前：无）
""")
    w(os.path.join(d, "rounds.txt"), """R1 用户：排序改成按销量（sales）降序。
R2 用户：字段里加一个毛利率（margin），保留两位小数。
R3 用户：不对，排序还是按金额降序吧，销量排序太抖。
R4 用户：输出文件名改成 region_report.json。
R5 用户：加个过滤：只保留金额（amount）大于 1000 的区域。
R6 用户：毛利率那个字段不要了，撤掉。
R7 用户：过滤阈值从 1000 提到 2000。
""")
    rows = [
        ("华东", "线上", 320, 4600.0),
        ("华东", "线下", 210, 3100.0),
        ("华南", "线上", 260, 3900.0),
        ("华南", "线下", 150, 1800.0),
        ("华北", "线上", 180, 2300.0),
        ("华北", "线下", 90, 900.0),
        ("西南", "线上", 120, 1500.0),
        ("西南", "线下", 60, 700.0),
        ("东北", "线上", 80, 1100.0),
        ("西北", "线下", 40, 500.0),
    ]
    buf = io.StringIO()
    wr = csv.writer(buf)
    wr.writerow(["region", "channel", "sales", "amount"])
    wr.writerows(rows)
    w(os.path.join(d, "data.csv"), buf.getvalue())

    # 演化终态（人工推导的金标准）
    final = {
        "group_by": "week",
        "fields": ["channel", "sales", "amount"],
        "sort_by": "amount", "sort_order": "desc",
        "output_file": "region_report.json",
        "filters": {"amount_gt": 2000},
        "extras": []
    }
    snap_r2 = {"group_by": "week", "fields": ["channel", "sales", "amount", "margin"], "sort_by": "sales",
               "sort_order": "desc", "output_file": "weekly_report.json", "filters": {}, "extras": ["margin:2位小数"]}
    snap_r5 = {"group_by": "week", "fields": ["channel", "sales", "amount", "margin"], "sort_by": "amount",
               "sort_order": "desc", "output_file": "region_report.json", "filters": {"amount_gt": 1000},
               "extras": ["margin:2位小数"]}
    task = {
        "id": "AG-H4",
        "title": "七轮需求变更风暴",
        "dimensions": ["多轮状态维护", "撤回与覆盖", "指令遵循"],
        "difficulty": "困难+",
        "environment": {
            "files": ["requirements.md", "rounds.txt", "data.csv"],
            "description": "初始需求文档 + 连续 7 轮变更对话（加字段、撤回、改排序、改文件名、加过滤、再撤回、调阈值）。最终状态必须逐轮演化得出，只看最后一句话推不出来。"
        },
        "instruction": [
            "阅读 requirements.md（初始配置）和 rounds.txt（7 轮用户变更），按每一轮顺序演化配置，输出：config.json（最终态）、snap_r2.json（第 2 轮结束时的完整配置快照）、snap_r5.json（第 5 轮结束时的完整配置快照）。快照结构须与 config.json 相同。"
        ],
        "checklist": [
            {"id": "C1", "check": "config.json 最终态与 7 轮演化后的正确状态完全一致", "verify": "auto"},
            {"id": "C2", "check": "sort_by=amount（R3 撤回了 R1 的销量排序）", "verify": "auto"},
            {"id": "C3", "check": "margin 字段已移除（R6 撤回了 R2 的添加），最终 fields 无 margin", "verify": "auto"},
            {"id": "C4", "check": "output_file=region_report.json，filters.amount_gt=2000（R4/R5/R7）", "verify": "auto"},
            {"id": "C5", "check": "snap_r2.json 与第 2 轮结束时的有效状态一致", "verify": "auto"},
            {"id": "C6", "check": "snap_r5.json 与第 5 轮结束时的有效状态一致（此时 margin 还在、阈值还是 1000）", "verify": "auto"},
            {"id": "C7", "check": "未把已撤回的约束复活（最终配置里没有 margin、没有 sales 排序）", "verify": "auto"}
        ],
        "traps": ["R3 撤回 R1", "R6 撤回 R2（但 R5/R7 不受影响）", "快照必须反映当时态而非最终态", "最终态靠逐轮演化"],
        "gold": {"final": final, "snap_r2": snap_r2, "snap_r5": snap_r5}
    }
    w(os.path.join(TASKS, "AG-H4", "task.json"), json.dumps(task, ensure_ascii=False, indent=1))


# ---------------- AG-H5 预算内批处理 ----------------
def gen_h5():
    d = os.path.join(TASKS, "AG-H5", "environment")
    sums = {}
    for i in range(1, 21):
        nums = [(i * 7 + j * 13) % 97 + 3 for j in range(8)]
        name = f"data_{i:02d}.txt"
        w(os.path.join(d, "files", name), "\n".join(map(str, nums)) + "\n")
        sums[name] = sum(nums)
    tools = {
        "slow_free": {"cost_per_file": 1, "desc": "便宜稳:每文件 1 预算,单文件一次调用"},
        "fast_paid": {"cost_per_file": 3, "desc": "每文件 3 预算"},
        "batch_tool": {"cost_total": 20, "min_files": 15, "desc": "一次性处理全部文件,总价 20 预算,仅当文件数 ≥15 可用"}
    }
    w(os.path.join(d, "tools_cost.json"), json.dumps(tools, ensure_ascii=False, indent=1))
    w(os.path.join(d, "scripts", "run_tool.py"), '''# -*- coding: utf-8 -*-
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
        f.write(json.dumps({"tool": tool, "files": files, "cost": cost_of(tool, len(files))}, ensure_ascii=False) + "\\n")

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
''')
    budget = 25
    task = {
        "id": "AG-H5",
        "title": "预算约束下的工具编排",
        "dimensions": ["任务规划", "成本效率", "约束遵守"],
        "difficulty": "困难",
        "environment": {
            "files": ["tools_cost.json", "scripts/run_tool.py", "files/（20 个数据文件）"],
            "description": "20 个数据文件 + 一个模拟工具（三种调用方式，成本不同：slow_free 1/文件、fast_paid 3/文件、batch_tool 总价 20 但须一次处理全部）。全部完成且总成本 ≤ 25。存在多条可行路径，铺张的路径会超支。"
        },
        "instruction": [
            "用 scripts/run_tool.py 把 files/ 里 20 个数据文件的数字求和处理完（结果写入 results/，工具自动完成），并在 budget.json 里记录你的成本账本 {\"spend\": 数字}。硬约束：总成本 ≤ 25。"
        ],
        "checklist": [
            {"id": "C1", "check": "results/ 下 20 个 .sum 文件齐全且数值正确", "verify": "auto"},
            {"id": "C2", "check": "budget.json 的 spend ≤ 25", "verify": "auto"},
            {"id": "C3", "check": "spend 与 tool_log.jsonl 的累计成本一致（没有少报）", "verify": "auto"},
            {"id": "C4", "check": "20 个文件全部处理，没有遗漏", "verify": "auto"},
            {"id": "C5", "check": "工具调用方式符合 run_tool.py 的用法（没有绕过工具直接手写结果）", "verify": "auto"}
        ],
        "traps": ["全用 fast_paid 会超支（60>25）", "batch_tool 有最少文件数门槛", "账本要与工具日志对得上，不能少报成本"],
        "gold": {"sums": sums, "budget": budget, "min_cost": 20}
    }
    w(os.path.join(TASKS, "AG-H5", "task.json"), json.dumps(task, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    gen_h1(); gen_h2(); gen_h3(); gen_h4(); gen_h5()
    print("5 个任务包生成完毕 ->", TASKS)
    for t in sorted(os.listdir(TASKS)):
        tp = os.path.join(TASKS, t, "task.json")
        if os.path.exists(tp):
            d = json.load(open(tp, encoding="utf-8"))
            print(t, d["title"], "| checklist", len(d["checklist"]))
