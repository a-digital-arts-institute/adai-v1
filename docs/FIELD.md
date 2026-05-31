# /field Frontend

`/field` is the current canonical frontend surface for A(DAI). It is a data-driven,
p5-derived graph field: the Shape of Time sketch supplies the slow animated
background and dot registry, while the graph overlay binds live A(DAI) nodes,
edges, embeddings, search, bookmarks, entity overlays, and the Reader handoff.

Local URL after starting the server:

```bash
http://localhost:8080/field
```

## Route Wiring

- `src/index.ts` mounts `public/field/` at `/field-static`.
- `src/routes/pages.ts` serves `public/field/index.html` at `GET /field`.
- `public/field/index.html` loads all local assets through `/field-static/...`.

Keep asset URLs absolute to `/field-static`. Relative paths will work from the
filesystem but break once the page is served from `/field`.

## Runtime Data Flow

1. `public/field/js-interface/graph-loader.js`
   - Fetches `/api/stats` first and writes the chrome vitals.
   - Fetches `/api/graph`, caches it in `localStorage` under `adai.graph.v4`,
     and indexes nodes by id/type plus neighbour and edge-type maps.
   - Publishes `window.ADAI_GRAPH` and dispatches `adai:graph`.

2. `public/field/sketch-brand.js`
   - Draws the Shape of Time layer in `#mopey`.
   - Exposes `window.__adaiDotRegistry` and `window.__adaiBrandSize`.

3. `public/field/js-interface/graph-field.js`
   - Waits for `adai:graph`, waits for the Shape of Time dot registry, and
     fetches `/api/embed-space`.
   - Maps embedded nodes from UMAP space into brand-space targets, then snaps
     each one to the closest available Shape of Time dot.
   - Places unembedded graph nodes on remaining outer dots so they stay present
     in the field even when no vector exists.
   - Renders the interactive `#graph-canvas` overlay and exposes
     `window.ADAI_GRAPH_FIELD`.

4. `public/field/js-interface/entity-view.js`
   - Opens the full-page entity overlay for the currently focused node.
   - Uses `window.ADAI_GRAPH` for graph facts and optional hand-curated showcase
     data from `entity-data/`.
   - Fetches `/api/neighbours/:type/:slug` for embedding-neighbour sections.

## Backend APIs Used By /field

- `GET /api/stats` - node, edge, signal, and review counts.
- `GET /api/graph` - full graph as `{ nodes, edges }`, including projected
  artwork year and image URL fields when present.
- `GET /api/embed-space` - UMAP 2D projection for embedded nodes.
- `GET /api/neighbours/:type/:slug` - embedding-derived sections used by the
  entity overlay and focused-node neighbour strip.

## Interaction Model

- Click a bright dot to zoom from the 30k field into a focused node.
- Click neighbours to walk the graph.
- Press `Escape`, or click empty space, to step back.
- Press `i`, or click `profile` in the breadcrumb, to open the full entity view.
- Press `Cmd/Ctrl+K` or `/` to open search.
- Use breadcrumb segments to jump backward through a reading path.
- Use `star` to save a reading path to local storage.
- Use the share button to copy a URL with `?reading=...`.
- Use edge-type chips in focused views to foreground one or more relation types.
- Use `query` in the room nav to open search; the archivist handoff is inside
  that surface.

There is no live browser-hosted chat in `/field`. `chat-narrator.js` copies a
Reader-skill bundle for the visitor to paste into their own Claude session.

## File Map

- `index.html` - route entry and script ordering.
- `style.css`, `css/style.css` - visual system and field chrome.
- `field.js` - logotype, coordinates, room nav, philosophy/contribute panels.
- `adai-system.js` - shared keyboard metadata, brand options, field constants.
- `brand-state.js` - mutable brand/accent/font state.
- `brand.html`, `adai-brand.js` - brand-system reference page linked from the
  `/field` nav.
- `sketch-brand.js` - Shape of Time renderer and p5 export hooks.
- `js-interface/graph-loader.js` - stats/graph fetch, cache, graph indexing.
- `js-interface/graph-field.js` - field layout, zoom, breadcrumbs, bookmarks,
  share URLs, edge filters, and canvas render loop.
- `js-interface/entity-view.js` - full entity profile overlay.
- `js-interface/search-palette.js` - graph search and zoom navigation.
- `js-interface/chat-narrator.js` - Reader-skill copy/download handoff.
- `js-interface/edge-type-colors.js` - edge-type color mapping.
- `js-interface/entity-data/` - hand-curated showcase records.
- `skills/` - Reader protocol files served to the browser handoff.
- `The_Shape_of_Time/` - design reference for the p5 sketch lineage.

## Design Rules Worth Preserving

- The Shape of Time field is not decoration; it is the spatial texture the graph
  inhabits.
- The 30k view is a situated reading of the graph, not a neutral map.
- Practitioners and artworks should remain readable in dense clusters; avoid
  making all node types visually identical.
- `CLASSIFIED_BY` is intentionally hidden in focused relation views because the
  current single root regime would dominate the layout.
- Artwork thumbnails render for artworks only. Practitioner portraits are
  deliberately ignored in the field overlay.
- Empty entity sections should invite contribution rather than disappear.
- The Reader/archivist runs outside the frontend. Do not put user API keys or
  hosted LLM chat directly in this page.

## Local Development

```bash
npm install
rm -f adai.db
npm run seed:consolidated
npm run dev
```

Then open `http://localhost:8080/field`.

If graph shape or node projection fields change, bump the cache key in
`graph-loader.js`; otherwise old `localStorage` payloads can hide new fields
until the node/edge count changes.
