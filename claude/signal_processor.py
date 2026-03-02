#!/usr/bin/env python3
"""
signal_processor.py – Transform raw signals into structured field intelligence.
Fetches raw signals from Notion, sends to Claude for analysis, writes back.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime

import anthropic
import requests
# ── Load environment ──────────────────────────────────────────────
# Manual parser — the .env has a malformed first line that breaks dotenv.
def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    vals = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip()
            if key and key.isidentifier() and not key.startswith("cat"):
                vals[key] = val
    return vals

_ENV = _load_env()

def env(key):
    return _ENV.get(key, "")

NOTION_TOKEN    = env("NOTION_TOKEN")
ANTHROPIC_KEY   = env("ANTHROPIC_API_KEY")
DB_SIGNALS      = env("NOTION_DB_SIGNALS")

REQUIRED = {"NOTION_TOKEN": NOTION_TOKEN, "ANTHROPIC_API_KEY": ANTHROPIC_KEY, "NOTION_DB_SIGNALS": DB_SIGNALS}
missing = [k for k, v in REQUIRED.items() if not v]
if missing:
    sys.exit(f"ERROR: Missing env vars: {', '.join(missing)}")

NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

NOTION_DELAY = 0.34
CLAUDE_DELAY = 1.5

# ── Logging ───────────────────────────────────────────────────────
error_logger = logging.getLogger("errors")
error_logger.setLevel(logging.ERROR)
fh = logging.FileHandler(os.path.join(os.path.dirname(__file__), "errors.log"))
fh.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
error_logger.addHandler(fh)

claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

# ── Claude Prompts ────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a field intelligence analyst for A(DAI) — A Digital Arts Institute. Your role is to process signals from the digital arts field and extract structured intelligence.

A(DAI) exists to help the digital arts field understand itself — to surface patterns, name movements, map tensions, and build the critical language the field needs. Your analysis should serve this mission.

You are working with signals from practitioners, critics, institutions, platforms, and researchers across the digital arts ecosystem — including generative art, AI art, net art, on-chain art, creative coding, XR, glitch, and algorithmic practice.

ANALYTICAL FRAMEWORK
When processing a signal, think across four registers:

SURFACE — what is literally happening or being said?
STRUCTURE — what systems, incentives, or patterns does this reveal?
POSITION — what values, assumptions, or worldviews are at play?
NARRATIVE — what deeper story, metaphor, or cultural shift does this point toward?

This is not academic analysis. Write with the precision of a field reporter and the depth of a cultural critic. No jargon. No hedging. Say what you actually think the signal means."""

USER_PROMPT_TEMPLATE = """Analyze this signal from the digital arts field and return ONLY a JSON object. No preamble, no markdown, no explanation outside the JSON.

SIGNAL:
{content}

Return this exact JSON structure:
{{
  "summary": "A 3-4 sentence synthesis written as field intelligence. What is actually happening here. What patterns it reveals. Why it matters to the digital arts field right now. Write in present tense, active voice. No hedging phrases like 'this signal suggests' — just state what it means.",
  "surface": "One sentence: what is literally happening or being said.",
  "structure": "One sentence: what systemic pattern, incentive, or structural condition this reveals.",
  "narrative": "One sentence: what deeper cultural shift or story this points toward. This is the most important layer — push past the obvious.",
  "concepts": [
    "3 to 6 named concepts, movements, aesthetic terms, or tensions extracted from this signal. These should be NAMED THINGS — specific enough to be a useful index term. Not generic categories like 'technology' or 'art'. Think: movement names, aesthetic positions, institutional phenomena, emerging practices, named tensions. Examples: 'algorithmic authorship', 'institutional capture', 'post-digital materiality', 'on-chain provenance', 'practice-led theory'"
  ],
  "practitioners": [
    "Names of specific artists, curators, critics, institutions, platforms, or collectives mentioned or clearly implied. Only include if genuinely present in the signal — do not invent."
  ],
  "scene_tags": [
    "Which scenes does this signal belong to? Choose from: generative, on-chain, net-art, XR, glitch, creative-coding, game-art, algorithmic, ai-art, post-internet, sound-art, or suggest a new scene name if none fit."
  ],
  "speculative_implication": "One sentence. If this signal is an early indicator of something larger — what might that be in 12-24 months? Be specific. Avoid vague gestures toward 'the future of art'. Name the specific shift you think this points toward.",
  "signal_quality": "high | medium | low — your assessment of how significant this signal is for understanding the field. High: reveals something non-obvious, names something unnamed, or corroborates an emerging pattern. Low: routine, surface-level, or adds little to existing corpus understanding.",
  "suggested_thread": "If this signal clearly belongs to an open investigation, suggest a thread title. Format as a question. Example: 'Is institutional adoption of AI art a legitimisation or capture event?' Return null if no clear thread."
}}"""


