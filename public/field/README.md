# A(DAI) frontend — handoff branch

This branch (`front-end-handoff`) is a stripped-down view of the latest A(DAI)
frontend (`sunday-1k-view`) with unrelated experiments removed, prepared for
folding into [a-digital-arts-institute/adai-v1](https://github.com/a-digital-arts-institute/adai-v1).

## What's here

**Live frontend** (everything `index.html` actually loads):

- `index.html` — main entry, with `#sense / #query / #contribute / #philosophy` rooms
- `style.css`, `css/`
- `field.js` — Chrome layer (coords, vitals, room nav)
- `sketch-brand.js` — Shape of Time renderer (the live animated layer)
- `adai-system.js`, `brand-state.js` — shared system + brand state
- `js-interface/` — graph loader, graph field, entity view, search palette,
  chat narrator, edge-type colors, entity data
- `brand.html` + `adai-brand.js` — linked from the main nav

**Design reference (keep, do not deploy):**

- `The_Shape_of_Time/` — the original p5 sketch the live animation is derived
  from. Key design principle for the frontend.

**Other:**

- `skills/` — A(DAI) protocol docs (reader.md, relational-intelligence-protocol.md)
- `netlify.toml`, `.gitignore`, `.netlifyignore`

## What was stripped (vs `sunday-1k-view`)

- `Interface_Claude copy/` — different project (THERESI0TANCE), unrelated to A(DAI)
- `netlify-deploy/` — mirror of the root files, redundant (pick one source)
- `index2.html` + `sketch-spaceego.js` — alternate / experimental version
- `brand-generator-preview.html` — preview page, not in main nav

## Folding into adai-v1

The five decisions before merging (from the handoff notes):

1. **Where it lives in adai-v1** — `web/`? `public/`? `frontend/`?
2. **How adai-v1 serves it** — static-serve from the existing Hono server, or
   keep a separate Netlify deploy with source versioned in adai-v1.
3. **Existing frontend in adai-v1** — `src/routes/pages.ts` and the
   `claude/field-view` branch. Replace, or coexist?
4. **API base URL** — check `field.js` and `js-interface/` for hardcoded fly
   deployment URLs; switch to relative paths.
5. **Routes** — confirm `#philosophy`, `#query`, `#contribute` (and `brand.html`)
   don't collide with existing adai-v1 routes.
