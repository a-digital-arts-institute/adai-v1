#!/usr/bin/env python3
"""Generate research report for Digital Arts Field Research."""

import json
import glob
import os
import yaml
import re

RESULTS_DIR = "/Users/aiio/Documents/ADAI/claude/digital-arts-field-research/results"
FIELDS_YAML = "/Users/aiio/Documents/ADAI/claude/digital-arts-field-research/fields.yaml"
OUTPUT_FILE = "/Users/aiio/Documents/ADAI/claude/digital-arts-field-research/report.md"

CATEGORY_MAPPING = {
    "basic_identification": ["basic_identification", "Basic Identification"],
    "core_ideas": ["core_ideas", "Core Ideas"],
    "market_economics": ["market_economics", "Market Economics"],
    "practice_aesthetics": ["practice_aesthetics", "Practice Aesthetics"],
    "infrastructure_governance": ["infrastructure_governance", "Infrastructure Governance"],
    "field_position": ["field_position", "Field Position"],
    "attention_intention": ["attention_intention", "Attention Intention"],
    "provenance_temporality": ["provenance_temporality", "Provenance Temporality"],
    "coherence": ["coherence", "Coherence"],
    "adai_comparison": ["adai_comparison", "ADAI Comparison"],
    "regulatory_legal": ["regulatory_legal", "Regulatory Legal"],
    "ecosystem": ["ecosystem", "Ecosystem"],
}

CATEGORY_LABELS = {
    "basic_identification": "Basic Identification",
    "core_ideas": "Core Ideas & Positioning",
    "market_economics": "Market & Economic Dimensions",
    "practice_aesthetics": "Practice & Aesthetic Dimensions",
    "infrastructure_governance": "Infrastructure & Governance",
    "field_position": "Field Position & Gaps",
    "attention_intention": "Attention & Intention Dynamics",
    "provenance_temporality": "Provenance & Temporality",
    "coherence": "Coherence & Contestability",
    "adai_comparison": "A(DAI) Comparison",
    "regulatory_legal": "Regulatory & Legal Environment",
    "ecosystem": "Ecosystem Position",
}

TOC_FIELDS = ["type", "layer_mapping"]


def slugify(text):
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def get_field(data, field_name, uncertain_set):
    """Get field value from flat or nested JSON, respecting uncertain set."""
    if field_name in uncertain_set:
        return None
    # Top-level flat
    if field_name in data:
        val = data[field_name]
        if isinstance(val, str) and "[uncertain]" in val:
            return None
        return val
    # Nested
    for cat_key in CATEGORY_MAPPING:
        if cat_key in data and isinstance(data[cat_key], dict):
            if field_name in data[cat_key]:
                val = data[cat_key][field_name]
                if isinstance(val, str) and "[uncertain]" in val:
                    return None
                return val
    return None


def format_value(val):
    """Format a value for markdown display."""
    if val is None or val == "":
        return None
    if isinstance(val, list):
        if not val:
            return None
        if all(isinstance(i, dict) for i in val):
            lines = []
            for item in val:
                parts = [f"{k}: {v}" for k, v in item.items()]
                lines.append(" | ".join(parts))
            return "<br>".join(lines)
        joined = ", ".join(str(i) for i in val)
        if len(joined) > 100:
            return "<br>".join(str(i) for i in val)
        return joined
    if isinstance(val, dict):
        parts = []
        for k, v in val.items():
            parts.append(f"**{k}:** {v}")
        return "; ".join(parts)
    val = str(val)
    if "[uncertain]" in val:
        return None
    return val


def load_fields_structure():
    with open(FIELDS_YAML) as f:
        raw = yaml.safe_load(f)
    structure = {}
    for cat_key, cat_val in raw.items():
        if cat_key == "uncertain":
            continue
        if isinstance(cat_val, dict):
            structure[cat_key] = {}
            for field_key, field_def in cat_val.items():
                if isinstance(field_def, dict):
                    structure[cat_key][field_key] = field_def.get("description", field_key)
    return structure


