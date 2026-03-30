#!/usr/bin/env python3
"""Validator adapted for the nested-dict fields.yaml format used in garden-logic-research."""

import json
import sys
from collections import defaultdict
from pathlib import Path

import yaml

_SKIP_KEYS = {"_source_file", "uncertain"}

CATEGORY_KEYS = {
    "identity", "conceptual", "technical", "garden_logic_comparative",
    "critical", "governance", "materiality"
}


def load_fields_yaml(fields_path):
    with fields_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    all_fields = set()
    field_categories = {}
    fc = data.get("field_categories", {})
    for cat_name, cat_body in fc.items():
        if not isinstance(cat_body, dict):
            continue
        for field_name in cat_body.get("fields", {}):
            all_fields.add(field_name)
            field_categories[field_name] = cat_name
    return all_fields, set(), field_categories  # no required fields in this schema


def extract_json_fields(data):
    fields = set()
    if isinstance(data, dict):
        for k, v in data.items():
            if k in _SKIP_KEYS:
                continue
            if k in CATEGORY_KEYS and isinstance(v, dict):
                fields.update(v.keys())
            else:
                fields.add(k)
    return fields


def validate_json(json_path, all_fields, required_fields, field_categories):
    with json_path.open(encoding="utf-8") as f:
        data = json.load(f)
    json_fields = extract_json_fields(data)
    covered = all_fields & json_fields
    missing = all_fields - json_fields
    extra = json_fields - all_fields
    missing_by_category = defaultdict(list)
    for field in missing:
        missing_by_category[field_categories.get(field, "Unknown")].append(field)
    return {
        "file": json_path.name,
        "total_defined": len(all_fields),
        "covered": len(covered),
        "missing": len(missing),
        "extra": len(extra),
        "coverage_rate": len(covered) / len(all_fields) * 100 if all_fields else 100,
        "missing_fields": sorted(missing),
        "missing_by_category": {k: sorted(v) for k, v in missing_by_category.items()},
        "extra_fields": sorted(extra),
        "valid": len(missing) == 0,
    }


def print_result(result):
    status = "PASS" if result["valid"] else "FAIL"
    line = "=" * 60
    print(f"\n{line}")
    print(f"[{status}] {result['file']}")
    print(line)
    print(f"Coverage: {result['coverage_rate']:.1f}% ({result['covered']}/{result['total_defined']})")
    if result["missing_fields"]:
        print(f"\n[WARN] Missing fields ({len(result['missing_fields'])}):")
        for cat in sorted(result["missing_by_category"]):
            fields = result["missing_by_category"][cat]
            if fields:
                print(f"  [{cat}]: {', '.join(fields)}")
    if result["extra_fields"]:
        print(f"\n[INFO] Extra fields ({len(result['extra_fields'])}): {', '.join(result['extra_fields'][:10])}")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--fields", "-f", type=str, default="fields.yaml")
    parser.add_argument("--json", "-j", type=str, nargs="*")
    parser.add_argument("--dir", "-d", type=str, default="results")
    args = parser.parse_args()
    fields_path = Path(args.fields)
    if not fields_path.exists():
        print(f"[ERROR] fields.yaml not found: {fields_path}")
        sys.exit(1)
    all_fields, required_fields, field_categories = load_fields_yaml(fields_path)
    print(f"Field definition: {fields_path} ({len(all_fields)} fields)")
    json_files = (
        [Path(p) for p in args.json]
        if args.json
        else sorted(Path(args.dir).glob("*.json")) if Path(args.dir).exists() else []
    )
    if not json_files:
        print("[WARN] No JSON files found")
        sys.exit(0)
    results = []
    for jp in json_files:
        if not jp.exists():
            print(f"[WARN] Not found: {jp}")
            continue
        r = validate_json(jp, all_fields, required_fields, field_categories)
        results.append(r)
        print_result(r)
    line = "=" * 60
    print(f"\n{line}\nSummary\n{line}")
    passed = sum(1 for r in results if r["valid"])
    avg = sum(r["coverage_rate"] for r in results) / len(results) if results else 0
    print(f"Passed: {passed}/{len(results)}, Avg coverage: {avg:.1f}%")
    if passed < len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
