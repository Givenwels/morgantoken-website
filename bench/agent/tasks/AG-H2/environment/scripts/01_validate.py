# -*- coding: utf-8 -*-
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
