#!/usr/bin/env python3
"""
Generate comparative analysis report from Garden Logic research JSON files.
Includes comparative analysis against the Garden Logic design brief.
TOC fields: type + layer_mapping + what_adai_should_adopt
"""

import json
import os
import re
import yaml
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).parent
RESULTS_DIR = BASE_DIR / "results"
FIELDS_PATH = BASE_DIR / "fields.yaml"
OUTLINE_PATH = BASE_DIR / "outline.yaml"
OUTPUT_PATH = BASE_DIR / "report.md"

# Category mappings for nested JSON structure
CATEGORY_MAPPING = {
    "identity": ["identity", "Identity"],
    "conceptual": ["conceptual", "Conceptual"],
    "technical": ["technical", "Technical"],
    "garden_logic_comparative": ["garden_logic_comparative", "Garden Logic Comparative"],
    "critical": ["critical", "Critical"],
    "governance": ["governance", "Governance"],
    "materiality": ["materiality", "Materiality"],
}

# TOC fields
TOC_FIELDS = [
    ("type", "identity"),
    ("layer_mapping", "garden_logic_comparative"),
    ("what_adai_should_adopt", "garden_logic_comparative"),
]

def load_yaml(path):
    with open(path) as f:
        return yaml.safe_load(f)

def load_json(path):
    with open(path) as f:
        return json.load(f)

def slugify(name):
    s = name.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s]+', '-', s)
    return s

def get_nested_value(data, field_name, category_name=None):
    """Get value from nested JSON structure."""
    # Try direct top-level
    if field_name in data:
        return data[field_name]

    # Try within specific category
    if category_name:
        for key in CATEGORY_MAPPING.get(category_name, [category_name]):
            if key in data and isinstance(data[key], dict):
                if field_name in data[key]:
                    return data[key][field_name]

    # Try all nested dicts
    for k, v in data.items():
        if isinstance(v, dict) and field_name in v:
            return v[field_name]

    return None

def is_uncertain(value, field_name, uncertain_list):
    """Check if a field value should be skipped."""
    if value is None or value == "":
        return True
    if field_name in uncertain_list:
        return True
    if isinstance(value, str) and "[uncertain]" in value:
        return True
    return False

def format_value(value, indent=0):
    """Format complex values for markdown."""
    if isinstance(value, list):
        if not value:
            return "_empty_"
        if all(isinstance(v, dict) for v in value):
            lines = []
            for item in value:
                parts = [f"**{k}**: {v}" for k, v in item.items()]
                lines.append("  " * indent + "- " + " | ".join(parts))
            return "\n".join(lines)
        elif len(value) <= 5 and all(isinstance(v, str) and len(v) < 60 for v in value):
            return ", ".join(str(v) for v in value)
        else:
            return "\n".join("  " * indent + f"- {v}" for v in value)
    elif isinstance(value, dict):
        lines = []
        for k, v in value.items():
            formatted = format_value(v, indent + 1)
            lines.append(f"  " * indent + f"- **{k}**: {formatted}")
        return "\n".join(lines)
    elif isinstance(value, str) and len(value) > 200:
        return value
    else:
        return str(value)

def truncate(text, max_len=120):
    """Truncate text for TOC display."""
    if not text or not isinstance(text, str):
        return "_—_"
    text = text.replace("\n", " ").strip()
    # Remove [uncertain] markers
    text = text.replace("[uncertain]", "").strip()
    if len(text) > max_len:
        return text[:max_len].rsplit(" ", 1)[0] + "…"
    return text

def group_items_by_type(items_data):
    """Group items by their type field."""
    groups = defaultdict(list)
    for item in items_data:
        t = get_nested_value(item["data"], "type", "identity") or "unknown"
        groups[t].append(item)
    return groups

