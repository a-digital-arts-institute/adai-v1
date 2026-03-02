#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  A(DAI) Intelligence Pipeline Runner
#  Runs: signal_processor.py → concept_linker.py
# ─────────────────────────────────────────────────────────

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ┌──────────────────────────────────────┐"
echo "  │   A(DAI) Intelligence Pipeline        │"
echo "  └──────────────────────────────────────┘"
echo ""

# Step 1: Signal Processor
echo "  [1/2] Running signal_processor.py ..."
python3 "$DIR/signal_processor.py"

# Step 2: Concept Linker
echo "  [2/2] Running concept_linker.py ..."
python3 "$DIR/concept_linker.py"

echo ""
echo "  Pipeline complete."
echo ""
