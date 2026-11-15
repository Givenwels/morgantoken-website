# -*- coding: utf-8 -*-
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