def load_items():
    files = sorted(glob.glob(os.path.join(RESULTS_DIR, "*.json")))
    items = []
    for fp in files:
        with open(fp) as f:
            try:
                data = json.load(f)
                data["_source_file"] = os.path.basename(fp)
                items.append(data)
            except json.JSONDecodeError:
                print(f"Warning: could not parse {fp}")
    return items


def get_item_name(data):
    name = get_field(data, "name", set())
    if name:
        return str(name)
    # Fallback to filename
    fn = data.get("_source_file", "unknown")
    return fn.replace(".json", "").replace("_", " ")


def build_toc(items):
    lines = ["## Table of Contents\n"]
    for i, data in enumerate(items, 1):
        uncertain_set = set(data.get("uncertain", []))
        name = get_item_name(data)
        anchor = slugify(name)

        extras = []
        type_val = get_field(data, "type", uncertain_set)
        if type_val:
            extras.append(f"`{type_val}`")

        layer_val = get_field(data, "layer_mapping", uncertain_set)
        if layer_val:
            # Truncate if long
            if len(layer_val) > 50:
                layer_val = layer_val[:47] + "..."
            extras.append(f"A(DAI): {layer_val}")

        suffix = " — " + " | ".join(extras) if extras else ""
        lines.append(f"{i}. [{name}](#{anchor}){suffix}")

    return "\n".join(lines)


def build_item_section(data, fields_structure):
    uncertain_set = set(data.get("uncertain", []))
    name = get_item_name(data)
    anchor = slugify(name)

    lines = [f'<a name="{anchor}"></a>', f"## {name}\n"]

    for cat_key, cat_fields in fields_structure.items():
        cat_label = CATEGORY_LABELS.get(cat_key, cat_key)
        section_lines = []

        for field_key, field_desc in cat_fields.items():
            if field_key in uncertain_set:
                continue
            val = None
            # Try nested first
            cat_data = data.get(cat_key, {})
            if isinstance(cat_data, dict) and field_key in cat_data:
                raw = cat_data[field_key]
                if not (isinstance(raw, str) and "[uncertain]" in raw):
                    val = raw
            # Try flat
            if val is None and field_key in data:
                raw = data[field_key]
                if not (isinstance(raw, str) and "[uncertain]" in raw):
                    val = raw

            if val is None:
                continue

            formatted = format_value(val)
            if formatted is None:
                continue

            # Use field key as label, title-cased
            label = field_key.replace("_", " ").title()
            if len(formatted) > 120:
                section_lines.append(f"**{label}:** {field_desc}\n\n{formatted}\n")
            else:
                section_lines.append(f"**{label}:** {formatted}")

        if section_lines:
            lines.append(f"### {cat_label}\n")
            lines.extend(section_lines)
            lines.append("")

    return "\n".join(lines)


def main():
    print("Loading field structure...")
    fields_structure = load_fields_structure()

    print("Loading research items...")
    items = load_items()
    print(f"Found {len(items)} items")

    print("Building report...")
    sections = []

    # Header
    sections.append("# Digital Arts Field Research Report\n")
    sections.append(
        "> **Topic:** Digital Arts Field — Market, Practices, Infrastructure, Gaps  \n"
        "> **Items researched:** 94  \n"
        "> **Date:** 2026-03-25  \n"
        "> **Anchor project:** A(DAI) Combined Design Brief v3.0\n"
    )

    # TOC
    sections.append(build_toc(items))
    sections.append("\n---\n")

    # Item sections
    for data in items:
        sections.append(build_item_section(data, fields_structure))
        sections.append("\n---\n")

    report = "\n".join(sections)

    with open(OUTPUT_FILE, "w") as f:
        f.write(report)

    print(f"\nReport written to: {OUTPUT_FILE}")
    print(f"Size: {len(report):,} chars, ~{len(report.splitlines()):,} lines")


if __name__ == "__main__":
    main()
