/* Shared helpers for the zdtp improvement prototypes. Builds the fake host
   page, the panel shell (header / tab bar / body) and token rows so each
   prototype file only contains the ONE idea it demonstrates. */
(function () {
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${inner}</svg>`;
  const I = {
    eye: svg('<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>'),
    eyeOn: svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    crosshair: svg('<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    undo: svg('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'),
    redo: svg('<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>'),
    revert: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    chain: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'),
    history: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    float: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="9" y="8" width="9" height="8" rx="1"/>'),
    dockRight: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M14 3v18"/>'),
    dockBottom: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 14h18"/>'),
    mini: svg('<rect x="3" y="15" width="18" height="6" rx="3"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    chevron: svg('<path d="m9 6 6 6-6 6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3"/>'),
  };

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null || c === false) continue;
      n.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }
  const icon = (name, cls = '') => el('span', { class: 'ico ' + cls, html: I[name] });

  /* ---- token dataset (subset of the doc site's real manifest) ---- */
  const DATA = {
    tabs: [
      { id: 'palette', label: 'Palette' },
      {
        id: 'color', label: 'Color', tiers: [
          { id: 'semantic', label: 'Zudo Doc — Semantic Tokens', kind: 'color', items: [
            { v: '--zd-bg', ref: '--palette-base-0', hex: '#f4f2ee' },
            { v: '--zd-fg', ref: '--palette-base-4', hex: '#1c1c1c' },
            { v: '--zd-surface', ref: '--palette-base-0', hex: '#fbfaf7' },
            { v: '--zd-muted', ref: '--palette-base-2', hex: '#6f6a62' },
            { v: '--zd-accent', ref: '--palette-accent-1', hex: '#d69a66' },
            { v: '--zd-accent-hover', ref: null, hex: '#a35c1f' },
            { v: '--zd-code-bg', ref: '--palette-base-1', hex: '#eee9df' },
            { v: '--zd-code-fg', ref: '--palette-base-4', hex: '#222222' },
            { v: '--zd-success', ref: null, hex: '#3e8a3c' },
            { v: '--zd-danger', ref: null, hex: '#c0392b' },
            { v: '--zd-warning', ref: null, hex: '#a67c1a' },
            { v: '--zd-info', ref: null, hex: '#2b6cb0' },
            { v: '--zd-selection-bg', ref: '--palette-accent-0', hex: '#f3c99b' },
            { v: '--zd-chat-user-bg', ref: '--palette-accent-0', hex: '#f3c99b' },
            { v: '--zd-mermaid-line', ref: '--palette-base-3', hex: '#4a4640' },
          ] },
        ] },
      {
        id: 'font', label: 'Font', tiers: [
          { id: 'scale', label: 'Scale', unit: 'rem', step: 0.125, min: 0.5, max: 5, items: [
            { v: '--text-scale-2xs', id: 'text-scale-2xs', d: 0.75 }, { v: '--text-scale-xs', id: 'text-scale-xs', d: 0.875 },
            { v: '--text-scale-sm', id: 'text-scale-sm', d: 1 }, { v: '--text-scale-md', id: 'text-scale-md', d: 1.2 },
            { v: '--text-scale-lg', id: 'text-scale-lg', d: 1.4 }, { v: '--text-scale-xl', id: 'text-scale-xl', d: 3 },
            { v: '--text-scale-2xl', id: 'text-scale-2xl', d: 3.75 },
          ] },
          { id: 'leading', label: 'Line height', unit: '', step: 0.025, min: 0.9, max: 2.2, items: [
            { v: '--leading-tight', id: 'leading-tight', d: 1.25 }, { v: '--leading-snug', id: 'leading-snug', d: 1.375 },
            { v: '--leading-normal', id: 'leading-normal', d: 1.5 }, { v: '--leading-relaxed', id: 'leading-relaxed', d: 1.625 },
          ] },
        ] },
      {
        id: 'spacing', label: 'Spacing', tiers: [
          { id: 'hsp', label: 'Horizontal spacing', unit: 'rem', step: 0.125, min: 0, max: 4, items: [
            { v: '--spacing-hsp-2xs', id: 'hsp-2xs', d: 0.125 }, { v: '--spacing-hsp-xs', id: 'hsp-xs', d: 0.375 },
            { v: '--spacing-hsp-sm', id: 'hsp-sm', d: 0.5 }, { v: '--spacing-hsp-md', id: 'hsp-md', d: 0.75 },
            { v: '--spacing-hsp-lg', id: 'hsp-lg', d: 1 }, { v: '--spacing-hsp-xl', id: 'hsp-xl', d: 1.5 },
            { v: '--spacing-hsp-2xl', id: 'hsp-2xl', d: 2 },
          ] },
          { id: 'vsp', label: 'Vertical spacing', unit: 'rem', step: 0.125, min: 0, max: 6, items: [
            { v: '--spacing-vsp-3xs', id: 'vsp-3xs', d: 0.25 }, { v: '--spacing-vsp-2xs', id: 'vsp-2xs', d: 0.4375 },
            { v: '--spacing-vsp-xs', id: 'vsp-xs', d: 0.875 }, { v: '--spacing-vsp-sm', id: 'vsp-sm', d: 1.25 },
            { v: '--spacing-vsp-md', id: 'vsp-md', d: 1.5 }, { v: '--spacing-vsp-lg', id: 'vsp-lg', d: 1.75 },
            { v: '--spacing-vsp-xl', id: 'vsp-xl', d: 2.5 }, { v: '--spacing-vsp-2xl', id: 'vsp-2xl', d: 3.5 },
          ] },
          { id: 'icon', label: 'Icons', unit: 'rem', step: 0.125, min: 0.5, max: 3, items: [
            { v: '--spacing-icon-xs', id: 'icon-xs', d: 0.75 }, { v: '--spacing-icon-sm', id: 'icon-sm', d: 1 },
            { v: '--spacing-icon-md', id: 'icon-md', d: 1.25 }, { v: '--spacing-icon-lg', id: 'icon-lg', d: 1.5 },
          ] },
        ] },
      {
        id: 'size', label: 'Size', tiers: [
          { id: 'radius', label: 'Radius', unit: 'px', step: 1, min: 0, max: 32, items: [
            { v: '--radius-DEFAULT', id: 'radius-DEFAULT', d: 4 }, { v: '--radius-lg', id: 'radius-lg', d: 8 },
          ] },
          { id: 'transition', label: 'Transition', unit: 'ms', step: 10, min: 0, max: 1000, items: [
            { v: '--default-transition-duration', id: 'default-transition-duration', d: 150 },
          ] },
        ] },
    ],
  };

  function host(opts = {}) {
    const h = el('div', { class: 'host', id: 'host' });
    h.innerHTML = `
      <div class="host-header"><span class="brand">Zudo Token Panel</span>
        <span class="nav"><span>Getting Started</span><span>Reference</span><span>Recipes</span><span>Changelog</span></span></div>
      <div class="host-body">
        <h1 id="h1">Quickstart</h1>
        <p>Configure the panel, declare a minimal tabs manifest, and toggle it from the devtools console.</p>
        <div class="card" id="card"><b>Manifest</b><p style="margin:6px 0 10px">Every tab in the panel strip is one entry in the <code>tabs</code> array. A tab can have multiple tiers, and a tier can reference another tier's items.</p><span class="btn" id="btn">Read the reference</span></div>
        <h2>Lifecycle helpers</h2>
        <p>The public surface of the package is a single configure-once init: <code>configurePanel({...})</code>. Calling <code>showDesignPanel()</code> lazy-imports the panel module and mounts the UI.</p>
        <div class="card"><b>Persistence</b><p style="margin:6px 0 0">Changes apply to <code>:root</code> instantly, persist to localStorage, and survive view transitions and hard reloads.</p></div>
        ${opts.extra || ''}
      </div>`;
    document.body.append(h);
    return h;
  }

  function shell(o = {}) {
    const s = el('div', { class: 'shell', id: 'shell' });
    const hdr = el('div', { class: 'hdr' }, [
      el('span', { class: 'title' }, o.title || 'zdtp'),
      ...(o.actions || ['Export', 'Load from JSON…', 'Apply', 'Reset']).map((a) =>
        el('button', { class: 'link', onclick: () => o.onAction && o.onAction(a) }, a)),
      ...(o.headerExtra || []),
      el('div', { class: 'spacer' }),
      ...(o.headerRight || []),
      el('button', { class: 'icon-btn', title: 'Toggle element path copy', html: I.crosshair }),
      el('button', { class: 'icon-btn', title: 'Highlight outline settings', html: I.gear }),
      el('button', { class: 'icon-btn', title: 'Close panel', html: I.close }),
    ]);
    const tabsEl = el('div', { class: 'tabs', role: 'tablist' });
    const tabs = o.tabs || DATA.tabs.map((t) => t.label);
    const tabNodes = {};
    tabs.forEach((label) => {
      const t = el('div', { class: 'tab' + (label === (o.active || tabs[0]) ? ' is-active' : ''), role: 'tab' }, label);
      t.addEventListener('click', () => {
        tabsEl.querySelectorAll('.tab').forEach((x) => x.classList.remove('is-active'));
        t.classList.add('is-active');
        o.onTab && o.onTab(label);
      });
      tabNodes[label] = t;
      tabsEl.append(t);
    });
    const tabbar = el('div', { class: 'tabbar' }, [
      tabsEl,
      ...(o.tabbarExtra || []),
      el('div', { class: 'spacer' }),
      el('div', { class: 'density', html: '<span>Density</span><input type="range" min="0" max="2" value="1">' }),
    ]);
    const body = el('div', { class: 'body' });
    s.append(hdr, tabbar, body, el('div', { class: 'grip' }));
    document.body.append(s);
    return { shell: s, hdr, tabbar, tabs: tabNodes, body };
  }

  function section(label, children, attrs = {}) {
    return el('div', { class: 'section', ...attrs }, [el('div', { class: 'section-h', role: 'heading', 'aria-level': 3 }, label), ...[].concat(children)]);
  }

  /* One numeric token row: [--var / id]  [ 0.75 ][rem] (eye) */
  function row(t, unit, opts = {}) {
    const input = el('input', { class: 'num', type: 'text', value: t.val ?? t.d });
    const head = el('div', { class: 'row-head' }, [
      el('div', { class: 'lbl' }, [el('span', { class: 'var' }, t.v), el('span', { class: 'id' }, t.id || t.v.replace(/^--/, ''))]),
      ...(opts.beforeInput || []),
      input,
      el('span', { class: 'unit' }, unit || ''),
      ...(opts.afterUnit || []),
      el('span', { class: 'eye', title: 'Highlight elements using this token', html: I.eye }),
    ]);
    const r = el('div', { class: 'row', 'data-var': t.v }, [head, ...(opts.tail || [])]);
    r.input = input;
    if (opts.onInput) input.addEventListener('input', () => opts.onInput(input.value, r));
    return r;
  }

  function banner(html) {
    const body = el('div', { class: 'idea-body', html });
    const tg = el('button', { class: 'idea-toggle' }, 'hide');
    const b = el('div', { class: 'idea' }, [body, tg]);
    const toggle = () => { b.classList.toggle('is-min'); tg.textContent = b.classList.contains('is-min') ? 'ⓘ what is this prototype?' : 'hide'; };
    tg.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    b.addEventListener('click', () => b.classList.contains('is-min') && toggle());
    document.body.append(b);
    return b;
  }

  window.Z = { I, el, icon, DATA, host, shell, section, row, banner };
})();