# ── Notion Helpers ────────────────────────────────────────────────

def notion_post(path, body):
    url = f"https://api.notion.com/v1/{path}"
    r = requests.post(url, headers=NOTION_HEADERS, json=body)
    time.sleep(NOTION_DELAY)
    if not r.ok:
        raise Exception(f"Notion POST {path}: {r.status_code} {r.text[:300]}")
    return r.json()


def notion_patch(path, body):
    url = f"https://api.notion.com/v1/{path}"
    r = requests.patch(url, headers=NOTION_HEADERS, json=body)
    time.sleep(NOTION_DELAY)
    if not r.ok:
        raise Exception(f"Notion PATCH {path}: {r.status_code} {r.text[:300]}")
    return r.json()


def get_plain_text(prop):
    """Extract plain text from a Notion property."""
    ptype = prop.get("type", "")
    if ptype == "title":
        return "".join(t.get("plain_text", "") for t in prop.get("title", []))
    if ptype == "rich_text":
        return "".join(t.get("plain_text", "") for t in prop.get("rich_text", []))
    if ptype == "select":
        sel = prop.get("select")
        return sel.get("name", "") if sel else ""
    if ptype == "multi_select":
        return [o.get("name", "") for o in prop.get("multi_select", [])]
    if ptype == "url":
        return prop.get("url") or ""
    if ptype == "date":
        d = prop.get("date")
        return d.get("start", "") if d else ""
    return ""


# ── Step 1: Fetch raw signals ────────────────────────────────────

def fetch_raw_signals():
    print("  Fetching raw signals from Signal Inbox...")
    body = {
        "filter": {
            "property": "status",
            "select": {"equals": "raw"}
        }
    }
    results = []
    cursor = None
    while True:
        if cursor:
            body["start_cursor"] = cursor
        data = notion_post(f"databases/{DB_SIGNALS}/query", body)
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")

    print(f"  Found {len(results)} raw signal(s)")
    return results


# ── Step 2: Build context ─────────────────────────────────────────

def build_context(props):
    title = get_plain_text(props.get("Name", {}))
    raw_content = get_plain_text(props.get("raw_content", {}))
    url = get_plain_text(props.get("url", {}))
    source_type = get_plain_text(props.get("source_type", {}))
    intelligence_tier = get_plain_text(props.get("intelligence_tier", {})) or "unknown"
    submitted_by = get_plain_text(props.get("submitted_by", {}))
    date_captured = get_plain_text(props.get("date_captured", {}))

    if raw_content and len(raw_content) > 100:
        content = raw_content
    elif url:
        content = f"Title: {title}\nURL: {url}\nSource: {source_type}"
    else:
        content = f"Title: {title}\nSource: {source_type}"

    header = (
        f"This is a {intelligence_tier} signal from the digital arts field.\n"
        f"Source type: {source_type}. Submitted by: {submitted_by}.\n"
        f"Date: {date_captured}."
    )

    return {
        "title": title,
        "full_content": f"{header}\n\n{content}",
        "source_type": source_type,
        "intelligence_tier": intelligence_tier,
        "submitted_by": submitted_by,
        "date_captured": date_captured,
        "existing_tags": get_plain_text(props.get("tags", {})) if isinstance(get_plain_text(props.get("tags", {})), list) else [],
    }


# ── Step 3: Claude analysis ──────────────────────────────────────

def analyze_with_claude(content):
    user_prompt = USER_PROMPT_TEMPLATE.replace("{content}", content[:12000])

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    time.sleep(CLAUDE_DELAY)

    text = response.content[0].text
    # Strip markdown fences
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    return json.loads(text)


# ── Step 4: Validate ─────────────────────────────────────────────

