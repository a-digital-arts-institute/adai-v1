# SPEC: ADAI-2 Frontend Backport & UMAP Integration

## 1. Objective
Backport the ADAI-2 frontend (currently in `/Users/sugar/devel/adai/ADAI-2`) into the `adai-v1` repository. Replace the arbitrary "intention-based" spiral snapping with the semantic UMAP embedding space (`/api/embed-space`) as the absolute coordinate system for the 30k view. 

Crucially:
- **Combine aesthetics:** Keep the generative "Shape of Time" spiral as a background ambient texture, but decouple the graph nodes from it.
- **Unbound the 30k view:** Show *all* nodes that possess an embedding, rather than filtering only to practitioners.
- **Graceful degradation:** Hide nodes without embeddings at the 30k view, but allow them to be summoned when zooming into 10k/5k views.

## 2. Phase 1: Asset Migration & Wiring
1. **Copy Files:** Copy all contents of `ADAI-2/` into `adai-v1/public/field/`.
2. **Path Updates:** In `public/field/index.html`, update all relative asset paths (`href="style.css"`, `src="js-interface/..."`) to prepend `/field-static/` so they resolve correctly when served via the Express `/field` route.
3. **API Endpoints:** In `public/field/js-interface/graph-loader.js`, replace the hardcoded `https://adai-basel.fly.dev/api/...` URLs with relative paths (`/api/stats`, `/api/graph`).

## 3. Phase 2: The UMAP Layout Engine (30k View)
Rewrite the initialization and layout logic in `public/field/js-interface/graph-field.js`:

1. **Fetch UMAP Data:** Alongside `/api/graph`, fetch `/api/embed-space`.
2. **Remove Registry Snapping:** Delete `waitForRegistry`, `readBrandPositions`, and `pickDistinctPositions`. The graph no longer needs to wait for the spiral to generate its dot registry to determine node placement.
3. **Coordinate Projection:**
   - The UMAP data provides `x` and `y` coordinates.
   - Calculate the bounding box (min/max X and Y) of all UMAP points.
   - Map these normalized UMAP coordinates into the "brand space" (`brandW: 1600, brandH: 900`), applying a ~10-15% padding margin so nodes don't touch the screen edges.
   - Store these mapped coordinates as `bx` and `by` on the simulation nodes. The existing `reproject()` function will seamlessly handle scaling `bx/by` to the actual screen viewport on resize.
4. **Unbounding the View:**
   - Remove `CFG.SNAPSHOT_TYPE = 'practitioner'`.
   - Iterate through *all* nodes in `graph.nodes`. If a node exists in the `embed-space` payload, add it to the `bundle.sim` array.
   - Nodes without an embedding are omitted from `bundle.sim` (they remain hidden at 30k).

## 4. Phase 3: Combining with the "Shape of Time"
1. **Background Texture:** Leave `sketch-brand.js` intact. It will continue to draw the generative spiral on the background canvas (`#mopey`).
2. **Visual Hierarchy:** 
   - The graph nodes (drawn on `#graph-canvas`) will float over the spiral.
   - Since the 30k view is now "unbound" (showing ~1,300+ nodes instead of just ~117 practitioners), rendering them all as bright white targets (`CFG.DOT_HEX`) will be visually overwhelming and clash with the white spiral.
   - **Update rendering:** Color-code the 30k dots based on their node `type` (e.g., artworks in gold, practitioners in blue, concepts in gray) to make the semantic clusters readable against the monochrome spiral. Adjust base alpha/radius so the field feels like a glowing constellation.

## 5. Phase 4: Interaction & Zoom Mechanics (10k View)
The existing zoom transitions (`zoomToNode`, `zoomBack`) and layouts (`computeRoseLayout`, `computeBucketedLayout`) are mathematically sound and should be retained.

1. **Transitions:** The transition logic relies on `baseX` and `baseY`. Because we mapped the UMAP coordinates to `bx` and `by` (and `reproject` calculates `baseX/baseY`), the nodes will naturally animate from their UMAP positions to the center focus, and fly back to their UMAP positions on "zoom back".
2. **Virtual Focus (Missing Embeddings):** 
   - If a user navigates to a node that has *no embedding* (e.g., via the breadcrumb, search palette, or clicking a neighbor), the existing `zoomToVirtualFocus` pathway handles this perfectly. 
   - It treats the node as a "virtual focus" that animates in from the neighbor ring rather than from a 30k home position. Ensure this logic remains intact.
3. **Hover/Click Hit-testing:** Ensure the KD-tree or linear distance check for hovering/clicking at 30k scales efficiently now that there are 10x more interactive dots on screen.

## 6. Execution Plan for Claude Code
1. Execute the file copy from `ADAI-2` to `public/field`.
2. Apply the HTML and API path replacements.
3. Refactor `graph-field.js` to implement the UMAP fetching and projection logic.
4. Update the 30k `frame()` render loop in `graph-field.js` to handle the unbound, color-coded node rendering.