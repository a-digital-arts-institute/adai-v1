/**
 * A(DAI) — entity view (the "1k" tier)
 *
 * Trigger: pressing 'i' (info) while zoomed into a node opens a full-page
 * overlay with the practitioner / artwork's rich profile. ESC dismisses
 * back to the graph at the previous zoom level.
 *
 * Data sources, in priority order:
 *   1. window.ADAI_ENTITY_SHOWCASE[id]  — hand-curated rich showcase data
 *   2. window.ADAI_GRAPH                 — fall back to graph-only stub
 *
 * Editorial rules (from memory/feedback_images_artworks_only.md +
 * vault/raw/references/SOURCES-updated.md):
 *   - Hero is a SIGNATURE WORK, never a practitioner portrait.
 *   - Empty sections render as polite invitations to /contribute, not collapsed.
 *   - source_origin badge is visible at the bottom; never hide AI-assisted state.
 */
(() => {
  const STATE = { open: false, currentId: null, lastFocusedId: null };

  // ---------- DOM bootstrap ----------
  function ensureContainer() {
    let el = document.getElementById('entity-view');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'entity-view';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '';
    document.body.appendChild(el);
    return el;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Image helpers (artworks only — practitioners stay text/hatch) ----------
  const IMG_EXT_RE = /\.(jpe?g|png|gif|webp)(\?|$)/i;
  function isRenderableImageUrl(url) {
    return typeof url === 'string' && IMG_EXT_RE.test(url);
  }
  function pickArtworkImage(node) {
    if (!node || node.type !== 'artwork') return null;
    if (isRenderableImageUrl(node.cdn_image_url)) return node.cdn_image_url;
    if (isRenderableImageUrl(node.image_url)) return node.image_url;
    return null;
  }

  // ---------- Data resolution ----------
  function resolveShowcase(id) {
    return (window.ADAI_ENTITY_SHOWCASE || {})[id] || null;
  }
  function resolveGraphNode(id) {
    return window.ADAI_GRAPH?.byId?.get(id) || null;
  }
  function neighborsByEdgeType(id) {
    const g = window.ADAI_GRAPH;
    if (!g) return new Map();
    const out = new Map();
    const edges = g.edgesFor(id);
    for (const e of edges) {
      if (e.type === 'CLASSIFIED_BY') continue; // hidden in views per memory
      const otherId = e.source === id ? e.target : e.source;
      const node = g.byId.get(otherId);
      if (!node) continue;
      const list = out.get(e.type) || [];
      list.push({ node, edge: e });
      out.set(e.type, list);
    }
    return out;
  }

  // ---------- Section renderers ----------
  function renderBreadcrumb(node, showcase) {
    const slug = showcase?.slug || node.slug || node.id.split(':').slice(1).join(':');
    return `
      <div class="ev-breadcrumb">
        <span class="ev-bc-field">field/</span>
        <span class="ev-bc-type">[${escapeHtml(node.type)}]</span>
        <span class="ev-bc-sep">/</span>
        <span class="ev-bc-slug">n.${escapeHtml(node.type)}.${escapeHtml(slug)}</span>
      </div>
    `;
  }

  function renderTitle(node, showcase) {
    const display = showcase?.name_display || node.name || node.id;
    // Showcase wins (curated dates_compact like "1934–2018"); otherwise
    // fall back to the artwork year exposed by /api/graph (year_raw /
    // year_start[/_end] / legacy active_years). Hidden for non-artworks
    // with no showcase, since born/died for practitioners is rendered
    // separately in renderMetadata().
    const dateStr = showcase?.dates_compact || (node.type === 'artwork' ? node.year : null);
    const dates = dateStr ? `<span class="ev-dates">[${escapeHtml(dateStr)}]</span>` : '';
    return `<h1 class="ev-title">${escapeHtml(display)} ${dates}</h1>`;
  }

  function renderTagline(showcase) {
    if (!showcase) return '';
    const disc = (showcase.tagline_disciplines || []).map(escapeHtml).join(' · ');
    const cf = (showcase.tagline_cf || []).map(escapeHtml).join(' , ');
    if (!disc && !cf) return '';
    return `
      <div class="ev-tagline">
        ${disc ? `<span class="ev-tagline-disc">${disc}</span>` : ''}
        ${cf ? `<span class="ev-tagline-cf">cf. ${cf}</span>` : ''}
      </div>
    `;
  }

  function renderHero(node, showcase, neighborMap) {
    // Per editorial rule: signature work, never portrait.
    let heroNode = null;
    let dropCopy = '';
    if (showcase?.hero?.artwork_id) {
      heroNode = resolveGraphNode(showcase.hero.artwork_id);
      dropCopy = showcase.hero.drop || '';
    } else if (node.type === 'artwork') {
      heroNode = node;
    } else {
      // Fall back to first artwork neighbour with image, if any.
      const created = neighborMap.get('CREATED_BY') || [];
      for (const { node: n } of created) {
        if (n.type === 'artwork' && pickArtworkImage(n)) { heroNode = n; break; }
      }
    }
    const url = heroNode ? pickArtworkImage(heroNode) : null;
    if (url) {
      return `
        <figure class="ev-hero ev-hero--image">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(heroNode.name)}" crossorigin="anonymous">
          ${heroNode ? `<figcaption class="ev-hero-cap"><span class="ev-mono-tag">img.hero · ${escapeHtml(heroNode.name)}</span>${dropCopy ? `<br><span class="ev-mono-dim">drop: ${escapeHtml(dropCopy)}</span>` : ''}</figcaption>` : ''}
        </figure>
      `;
    }
    // Empty hero — diagonal hatch placeholder, copy invites contribution.
    const fallback = showcase?.hero?.fallback_copy || 'img.hero / signature work';
    const isShowcase = !!showcase;
    const sub = isShowcase
      ? 'awaiting linkage — image fields not yet populated for this work'
      : 'contribute via /contribute skill — sense, then link';
    return `
      <figure class="ev-hero ev-hero--empty" data-hatch="1">
        <figcaption class="ev-hero-cap">
          <span class="ev-mono-tag">${escapeHtml(fallback)}</span><br>
          <span class="ev-mono-dim">drop: ${escapeHtml(sub)}</span>
        </figcaption>
      </figure>
    `;
  }

  function renderBio(showcase) {
    if (!showcase?.bio) return '';
    return `<p class="ev-bio">&gt; ${escapeHtml(showcase.bio)} <span class="ev-bio-mark">‖</span></p>`;
  }

  function renderMetadata(showcase) {
    if (!showcase) return '';
    const rows = [];
    if (showcase.born) rows.push(['born', `${escapeHtml(showcase.born.date)} · ${escapeHtml(showcase.born.place)}`]);
    if (showcase.died) rows.push(['died', `${escapeHtml(showcase.died.date)} · ${escapeHtml(showcase.died.place)}`]);
    if (showcase.nationality) rows.push(['nationality', escapeHtml(showcase.nationality)]);
    if (showcase.pronunciation) rows.push(['pronunciation', escapeHtml(showcase.pronunciation)]);
    if (showcase.disciplines_full?.length) rows.push(['disciplines', showcase.disciplines_full.map(escapeHtml).join(' · ')]);
    if (showcase.movements?.length) rows.push(['movements', showcase.movements.map(escapeHtml).join(' · ')]);
    if (!rows.length) return '';
    // Two-column layout: split rows roughly in half.
    const half = Math.ceil(rows.length / 2);
    const left = rows.slice(0, half);
    const right = rows.slice(half);
    const col = (rs) => rs.map(([k, v]) => `<dt class="ev-meta-k">${k}</dt><dd class="ev-meta-v">:${v}</dd>`).join('');
    return `<dl class="ev-meta"><div class="ev-meta-col">${col(left)}</div><div class="ev-meta-col">${col(right)}</div></dl>`;
  }

  function renderQuote(showcase) {
    if (!showcase?.quote) return '';
    return `
      <blockquote class="ev-quote">
        <p class="ev-quote-text">«${escapeHtml(showcase.quote.text)}»</p>
        <p class="ev-quote-attr">— ${escapeHtml(showcase.quote.attribution)}</p>
      </blockquote>
    `;
  }

  // Returns works for the entity view. Showcase data wins; otherwise we fall
  // back to the graph's CREATED_BY edges with a minimal shape (title +
  // optional image). Empty sections never collapse — they invite contribution.
  function gatherWorks(node, showcase) {
    if (showcase?.works?.length) return { works: showcase.works, source: 'showcase' };
    const g = window.ADAI_GRAPH;
    if (!g) return { works: [], source: 'none' };
    // Pull artworks via CREATED_BY edges where the practitioner is the target.
    const edges = g.edgesFor(node.id).filter(e => e.type === 'CREATED_BY');
    const works = edges.map(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      const aw = g.byId.get(otherId);
      if (!aw || aw.type !== 'artwork') return null;
      return {
        slug: aw.slug || aw.id.split(':').slice(1).join(':'),
        title: aw.name,
        graph_id: aw.id,
        // The /api/graph endpoint projects `year` onto artwork nodes
        // (extracted from year_raw / year_start[/_end] / legacy
        // basic_info.active_years). Medium/method/blurb still absent —
        // honest stub.
        year: aw.year || undefined,
      };
    }).filter(Boolean);
    return { works, source: 'graph' };
  }

  function renderWorks(node, showcase) {
    const { works, source } = gatherWorks(node, showcase);
    if (!works.length) {
      return `
        <section class="ev-section">
          <h2 class="ev-h2">// works <span class="ev-h2-count">/00</span></h2>
          <p class="ev-empty">no works have been linked to this practitioner yet — <em>contribute via /contribute skill</em></p>
        </section>
      `;
    }
    const items = works.map((w, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const graphNode = w.graph_id ? resolveGraphNode(w.graph_id) : null;
      const url = graphNode ? pickArtworkImage(graphNode) : null;
      const slug = w.slug || (w.title || '').toLowerCase().replace(/\s+/g, '-').slice(0, 64);
      const imgBlock = url
        ? `<div class="ev-work-img"><img src="${escapeHtml(url)}" alt="${escapeHtml(w.title)}" crossorigin="anonymous"><div class="ev-work-img-cap"><span class="ev-mono-tag">img.slot · ${escapeHtml(slug)}</span>${w.img_descriptor ? `<br>${escapeHtml(w.img_descriptor)}` : ''}</div></div>`
        : `<div class="ev-work-img ev-work-img--empty" data-hatch="1"><div class="ev-work-img-cap"><span class="ev-mono-tag">img.slot · ${escapeHtml(slug)}</span>${w.img_descriptor ? `<br>${escapeHtml(w.img_descriptor)}` : '<br><span class="ev-mono-dim">awaiting linkage</span>'}</div></div>`;
      const yearTag = w.year ? `<span class="ev-work-year">[${escapeHtml(w.year)}]</span>` : '';
      const mediumLine = (w.medium || w.method)
        ? `<p class="ev-work-medium">${escapeHtml(w.medium || '')} ${w.method ? `· <span class="ev-work-method">method: ${escapeHtml(w.method)}</span>` : ''}</p>`
        : `<p class="ev-work-medium ev-mono-dim">medium · method · year — <em>awaiting via /contribute skill</em></p>`;
      const blurbLine = w.blurb ? `<p class="ev-work-blurb">// ${escapeHtml(w.blurb)}</p>` : '';
      return `
        <article class="ev-work">
          ${imgBlock}
          <div class="ev-work-body">
            <h3 class="ev-work-title">w.${idx} <strong>${escapeHtml(w.title)}</strong> ${yearTag}</h3>
            ${mediumLine}
            ${blurbLine}
          </div>
        </article>
      `;
    }).join('');
    const sourceTag = source === 'graph'
      ? '<span class="ev-h2-source">· from graph (awaiting editorial enrichment)</span>'
      : '';
    return `
      <section class="ev-section">
        <h2 class="ev-h2">// works <span class="ev-h2-count">/${String(works.length).padStart(2,'0')}</span>${sourceTag}</h2>
        <div class="ev-works">${items}</div>
      </section>
    `;
  }

  // Group neighbours from the graph into the relations sections.
  // The mock organises by NODE TYPE (practitioner, concept, institution,
  // platform, scene, collective) rather than by edge type — that's how a
  // reader actually scans the page.
  function renderRelations(node, showcase, neighborMap) {
    const g = window.ADAI_GRAPH;
    if (!g) return '';
    // Flatten to a single list keyed by neighbour id.
    const seen = new Map();
    for (const [, items] of neighborMap) {
      for (const { node: n, edge } of items) {
        if (!seen.has(n.id)) seen.set(n.id, { node: n, edges: [] });
        seen.get(n.id).edges.push(edge);
      }
    }
    // Bucket by node type. Artworks are excluded — they have their own
    // // works section above and listing them again here is noise.
    const buckets = new Map();
    for (const { node: n, edges } of seen.values()) {
      if (n.type === 'artwork') continue;
      const list = buckets.get(n.type) || [];
      list.push({ node: n, edges });
      buckets.set(n.type, list);
    }
    const order = ['practitioner', 'concept', 'institution', 'platform', 'scene', 'collective', 'classification_regime'];
    const total = seen.size;
    if (!total) {
      return `
        <section class="ev-section">
          <h2 class="ev-h2">// relations <span class="ev-h2-count">/00 ·n=00</span></h2>
          <p class="ev-empty">no relations linked yet — <em>contribute via /contribute skill</em></p>
        </section>
      `;
    }
    const qualifiers = showcase?.relation_qualifiers || {};
    const groups = order.filter(t => buckets.has(t)).map(t => {
      const items = buckets.get(t);
      const rows = items.map(({ node: n, edges }) => {
        const qualifier = qualifiers[n.id] || edges.map(e => e.type.toLowerCase().replace(/_/g, ' ')).join(' · ');
        return `
          <li class="ev-rel-row">
            <span class="ev-rel-leader">··········</span>
            <span class="ev-rel-tag">[${escapeHtml(t)}]</span>
            <span class="ev-rel-name">${escapeHtml(n.name)}</span>
            <span class="ev-rel-qualifier">${escapeHtml(qualifier)}</span>
          </li>
        `;
      }).join('');
      return `
        <div class="ev-rel-group">
          <h3 class="ev-rel-h3">[${escapeHtml(t)}] <span class="ev-h3-count">/${String(items.length).padStart(2,'0')}</span></h3>
          <ul class="ev-rel-list">${rows}</ul>
        </div>
      `;
    }).join('');
    return `
      <section class="ev-section">
        <h2 class="ev-h2">// relations <span class="ev-h2-count">/${String(total).padStart(2,'0')} ·n=${String(total).padStart(2,'0')}</span></h2>
        ${groups}
      </section>
    `;
  }

  function renderListSection(label, items, opts = {}) {
    if (!items?.length) {
      return `
        <section class="ev-section">
          <h2 class="ev-h2">// ${escapeHtml(label)} <span class="ev-h2-count">/00</span></h2>
          <p class="ev-empty">${escapeHtml(opts.empty || `no ${label} listed yet — contribute via /contribute skill`)}</p>
        </section>
      `;
    }
    const rows = items.map((item, i) => {
      const idx = String(i + 1).padStart(2, '0');
      if (typeof item === 'string') {
        return `<li class="ev-list-row"><span class="ev-list-idx">${idx}</span> ${escapeHtml(item)}</li>`;
      }
      // exhibition / award shape
      if (item.year && item.title) {
        const venue = item.venue || item.body || '';
        return `<li class="ev-list-row"><span class="ev-list-year">[${escapeHtml(item.year)}]</span> <strong>${escapeHtml(item.title)}</strong>${venue ? ` · ${escapeHtml(venue)}` : ''}</li>`;
      }
      return `<li class="ev-list-row">${escapeHtml(JSON.stringify(item))}</li>`;
    }).join('');
    return `
      <section class="ev-section">
        <h2 class="ev-h2">// ${escapeHtml(label)} <span class="ev-h2-count">/${String(items.length).padStart(2,'0')}</span></h2>
        <ul class="ev-list">${rows}</ul>
      </section>
    `;
  }

  function renderProvenance(showcase) {
    if (!showcase) {
      return `
        <footer class="ev-provenance">
          <span class="ev-prov-tag">source_origin: graph-stub</span> · <span class="ev-prov-tag">awaiting enrichment via /contribute skill</span>
        </footer>
      `;
    }
    return `
      <footer class="ev-provenance">
        <span class="ev-prov-tag">source_origin: ${escapeHtml(showcase.source_origin || 'unknown')}</span>
        · <span class="ev-prov-tag">confidence: ${escapeHtml(showcase.confidence || 'unknown')}</span>
        ${showcase.review_pending ? '· <span class="ev-prov-tag ev-prov-warn">review pending</span>' : ''}
        · <span class="ev-prov-tag">last_updated: ${escapeHtml(showcase.last_updated || '—')}</span>
      </footer>
    `;
  }

  function renderHeaderIcons() {
    // Top-right: search, zoom, bookmark, plus, chat (chat = narrator, wired in next phase).
    return `
      <nav class="ev-header-icons" aria-label="entity actions">
        <button class="ev-icon" data-action="search" title="search" aria-label="search">⌕</button>
        <button class="ev-icon" data-action="zoom" title="zoom" aria-label="zoom">⊕</button>
        <button class="ev-icon" data-action="bookmark" title="bookmark" aria-label="bookmark">★</button>
        <button class="ev-icon" data-action="add" title="contribute" aria-label="contribute">+</button>
        <button class="ev-icon ev-icon--chat" data-action="chat" title="ask the archivist" aria-label="open chat narrator">◉</button>
      </nav>
    `;
  }

  function renderClose() {
    return `
      <button class="ev-close" data-action="close" aria-label="close entity view (esc)">
        <span class="ev-close-x">×</span>
        <span class="ev-close-key">esc</span>
      </button>
    `;
  }

  function renderRecCounter() {
    // Cosmetic — picks a stable hash-derived 5-digit number from the id.
    const id = STATE.currentId || '';
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const num = String(Math.abs(h) % 100000).padStart(5, '0');
    return `<aside class="ev-rec" aria-hidden="true">REC<br>.${num}</aside>`;
  }

  // ---------- Embedding sections ----------
  // Fetched async from /api/neighbours/:type/:slug after the overlay opens.
  // The container is laid down empty (with a "computing…" placeholder) by
  // render(); fillEmbeddings(id) fetches and replaces its contents.
  function renderEmbeddingsPlaceholder() {
    return `
      <section class="ev-section ev-embeddings" id="ev-embeddings">
        <h2 class="ev-h2">// embedding neighbours <span class="ev-h2-count" id="ev-emb-count">/··</span></h2>
        <p class="ev-empty" id="ev-emb-status">computing cosine neighbours over the embedding space…</p>
      </section>
    `;
  }

  function renderEmbeddingNeighbour(n) {
    const url = n.cdn_image_url || n.image_url || '';
    const sim = (typeof n.similarity === 'number') ? n.similarity.toFixed(3) : '—';
    const name = escapeHtml(n.name || n.node_id);
    const type = escapeHtml(n.type || '?');
    const img = url
      ? `<img src="${escapeHtml(url)}" alt="${name}" loading="lazy" crossorigin="anonymous">`
      : `<div class="ev-emb-thumb-empty" data-hatch="1">${name.slice(0, 32)}</div>`;
    return `
      <button class="ev-emb-card" data-node-id="${escapeHtml(n.node_id)}" title="${name}">
        <div class="ev-emb-thumb">${img}</div>
        <div class="ev-emb-meta">
          <span class="ev-emb-name">${name}</span>
          <span class="ev-emb-row">
            <span class="ev-emb-type">[${type}]</span>
            <span class="ev-emb-sim">${sim}</span>
          </span>
        </div>
      </button>
    `;
  }

  function renderEmbeddingsBody(payload) {
    const sections = payload?.sections || [];
    if (!sections.length) {
      // No vector / no centroid / no neighbours — empty by design for some
      // node types (institution, publication, classification_regime).
      return `
        <p class="ev-empty">no embedding neighbours for this node — <em>type may not carry a vector, or centroid not yet computed</em></p>
      `;
    }
    const total = sections.reduce((acc, s) => acc + (s.neighbours?.length || 0), 0);
    const blocks = sections.map((s) => {
      const cards = (s.neighbours || []).map(renderEmbeddingNeighbour).join('');
      const blurb = s.blurb ? `<p class="ev-emb-blurb">${escapeHtml(s.blurb)}</p>` : '';
      const keyTag = s.key ? `<span class="ev-emb-key">[${escapeHtml(s.key)}]</span>` : '';
      return `
        <div class="ev-emb-group" data-key="${escapeHtml(s.key || '')}">
          <h3 class="ev-emb-h3">${escapeHtml(s.title)} ${keyTag} <span class="ev-h3-count">/${String(s.neighbours.length).padStart(2, '0')}</span></h3>
          ${blurb}
          <div class="ev-emb-grid">${cards}</div>
        </div>
      `;
    }).join('');
    return `<div class="ev-emb-total" data-total="${total}"></div>${blocks}`;
  }

  async function fillEmbeddings(node) {
    const root = document.getElementById('ev-embeddings');
    if (!root) return;
    const slug = node.slug || node.id.split(':').slice(1).join(':');
    try {
      const r = await fetch(`/api/neighbours/${encodeURIComponent(node.type)}/${encodeURIComponent(slug)}`, {
        headers: { 'accept': 'application/json' },
      });
      if (!r.ok) {
        root.querySelector('#ev-emb-status').textContent = `embedding neighbours unavailable (${r.status})`;
        return;
      }
      const payload = await r.json();
      // The overlay may have been closed / navigated by the time the fetch
      // resolves — check that the placeholder we wrote is still the one
      // matching this node before mutating.
      if (STATE.currentId !== node.id) return;
      const total = (payload.sections || []).reduce((acc, s) => acc + (s.neighbours?.length || 0), 0);
      const countEl = root.querySelector('#ev-emb-count');
      const statusEl = root.querySelector('#ev-emb-status');
      if (countEl) countEl.textContent = `/${String(total).padStart(2, '0')}`;
      if (statusEl) statusEl.remove();
      // Append the rendered body after the heading.
      const body = document.createElement('div');
      body.innerHTML = renderEmbeddingsBody(payload);
      root.appendChild(body);
    } catch (err) {
      const status = root.querySelector('#ev-emb-status');
      if (status) status.textContent = 'embedding neighbours unavailable (network error)';
      console.warn('[entity-view] /api/neighbours fetch failed', err);
    }
  }

  // ---------- Main render ----------
  function render(id) {
    const node = resolveGraphNode(id);
    if (!node) return '<p class="ev-empty">node not found</p>';
    const showcase = resolveShowcase(id);
    const neighborMap = neighborsByEdgeType(id);

    // Collections / exhibitions / awards come from showcase only today.
    const collections = showcase?.collections || [];
    const exhibitions = showcase?.exhibitions_selected || [];
    const awards = showcase?.awards || [];

    return `
      ${renderClose()}
      ${renderRecCounter()}
      ${renderHeaderIcons()}
      <article class="ev-article">
        ${renderBreadcrumb(node, showcase)}
        ${renderTitle(node, showcase)}
        ${renderTagline(showcase)}
        ${renderHero(node, showcase, neighborMap)}
        <hr class="ev-hr">
        ${renderBio(showcase)}
        ${renderMetadata(showcase)}
        ${renderQuote(showcase)}
        ${renderWorks(node, showcase)}
        ${renderRelations(node, showcase, neighborMap)}
        ${renderEmbeddingsPlaceholder()}
        ${renderListSection('collections', collections, { empty: 'no public collection holdings linked yet — contribute via /contribute skill' })}
        ${renderListSection('exhibitions.selected', exhibitions, { empty: 'no curated exhibition history yet — contribute via /contribute skill' })}
        ${renderListSection('awards', awards, { empty: 'no awards linked yet — contribute via /contribute skill' })}
        ${renderProvenance(showcase)}
      </article>
    `;
  }

  // ---------- Open / close ----------
  function open(id) {
    if (!id) return;
    const el = ensureContainer();
    el.innerHTML = render(id);
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    STATE.open = true;
    STATE.currentId = id;
    // Lock body scroll while open.
    document.body.classList.add('ev-locked');
    // Focus the close button so ESC works without click.
    setTimeout(() => el.querySelector('.ev-close')?.focus(), 0);
    // Kick off the async embedding-neighbours fetch. The placeholder
    // section already exists in the DOM; this fills it.
    const node = resolveGraphNode(id);
    if (node) fillEmbeddings(node);
  }

  function close() {
    const el = document.getElementById('entity-view');
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '';
    STATE.open = false;
    STATE.currentId = null;
    document.body.classList.remove('ev-locked');
  }

  // ---------- Triggers ----------
  function getCurrentFocusedId() {
    const b = window.ADAI_GRAPH_FIELD;
    return b?.focusedId || null;
  }

  document.addEventListener('keydown', (e) => {
    if (STATE.open) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      return;
    }
    // 'i' opens entity view for the currently focused node.
    if ((e.key === 'i' || e.key === 'I') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const id = getCurrentFocusedId();
      if (id) {
        e.preventDefault();
        open(id);
      }
    }
  });

  // Click handler — close button + future header-icon actions + embedding
  // neighbour cards (re-open entity view on the clicked neighbour).
  document.addEventListener('click', (e) => {
    if (!STATE.open) return;
    const card = e.target?.closest?.('.ev-emb-card');
    if (card && card.dataset.nodeId) {
      e.preventDefault();
      const nextId = card.dataset.nodeId;
      // Also drive the underlying field's focus so the breadcrumb + zoom
      // state stay coherent when the user closes the overlay.
      const field = window.ADAI_GRAPH_FIELD;
      if (field && typeof field.zoomTo === 'function' && nextId !== STATE.currentId) {
        try { field.zoomTo(nextId); } catch { /* non-fatal */ }
      }
      open(nextId);
      return;
    }
    const action = e.target?.closest?.('[data-action]')?.dataset?.action;
    if (action === 'close') {
      e.preventDefault(); close();
    } else if (action === 'chat') {
      e.preventDefault();
      // Narrator wired in next phase — placeholder.
      console.log('[entity-view] chat narrator not yet wired');
    }
  });

  // Public API.
  window.ADAI_ENTITY_VIEW = { open, close, get isOpen() { return STATE.open; } };

  // ---------- Inline styles ----------
  const style = document.createElement('style');
  style.textContent = `
    body.ev-locked { overflow: hidden; }
    #entity-view {
      position: fixed; inset: 0; z-index: 1000;
      background: var(--void, #0C0C0E);
      color: var(--text, #E8E6E1);
      font-family: var(--mono, 'SF Mono', 'Menlo', 'Consolas', monospace);
      overflow: auto;
      display: none;
    }
    #entity-view.is-open { display: block; }

    .ev-close {
      position: fixed; left: 16px; top: 50%; transform: translateY(-50%);
      width: 40px; padding: 8px 4px; border: 1px solid #2a2a2c; background: rgba(0,0,0,0.4);
      color: var(--text, #E8E6E1); font-family: inherit; font-size: 12px; line-height: 1;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      cursor: pointer; z-index: 1100;
    }
    .ev-close:hover { background: rgba(255,255,255,0.06); }
    .ev-close-x { font-size: 16px; }
    .ev-close-key { color: #6a6a6c; font-size: 10px; letter-spacing: 0.05em; }

    .ev-rec {
      position: fixed; left: 16px; bottom: 24px;
      color: #4a4a4c; font-size: 10px; letter-spacing: 0.08em;
      writing-mode: vertical-rl; transform: rotate(180deg);
      z-index: 1100; pointer-events: none;
    }

    .ev-header-icons {
      position: fixed; right: 24px; top: 16px;
      display: flex; gap: 12px; z-index: 1100;
    }
    .ev-icon {
      width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
      background: transparent; border: none; color: #8a8a8c; font-family: inherit;
      cursor: pointer; font-size: 16px; line-height: 1;
    }
    .ev-icon:hover { color: var(--text, #E8E6E1); }

    .ev-article {
      max-width: 980px; margin: 0 auto; padding: 64px 56px 96px;
    }

    .ev-breadcrumb {
      color: #8a8a8c; font-size: 13px; letter-spacing: 0.02em; margin-bottom: 24px;
    }
    .ev-bc-type { color: var(--text); }
    .ev-bc-sep { color: #4a4a4c; padding: 0 6px; }
    .ev-bc-slug { color: #8a8a8c; }

    .ev-title {
      font-family: inherit; font-weight: 700; letter-spacing: -0.01em;
      font-size: 56px; line-height: 1.05; color: var(--text);
      margin-bottom: 8px;
    }
    .ev-dates {
      font-weight: 400; font-size: 28px; color: #6a6a6c; padding-left: 8px;
    }

    .ev-tagline {
      font-size: 14px; color: var(--text); margin-bottom: 32px;
    }
    .ev-tagline-cf { color: #6a6a6c; padding-left: 12px; }

    .ev-hero {
      position: relative; margin: 32px 0 0;
      width: 100%; aspect-ratio: 16/9;
      border: 1px solid #2a2a2c; background: #111114;
      overflow: hidden; display: block;
    }
    .ev-hero img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .ev-hero[data-hatch="1"]::before {
      content: '';
      position: absolute; inset: 0;
      background-image: repeating-linear-gradient(45deg, #1a1a1c 0 1px, transparent 1px 12px);
    }
    .ev-hero-cap {
      position: absolute; left: 0; right: 0; bottom: 0;
      padding: 16px 20px; color: #8a8a8c; font-size: 12px;
      background: linear-gradient(to top, rgba(12,12,14,0.92), rgba(12,12,14,0));
    }
    .ev-hero--image .ev-hero-cap { background: linear-gradient(to top, rgba(12,12,14,0.85), rgba(12,12,14,0)); }
    .ev-mono-tag { color: #b4b4b6; }
    .ev-mono-dim { color: #6a6a6c; }

    .ev-hr { border: 0; border-top: 1px solid #2a2a2c; margin: 48px 0 32px; }

    .ev-bio {
      font-size: 18px; line-height: 1.55; color: var(--text); margin-bottom: 40px;
    }
    .ev-bio-mark { color: var(--brand-color, #4169B0); padding-left: 4px; }

    .ev-meta {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px 48px;
      margin-bottom: 48px; font-size: 14px;
    }
    .ev-meta-col { display: grid; grid-template-columns: 120px 1fr; gap: 8px 16px; align-content: start; }
    .ev-meta-k { color: #6a6a6c; }
    .ev-meta-v { color: var(--text); }

    .ev-quote {
      border-left: 2px solid #2a2a2c; padding: 12px 0 12px 24px; margin: 0 0 56px;
    }
    .ev-quote-text { font-size: 18px; line-height: 1.6; color: var(--text); margin-bottom: 12px; }
    .ev-quote-attr { font-size: 13px; color: #8a8a8c; }

    .ev-section { margin-bottom: 56px; }
    .ev-h2 {
      font-size: 14px; font-weight: 400; color: var(--text);
      border-bottom: 1px solid #2a2a2c; padding-bottom: 6px; margin-bottom: 24px;
      letter-spacing: 0.04em;
    }
    .ev-h2-count { color: #6a6a6c; padding-left: 8px; }
    .ev-h2-source { color: #6a6a6c; padding-left: 12px; font-size: 12px; font-style: italic; }

    .ev-empty {
      color: #8a8a8c; font-size: 13px; padding: 12px 0;
    }
    .ev-empty em { color: var(--brand-color, #4169B0); font-style: normal; }

    .ev-works { display: flex; flex-direction: column; gap: 24px; }
    .ev-work {
      display: grid; grid-template-columns: 240px 1fr; gap: 32px;
      align-items: start;
    }
    .ev-work-img {
      position: relative; aspect-ratio: 1/1; width: 100%;
      border: 1px solid #2a2a2c; background: #111114; overflow: hidden;
      display: block;
    }
    .ev-work-img img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .ev-work-img[data-hatch="1"]::before {
      content: ''; position: absolute; inset: 0;
      background-image: repeating-linear-gradient(45deg, #1a1a1c 0 1px, transparent 1px 10px);
    }
    .ev-work-img-cap {
      position: absolute; left: 0; right: 0; bottom: 0;
      padding: 10px 12px; color: #8a8a8c; font-size: 11px;
      background: linear-gradient(to top, rgba(12,12,14,0.95), rgba(12,12,14,0));
      line-height: 1.4;
    }
    .ev-work-body { padding-top: 4px; }
    .ev-work-title { font-size: 14px; font-weight: 400; margin-bottom: 6px; color: var(--text); }
    .ev-work-title strong { font-weight: 700; }
    .ev-work-year { color: #8a8a8c; font-weight: 400; padding-left: 4px; }
    .ev-work-medium { font-size: 13px; color: #8a8a8c; margin-bottom: 8px; }
    .ev-work-method { color: #b4b4b6; }
    .ev-work-blurb { font-size: 13px; color: var(--text); }

    .ev-rel-group { margin-bottom: 24px; }
    .ev-rel-h3 {
      font-size: 13px; font-weight: 400; color: #8a8a8c; margin-bottom: 8px;
    }
    .ev-h3-count { color: #4a4a4c; padding-left: 6px; }
    .ev-rel-list { list-style: none; padding: 0; margin: 0; }
    .ev-rel-row {
      display: grid; grid-template-columns: 100px 110px 1fr auto; gap: 12px;
      padding: 4px 0; font-size: 13px; align-items: baseline;
    }
    .ev-rel-leader { color: #2a2a2c; letter-spacing: 0.04em; overflow: hidden; }
    .ev-rel-tag { color: #6a6a6c; }
    .ev-rel-name { color: var(--text); }
    .ev-rel-qualifier { color: #8a8a8c; text-align: right; }

    .ev-list { list-style: none; padding: 0; margin: 0; }
    .ev-list-row {
      padding: 4px 0; font-size: 13px; color: var(--text);
      display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: baseline;
    }
    .ev-list-idx, .ev-list-year { color: #8a8a8c; min-width: 56px; }

    /* ---- embedding neighbours block ---- */
    .ev-embeddings .ev-emb-group { margin-bottom: 32px; }
    .ev-emb-h3 {
      font-size: 13px; font-weight: 500; color: var(--text);
      margin-bottom: 4px;
    }
    .ev-emb-key {
      color: #6a6a6c; font-weight: 400; padding-left: 6px; font-size: 11px;
    }
    .ev-emb-blurb { font-size: 12px; color: #8a8a8c; margin: 0 0 12px; }
    .ev-emb-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      gap: 12px;
    }
    .ev-emb-card {
      display: flex; flex-direction: column; gap: 6px;
      background: transparent; border: 1px solid #2a2a2c; padding: 6px;
      color: inherit; font-family: inherit; text-align: left;
      cursor: pointer; transition: border-color 200ms, background 200ms;
    }
    .ev-emb-card:hover { border-color: #4a4a4c; background: rgba(255,255,255,0.02); }
    .ev-emb-thumb {
      position: relative; aspect-ratio: 1/1; width: 100%;
      background: #111114; overflow: hidden;
    }
    .ev-emb-thumb img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .ev-emb-thumb-empty {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      padding: 6px; font-size: 10px; color: #8a8a8c; text-align: center;
      line-height: 1.3;
    }
    .ev-emb-thumb-empty[data-hatch="1"]::before {
      content: ''; position: absolute; inset: 0;
      background-image: repeating-linear-gradient(45deg, #1a1a1c 0 1px, transparent 1px 10px);
    }
    .ev-emb-meta {
      display: flex; flex-direction: column; gap: 2px;
      font-size: 11px; line-height: 1.35;
    }
    .ev-emb-name { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ev-emb-row { display: flex; justify-content: space-between; color: #8a8a8c; }
    .ev-emb-type { color: #6a6a6c; }
    .ev-emb-sim { color: var(--brand-color, #4169B0); font-variant-numeric: tabular-nums; }

    .ev-provenance {
      margin-top: 64px; padding-top: 16px; border-top: 1px solid #2a2a2c;
      font-size: 11px; color: #6a6a6c; letter-spacing: 0.04em;
    }
    .ev-prov-tag { color: #8a8a8c; }
    .ev-prov-warn { color: #c4a868; }

    @media (max-width: 768px) {
      .ev-article { padding: 56px 24px 80px; }
      .ev-title { font-size: 36px; }
      .ev-meta { grid-template-columns: 1fr; gap: 4px; }
      .ev-meta-col { grid-template-columns: 100px 1fr; }
      .ev-work { grid-template-columns: 1fr; gap: 16px; }
      .ev-rel-row { grid-template-columns: 1fr auto; gap: 6px; }
      .ev-rel-leader, .ev-rel-tag { display: none; }
    }
  `;
  document.head.appendChild(style);
})();