REQUIRED_FIELDS = [
    "summary", "surface", "structure", "narrative", "concepts",
    "practitioners", "scene_tags", "speculative_implication",
    "signal_quality", "suggested_thread",
]

def validate(parsed):
    for field in REQUIRED_FIELDS:
        if field not in parsed:
            raise ValueError(f"Missing field: {field}")
    return True


# ── Step 5: Write back to Notion + cache ──────────────────────────

def write_back(page_id, parsed, existing_tags):
    # Merge tags
    new_tags = list(set(existing_tags + (parsed.get("scene_tags") or [])))[:10]
    tag_props = [{"name": t} for t in new_tags]

    notion_patch(f"pages/{page_id}", {
        "properties": {
            "summary_ai": {"rich_text": [{"text": {"content": parsed["summary"][:2000]}}]},
            "status": {"select": {"name": "processed"}},
            "tags": {"multi_select": tag_props},
        }
    })


def write_cache(cache, path):
    with open(path, "w") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


# ── Main ──────────────────────────────────────────────────────────

def main():
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  A(DAI) Signal Processor")
    print(f"  {ts}")
    print(f"{'='*60}\n")

    signals = fetch_raw_signals()
    if not signals:
        print("  No raw signals to process.")
        return

    cache_path = os.path.join(os.path.dirname(__file__), "concepts_cache.json")

    # Load existing cache or start fresh
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            cache = json.load(f)
    else:
        cache = {}

    # Counters
    processed = 0
    quality_counts = {"high": 0, "medium": 0, "low": 0}
    all_concepts = []
    all_practitioners = []

    print(f"\n  Processing {len(signals)} signal(s)...\n")

    for signal in signals:
        page_id = signal["id"]
        props = signal.get("properties", {})
        ctx = build_context(props)
        title = ctx["title"] or "(untitled)"

        try:
            # Claude analysis
            parsed = analyze_with_claude(ctx["full_content"])
            validate(parsed)

            # Write back to Notion
            write_back(page_id, parsed, ctx["existing_tags"])

            # Cache
            cache[page_id] = {
                "title": title,
                "date_captured": ctx["date_captured"],
                "summary": parsed["summary"],
                "surface": parsed["surface"],
                "structure": parsed["structure"],
                "narrative": parsed["narrative"],
                "concepts": parsed["concepts"],
                "practitioners": parsed["practitioners"],
                "scene_tags": parsed["scene_tags"],
                "speculative_implication": parsed["speculative_implication"],
                "signal_quality": parsed["signal_quality"],
                "suggested_thread": parsed["suggested_thread"],
            }

            # Counters
            processed += 1
            q = parsed.get("signal_quality", "medium")
            quality_counts[q] = quality_counts.get(q, 0) + 1
            all_concepts.extend(parsed.get("concepts", []))
            all_practitioners.extend(parsed.get("practitioners", []))

            # Log
            print(f"  \u2713 {title} \u2014 {q} quality")
            print(f"    concepts: {', '.join(parsed.get('concepts', []))}")
            print(f"    implication: {parsed.get('speculative_implication', 'n/a')}")
            print()

        except json.JSONDecodeError as e:
            error_logger.error(f"JSON parse error for '{title}': {e}")
            print(f"  \u2717 {title} \u2014 JSON parse failed, setting status=error")
            try:
                notion_patch(f"pages/{page_id}", {
                    "properties": {"status": {"select": {"name": "raw"}}}
                })
            except Exception:
                pass

        except Exception as e:
            error_logger.error(f"Error processing '{title}': {e}")
            print(f"  \u2717 {title} \u2014 {str(e)[:100]}")

    # Write cache
    write_cache(cache, cache_path)

    # Summary
    unique_concepts = list(set(c.lower() for c in all_concepts))
    unique_practitioners = list(set(p.lower() for p in all_practitioners))

    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Signals processed:      {processed}")
    print(f"  High quality:           {quality_counts.get('high', 0)}")
    print(f"  Medium quality:         {quality_counts.get('medium', 0)}")
    print(f"  Low quality:            {quality_counts.get('low', 0)}")
    print(f"  Total concepts:         {len(all_concepts)}")
    print(f"  Unique concepts:        {len(unique_concepts)}")
    print(f"  Practitioners found:    {len(unique_practitioners)}")
    print(f"  Cache written to:       {cache_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
