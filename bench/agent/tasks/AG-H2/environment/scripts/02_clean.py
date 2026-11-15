# -*- coding: utf-8 -*-
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
