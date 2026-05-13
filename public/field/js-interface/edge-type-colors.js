/**
 * A(DAI) — edge-type → brand-accent color mapping (v1, draft)
 *
 * 9 active edge types map to 9 brand accents from adai-system.js.
 * Editorial review pending. To change a mapping, edit this file only.
 *
 * Reds  = human relations (CREATED_BY, COLLABORATES_WITH, INFLUENCES)
 * Greens = structural (EXHIBITED_AT, CLASSIFIED_BY, USES_TECHNIQUE)
 * Yellows = activity / grounding (PRACTICES, BELONGS_TO)
 * Cobalt = the spine (EMBODIES — most common)
 */
window.ADAI_EDGE_COLORS = (() => {
  const MAP = {
    EMBODIES:           { hex: '#4169B0', name: 'Cobalt' },
    CREATED_BY:         { hex: '#D93B2D', name: 'Vermillion' },
    PRACTICES:          { hex: '#E5890A', name: 'Amber' },
    EXHIBITED_AT:       { hex: '#093F43', name: 'Deep Teal' },
    CLASSIFIED_BY:      { hex: '#6E7B2C', name: 'Olive' },
    BELONGS_TO:         { hex: '#B88A1B', name: 'Ochre' },
    COLLABORATES_WITH:  { hex: '#A83A1E', name: 'Rust' },
    USES_TECHNIQUE:     { hex: '#2A7672', name: 'Jade' },
    INFLUENCES:         { hex: '#8F2D2D', name: 'Oxblood' },
    RELATED_TO:         { hex: '#3A3A3C', name: 'Muted' },  // reserved / 0 rows
  };
  const NEUTRAL = { hex: '#E8E6E1', name: 'Text' };  // dots with no edges

  function colorFor(edgeType) {
    return MAP[edgeType] || NEUTRAL;
  }

  // Pick the dominant edge type for a node (the one with most edges of that type).
  function dominantEdgeType(nodeId) {
    const g = window.ADAI_GRAPH;
    if (!g) return null;
    const counts = g.edgeTypeCount.get(nodeId);
    if (!counts || counts.size === 0) return null;
    let best = null, bestN = -1;
    for (const [type, n] of counts) {
      if (n > bestN) { best = type; bestN = n; }
    }
    return best;
  }

  function colorForNode(nodeId) {
    const t = dominantEdgeType(nodeId);
    return t ? MAP[t] : NEUTRAL;
  }

  return { MAP, NEUTRAL, colorFor, colorForNode, dominantEdgeType };
})();
