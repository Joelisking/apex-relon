"""
Parse the Apex "Job Number Assignments.xlsx" Excel file and output a JSON
file consumed by import-jobs.ts.

Usage (from project root):
    python3 backend/scripts/parse-jobs-excel.py \
        --input  ~/Downloads/"Job Number Assignments.xlsx" \
        --output /tmp/apex-jobs-import.json
"""

import argparse
import json
import os
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("❌  openpyxl not installed. Run: pip3 install openpyxl")


def parse_args():
    parser = argparse.ArgumentParser(description="Parse Apex job assignments Excel")
    parser.add_argument(
        "--input",
        default=os.path.expanduser("~/Downloads/Job Number Assignments.xlsx"),
        help="Path to the Excel file",
    )
    parser.add_argument(
        "--output",
        default="/tmp/apex-jobs-import.json",
        help="Output JSON path",
    )
    parser.add_argument(
        "--start-row",
        type=int,
        default=3688,
        help="First data row to import (1-indexed, default: 3688 = first 2024 job)",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if not os.path.exists(args.input):
        sys.exit(f"❌  File not found: {args.input}")

    print(f"📂  Reading {args.input} …")
    wb = openpyxl.load_workbook(args.input, read_only=True, data_only=True)
    ws = wb.active

    jobs = []
    for i, row in enumerate(ws.iter_rows(min_row=args.start_row, values_only=True)):
        job_num = row[0]
        if job_num is None:
            continue

        # Normalise numeric job numbers stored as floats (e.g. 24010001.0)
        if isinstance(job_num, (int, float)):
            job_number = str(int(job_num))
        else:
            job_number = str(job_num).strip()

        name        = str(row[1]).strip() if row[1] else ""
        client_name = str(row[2]).strip() if row[2] else ""
        services    = str(row[3]).strip() if row[3] else ""
        county      = str(row[5]).strip() if row[5] else ""
        quote_val   = row[8]   # column I – "Quote"
        notes       = str(row[9]).strip() if row[9] else ""

        if not name:
            continue

        contracted_value = 0.0
        if quote_val is not None:
            try:
                contracted_value = float(quote_val)
            except (ValueError, TypeError):
                pass

        jobs.append(
            {
                "jobNumber":       job_number,
                "name":            name,
                "clientName":      client_name,
                "services":        services,
                "county":          county,
                "contractedValue": contracted_value,
                "notes":           notes,
            }
        )

    wb.close()

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)

    print(f"✅  Parsed {len(jobs)} jobs → {args.output}")


if __name__ == "__main__":
    main()
