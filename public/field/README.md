# A(DAI) /field Frontend

This directory contains the assets served by the canonical `/field` route.
Express exposes the directory at `/field-static`, and `GET /field` sends
`index.html`.

For the full route/data-flow handoff, see [`../../docs/FIELD.md`](../../docs/FIELD.md).

## Live Pieces

- `index.html` - route entry, script ordering, and room navigation.
- `style.css`, `css/style.css` - field chrome and visual system.
- `field.js` - coordinates, logotype, room nav, philosophy/contribute panels.
- `sketch-brand.js` - Shape of Time p5 renderer and dot registry.
- `adai-system.js`, `brand-state.js` - shared field/brand state.
- `brand.html`, `adai-brand.js` - brand-system reference page linked from the
  route nav.
- `js-interface/graph-loader.js` - `/api/stats` and `/api/graph` loader/cache.
- `js-interface/graph-field.js` - UMAP-to-Shape-of-Time layout, zoom, bookmarks,
  breadcrumbs, share URLs, edge filters.
- `js-interface/entity-view.js` - full profile overlay and embedding-neighbour
  sections.
- `js-interface/search-palette.js` - graph search and zoom navigation.
- `js-interface/chat-narrator.js` - Reader-skill copy/download handoff.
- `skills/` - Reader protocol files served to the browser.

## Design Reference

`The_Shape_of_Time/` is kept as the original p5 lineage for the live renderer.
It is reference material, not the route entrypoint.

## Gotchas

- Use `/field-static/...` for local asset URLs inside `index.html`.
- `/field` expects the server APIs to exist: `/api/stats`, `/api/graph`,
  `/api/embed-space`, and `/api/neighbours/:type/:slug`.
- `graph-loader.js` caches `/api/graph` in `localStorage`; bump its cache key
  when projected node fields change.
- The archivist surface is a handoff to the visitor's own Claude session, not a
  hosted chat endpoint.
