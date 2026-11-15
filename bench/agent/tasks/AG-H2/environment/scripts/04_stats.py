# -*- coding: utf-8 -*-
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
