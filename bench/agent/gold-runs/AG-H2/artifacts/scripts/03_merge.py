# -*- coding: utf-8 -*-
# Step 3: merge cleaned rows with the price list.
import csv, os

HERE = os.path.dirname(os.path.abspath(__file__))
CLEANED = os.path.join(HERE, "..", "data", "cleaned.csv")  # BUG: 02 输出的是 cleaned.csv

def main():
    if not os.path.exists(CLEANED):
        raise SystemExit(f"FileNotFoundError: merged input missing: {CLEANED}")
    with open(CLEANED, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"merged {len(rows)} rows")

if __name__ == "__main__":
    main()