def generate_comparative_synthesis(groups, all_items):
    """Generate cross-cutting comparative analysis sections."""
    sections = []

    # 1. Intention vs Attention spectrum
    sections.append("## Comparative Synthesis\n")
    sections.append("### Intention vs. Attention Spectrum\n")
    sections.append("How each item positions itself relative to A(DAI)'s core distinction:\n")

    intention_items = []
    attention_items = []
    neither_items = []

    for item in all_items:
        iva = get_nested_value(item["data"], "intention_vs_attention", "garden_logic_comparative") or ""
        name = get_nested_value(item["data"], "name", "identity") or item["filename"]
        if "intention" in iva.lower()[:80]:
            intention_items.append((name, truncate(iva, 100)))
        elif "attention" in iva.lower()[:80]:
            attention_items.append((name, truncate(iva, 100)))
        else:
            neither_items.append((name, truncate(iva, 100)))

    sections.append(f"**Intention-aligned** ({len(intention_items)} items):\n")
    for name, desc in intention_items:
        sections.append(f"- **{name}**: {desc}")
    sections.append(f"\n**Attention-aligned** ({len(attention_items)} items):\n")
    for name, desc in attention_items:
        sections.append(f"- **{name}**: {desc}")
    sections.append(f"\n**Neither / Orthogonal** ({len(neither_items)} items):\n")
    for name, desc in neither_items:
        sections.append(f"- **{name}**: {desc}")
    sections.append("")

    # 2. Layer mapping distribution
    sections.append("### Garden Logic Layer Distribution\n")
    sections.append("Which layers of the Garden Logic architecture are supported by existing precedents:\n")
    layer_counts = defaultdict(list)
    for item in all_items:
        lm = get_nested_value(item["data"], "layer_mapping", "garden_logic_comparative") or "unmapped"
        name = get_nested_value(item["data"], "name", "identity") or item["filename"]
        # Extract primary layer
        for layer in ["substrate", "sensing", "prompt", "participation", "none"]:
            if layer in lm.lower():
                layer_counts[layer].append(name)
                break
        else:
            layer_counts["other"].append(name)

    for layer in ["substrate", "sensing", "prompt", "participation", "none", "other"]:
        if layer in layer_counts:
            sections.append(f"**{layer.title()}** ({len(layer_counts[layer])} items): {', '.join(layer_counts[layer])}\n")
    sections.append("")

    # 3. Coherence vs consensus
    sections.append("### Coherence vs. Consensus\n")
    sections.append("A(DAI)'s commitment to coherence-without-consensus has **no direct precedent** in any surveyed system. The closest approaches:\n")
    for item in all_items:
        cvc = get_nested_value(item["data"], "coherence_vs_consensus", "garden_logic_comparative") or ""
        name = get_nested_value(item["data"], "name", "identity") or item["filename"]
        if "coherence" in cvc.lower() and "consensus" not in cvc.lower()[:30]:
            sections.append(f"- **{name}**: {truncate(cvc, 150)}")
    sections.append("")

    # 4. Key adoptions
    sections.append("### What A(DAI) Should Adopt (Aggregated)\n")
    sections.append("The most actionable technical and conceptual patterns across all 72 items:\n")
    for item in all_items:
        adopt = get_nested_value(item["data"], "what_adai_should_adopt", "garden_logic_comparative") or ""
        name = get_nested_value(item["data"], "name", "identity") or item["filename"]
        if adopt and "[uncertain]" not in adopt:
            sections.append(f"- **{name}**: {truncate(adopt, 200)}")
    sections.append("")

    # 5. Key refusals
    sections.append("### What A(DAI) Should Refuse (Aggregated)\n")
    for item in all_items:
        refuse = get_nested_value(item["data"], "what_adai_should_refuse", "garden_logic_comparative") or ""
        name = get_nested_value(item["data"], "name", "identity") or item["filename"]
        if refuse and "[uncertain]" not in refuse:
            sections.append(f"- **{name}**: {truncate(refuse, 200)}")
    sections.append("")

    # 6. Structural tensions
    sections.append("### Structural Tensions with A(DAI)\n")
    sections.append("Productive tensions that challenge A(DAI)'s assumptions:\n")
    for item in all_items:
        tension = get_nested_value(item["data"], "structural_tension", "garden_logic_comparative") or ""
        name = get_nested_value(item["data"], "name", "identity") or item["filename"]
        if tension and "[uncertain]" not in tension:
            sections.append(f"- **{name}**: {truncate(tension, 200)}")
    sections.append("")

    return "\n".join(sections)


def main():
    # Load configs
    fields_yaml = load_yaml(FIELDS_PATH)
    outline_yaml = load_yaml(OUTLINE_PATH)

    topic = outline_yaml.get("topic", "Research Report")
    comparative_anchor = outline_yaml.get("comparative_anchor", "")
    comparative_dimensions = outline_yaml.get("comparative_dimensions", [])

    # Get field categories
    field_categories = fields_yaml.get("field_categories", {})
    uncertain_global = fields_yaml.get("uncertain", [])

    # Load outline items for ordering
    outline_items = outline_yaml.get("items", [])
    outline_order = {item["name"]: item.get("id", i) for i, item in enumerate(outline_items)}
    outline_briefs = {item["name"]: item.get("brief", "") for item in outline_items}
    outline_relevance = {item["name"]: item.get("garden_logic_relevance", "") for item in outline_items}

    # Load all JSON results
    all_items = []
    for fn in sorted(RESULTS_DIR.glob("*.json")):
        data = load_json(fn)
        name = get_nested_value(data, "name", "identity") or fn.stem
        uncertain_list = data.get("uncertain", []) + uncertain_global
        all_items.append({
            "filename": fn.stem,
            "name": name,
            "data": data,
            "uncertain": uncertain_list,
            "order": outline_order.get(name, 999),
        })

    # Sort by outline order
    all_items.sort(key=lambda x: x["order"])

    # Group by type
    groups = group_items_by_type(all_items)

    # Type display names
    type_labels = {
        "ontology": "Ontology & Knowledge Representation",
        "neural-kg": "Neural Knowledge Graphs",
        "media-data": "Media as Training Data",
        "intention-economy": "Intention Economy",
        "attention-critique": "Attention Economy Critique",
        "provocation": "Provocations & Artistic Precedents",
        "sensing": "Sensing Mechanisms That Precede Movements",
    }

    type_order = list(type_labels.keys())

    # === BUILD REPORT ===
    lines = []

    # Title
    lines.append(f"# {topic}\n")
    lines.append(f"**Comparative anchor:** {comparative_anchor}\n")
    lines.append(f"**Items researched:** {len(all_items)}\n")
    lines.append(f"**Fields per item:** {sum(len(cat.get('fields', {})) for cat in field_categories.values())}\n")
    lines.append(f"**Date:** 2026-03-23\n")

    # Comparative dimensions
    if comparative_dimensions:
        lines.append("**Comparative dimensions:**\n")
        for dim in comparative_dimensions:
            lines.append(f"- {dim}")
        lines.append("")

    lines.append("---\n")

    # === TABLE OF CONTENTS ===
    lines.append("## Table of Contents\n")

    # TOC by type group
    item_num = 0
    for type_key in type_order:
        if type_key not in groups:
            continue
        label = type_labels.get(type_key, type_key)
        lines.append(f"\n### {label}\n")
        lines.append("| # | Item | Layer | Key Adoption |")
        lines.append("|---|------|-------|-------------|")

        for item in groups[type_key]:
            item_num += 1
            name = item["name"]
            slug = slugify(name)

            layer = get_nested_value(item["data"], "layer_mapping", "garden_logic_comparative") or "—"
            layer = truncate(layer, 40)

            adopt = get_nested_value(item["data"], "what_adai_should_adopt", "garden_logic_comparative") or "—"
            adopt = truncate(adopt, 80)

            lines.append(f"| {item_num} | [{name}](#{slug}) | {layer} | {adopt} |")

    lines.append("\n---\n")

    # === COMPARATIVE SYNTHESIS ===
    lines.append(generate_comparative_synthesis(groups, all_items))
    lines.append("\n---\n")

    # === DETAILED ITEMS ===
    lines.append("## Detailed Research Results\n")

    item_num = 0
    for type_key in type_order:
        if type_key not in groups:
            continue
        label = type_labels.get(type_key, type_key)
        lines.append(f"\n---\n\n## {label}\n")

        for item in groups[type_key]:
            item_num += 1
            name = item["name"]
            slug = slugify(name)
            data = item["data"]
            uncertain_list = item["uncertain"]

            lines.append(f"\n### {name}\n")

            # Outline context
            if name in outline_briefs and outline_briefs[name]:
                lines.append(f"**Brief:** {outline_briefs[name]}\n")
            if name in outline_relevance and outline_relevance[name]:
                lines.append(f"**Garden Logic relevance:** {outline_relevance[name]}\n")

            # Fields by category
            for cat_key, cat_data in field_categories.items():
                cat_fields = cat_data.get("fields", {})
                if not cat_fields:
                    continue

                cat_label = cat_data.get("description", cat_key)
                has_content = False
                cat_lines = []

                for field_name, field_def in cat_fields.items():
                    value = get_nested_value(data, field_name, cat_key)

                    if is_uncertain(value, field_name, uncertain_list):
                        continue

                    has_content = True
                    formatted = format_value(value)
                    field_label = field_def.get("description", field_name)

                    # For short values, inline. For long, block.
                    if isinstance(formatted, str) and len(formatted) < 100 and "\n" not in formatted:
                        cat_lines.append(f"- **{field_name}**: {formatted}")
                    else:
                        cat_lines.append(f"\n**{field_name}**\n\n{formatted}\n")

                if has_content:
                    lines.append(f"#### {cat_label}\n")
                    lines.extend(cat_lines)
                    lines.append("")

            # Uncertain fields
            uncertain_in_data = data.get("uncertain", [])
            if uncertain_in_data:
                lines.append(f"**Uncertain fields:** {', '.join(uncertain_in_data)}\n")

            lines.append("---\n")

    # Write report
    with open(OUTPUT_PATH, "w") as f:
        f.write("\n".join(lines))

    print(f"Report generated: {OUTPUT_PATH}")
    print(f"Items: {len(all_items)}")
    print(f"Categories: {len(type_labels)}")
    print(f"Lines: {len(lines)}")


if __name__ == "__main__":
    main()
