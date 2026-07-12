/* DOM Tweaker prototype (issue #528 feasibility).
   Flow: toggle ON → inject @tailwindcss/browser runtime + theme bridge →
   alt-hover highlights, alt-click selects → edit icon → className chip editor
   with suggestions → live apply (runtime JIT-compiles unseen classes) →
   diff panel for AI handoff. Vanilla JS on purpose: proves the concept below
   the Preact layer. */
(() => {
  'use strict';

  const state = {
    on: false,
    runtimeInjected: false,
    runtimeReady: false,
    selected: null,            // currently selected element
    edits: new Map(),          // element -> { original: string }
  };

  /* ---------------------------------------------------------------- utils */

  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  };

  const isTweakerUI = (node) =>
    node instanceof Element && node.closest('[data-tweaker-ui]') !== null;

  // Selector built from ORIGINAL classes (the ones that exist in source code),
  // so the exported diff points an AI/human at the real source location.
  const selectorPath = (target) => {
    const parts = [];
    let node = target;
    while (node && node !== document.body && parts.length < 5) {
      if (node.id) { parts.unshift(`#${node.id}`); break; }
      const orig = state.edits.get(node)?.original ?? node.className;
      const cls = String(orig).trim().split(/\s+/).filter(Boolean).slice(0, 3);
      let part = node.tagName.toLowerCase() + cls.map((c) => `.${CSS.escape(c)}`).join('');
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  /* ----------------------------------------------- tailwind runtime bridge */

  // In the real feature zdtp would generate the @theme block from the host's
  // design tokens (it already owns them). Here we hard-code one custom token
  // (--color-brand) to prove custom-theme classes like `bg-brand` compile.
  const THEME_BRIDGE = `
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@theme {
  --color-brand: #7c3aed;
}
`;

  const injectRuntime = () => {
    if (state.runtimeInjected) return;
    state.runtimeInjected = true;

    const style = document.createElement('style');
    style.setAttribute('type', 'text/tailwindcss');
    style.textContent = THEME_BRIDGE;
    document.head.append(style);

    const script = document.createElement('script');
    script.src = './tailwind-browser.js';
    document.head.append(script);

    // Readiness probe: the runtime is up once a class that is NOT in the
    // purged host CSS gets real computed styles.
    const probe = el('div', {
      'data-tweaker-ui': '',
      class: 'p-1',
      style: 'position:fixed;left:-9999px;top:0;',
    });
    document.body.append(probe);
    const t0 = performance.now();
    const poll = setInterval(() => {
      const pad = getComputedStyle(probe).paddingLeft;
      if (pad && pad !== '0px') {
        clearInterval(poll);
        probe.remove();
        state.runtimeReady = true;
        statusEl.dataset.state = 'ready';
        statusEl.textContent = `runtime ready (${Math.round(performance.now() - t0)}ms)`;
      } else if (performance.now() - t0 > 10000) {
        clearInterval(poll);
        probe.remove();
        statusEl.dataset.state = 'error';
        statusEl.textContent = 'runtime FAILED to compile within 10s';
      }
    }, 50);
  };

  /* ------------------------------------------------------------ suggestions */

  const buildSuggestions = () => {
    const out = new Set();
    const scale = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8',
      '10', '12', '14', '16', '20', '24', '32', '40', '48', '64'];
    const spacing = ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
      'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'gap', 'gap-x', 'gap-y',
      'w', 'h', 'space-x', 'space-y'];
    for (const pre of spacing) for (const s of scale) out.add(`${pre}-${s}`);
    const colors = ['slate', 'gray', 'red', 'orange', 'amber', 'yellow', 'green',
      'emerald', 'teal', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose'];
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    for (const c of colors) for (const sh of shades) {
      out.add(`bg-${c}-${sh}`); out.add(`text-${c}-${sh}`); out.add(`border-${c}-${sh}`);
    }
    // custom theme token from the bridge
    out.add('bg-brand'); out.add('text-brand'); out.add('border-brand');
    for (const s of ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']) out.add(`text-${s}`);
    for (const w of ['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']) out.add(`font-${w}`);
    for (const r of ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full']) out.add(`rounded-${r}`);
    for (const u of ['rounded', 'flex', 'inline-flex', 'grid', 'block', 'inline-block',
      'hidden', 'flex-row', 'flex-col', 'flex-wrap', 'grow', 'shrink-0',
      'items-start', 'items-center', 'items-end', 'items-stretch',
      'justify-start', 'justify-center', 'justify-end', 'justify-between',
      'border', 'border-0', 'border-2', 'border-4',
      'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl',
      'underline', 'line-through', 'uppercase', 'lowercase', 'capitalize',
      'italic', 'truncate', 'w-full', 'h-full', 'w-auto', 'h-auto',
      'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl',
      'opacity-50', 'opacity-75', 'opacity-100', 'cursor-pointer', 'select-none',
      'text-center', 'text-left', 'text-right',
      'leading-none', 'leading-tight', 'leading-normal', 'leading-relaxed',
      'tracking-tight', 'tracking-wide']) out.add(u);
    return [...out].sort();
  };
  const SUGGESTIONS = buildSuggestions();

  /* ------------------------------------------------------------------- UI */

  const Z = 2147483000;

  // toolbar (simulates the zdtp panel's "DOM Tweaker" switch)
  const statusEl = el('span', {
    'data-tweaker': 'status', 'data-state': 'off',
    style: 'font-size:11px;opacity:.8;',
  }, 'off');
  const toggleBtn = el('button', {
    'data-tweaker': 'toggle',
    style: 'font:12px/1.2 ui-monospace,monospace;padding:6px 10px;border-radius:6px;border:1px solid #52525b;background:#18181b;color:#fafafa;cursor:pointer;',
    onclick: () => setOn(!state.on),
  }, 'DOM Tweaker: OFF');
  const toolbar = el('div', {
    'data-tweaker-ui': '',
    style: `position:fixed;top:12px;right:12px;z-index:${Z};display:flex;gap:8px;align-items:center;background:#18181bcc;padding:6px 8px;border-radius:8px;color:#fafafa;backdrop-filter:blur(4px);`,
  }, toggleBtn, statusEl);

  // hover highlight overlay
  const hoverLabel = el('span', {
    style: 'position:absolute;left:0;top:-20px;font:10px/1.6 ui-monospace,monospace;background:#1d4ed8;color:#fff;padding:0 6px;border-radius:3px;white-space:nowrap;',
  });
  const hoverBox = el('div', {
    'data-tweaker-ui': '',
    style: `position:fixed;display:none;pointer-events:none;z-index:${Z - 2};background:#3b82f61a;outline:2px solid #3b82f6;outline-offset:-1px;`,
  }, hoverLabel);

  // edit icon shown on the alt-clicked element
  const editIcon = el('button', {
    'data-tweaker-ui': '', 'data-tweaker': 'edit-icon', title: 'Edit classes',
    style: `position:fixed;display:none;z-index:${Z};width:24px;height:24px;border-radius:50%;border:none;background:#7c3aed;color:#fff;cursor:pointer;font-size:13px;line-height:24px;padding:0;box-shadow:0 1px 4px #0006;`,
    onclick: () => openEditor(),
  }, '✎');

  // class editor popup
  const chipsWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;margin:8px 0;' });
  const sugList = el('div', {
    'data-tweaker': 'suggestions',
    style: 'display:none;position:absolute;left:10px;right:10px;max-height:180px;overflow:auto;background:#27272a;border:1px solid #3f3f46;border-radius:6px;z-index:5;',
  });
  const classInput = el('input', {
    'data-tweaker': 'class-input', placeholder: 'add class… (Tailwind suggestions)',
    style: 'width:100%;box-sizing:border-box;font:12px ui-monospace,monospace;padding:6px 8px;border-radius:6px;border:1px solid #3f3f46;background:#09090b;color:#fafafa;outline:none;',
  });
  const editorTitle = el('div', {
    style: 'font-size:10px;opacity:.7;word-break:break-all;margin-bottom:2px;',
  });
  const editor = el('div', {
    'data-tweaker-ui': '', 'data-tweaker': 'editor',
    style: `position:fixed;display:none;z-index:${Z};width:300px;background:#18181b;color:#fafafa;border:1px solid #3f3f46;border-radius:10px;padding:10px;font:12px/1.5 ui-monospace,monospace;box-shadow:0 8px 30px #000a;`,
  },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;' },
      el('span', { style: 'font-weight:700;' }, 'classes'),
      el('button', {
        style: 'border:none;background:none;color:#a1a1aa;cursor:pointer;font-size:14px;',
        onclick: () => { editor.style.display = 'none'; },
      }, '×')),
    editorTitle, chipsWrap, classInput, sugList,
  );

  // diff panel (the "export for AI" surface)
  const diffArea = el('textarea', {
    'data-tweaker': 'diff', readonly: '', spellcheck: 'false',
    style: 'width:100%;height:130px;box-sizing:border-box;font:11px/1.5 ui-monospace,monospace;background:#09090b;color:#a7f3d0;border:1px solid #3f3f46;border-radius:6px;padding:8px;resize:vertical;',
  });
  const copyBtn = el('button', {
    style: 'font:11px ui-monospace,monospace;padding:4px 8px;border-radius:5px;border:1px solid #3f3f46;background:#27272a;color:#fafafa;cursor:pointer;',
    onclick: () => navigator.clipboard?.writeText(diffArea.value),
  }, 'copy');
  const diffPanel = el('div', {
    'data-tweaker-ui': '', 'data-tweaker': 'diff-panel',
    style: `position:fixed;bottom:12px;right:12px;z-index:${Z - 1};width:340px;display:none;background:#18181b;color:#fafafa;border:1px solid #3f3f46;border-radius:10px;padding:10px;font:12px/1.5 ui-monospace,monospace;box-shadow:0 8px 30px #000a;`,
  },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;' },
      el('span', { style: 'font-weight:700;' }, 'edits (for AI handoff)'), copyBtn),
    diffArea,
  );

  document.body.append(toolbar, hoverBox, editIcon, editor, diffPanel);

  /* ------------------------------------------------------------- behaviors */

  const setOn = (on) => {
    state.on = on;
    toggleBtn.textContent = `DOM Tweaker: ${on ? 'ON' : 'OFF'}`;
    toggleBtn.style.background = on ? '#7c3aed' : '#18181b';
    if (on) {
      if (!state.runtimeInjected) {
        statusEl.dataset.state = 'loading';
        statusEl.textContent = 'loading runtime…';
        injectRuntime();
      }
    } else {
      hoverBox.style.display = 'none';
      editIcon.style.display = 'none';
      editor.style.display = 'none';
      state.selected = null;
    }
  };

  const positionEditIcon = (target) => {
    const r = target.getBoundingClientRect();
    editIcon.style.left = `${Math.min(window.innerWidth - 28, r.right - 10)}px`;
    editIcon.style.top = `${Math.max(4, r.top - 12)}px`;
    editIcon.style.display = 'block';
  };

  document.addEventListener('mousemove', (e) => {
    if (!state.on || !e.altKey) { hoverBox.style.display = 'none'; return; }
    const t = e.target;
    if (!(t instanceof Element) || isTweakerUI(t) || t === document.body || t === document.documentElement) {
      hoverBox.style.display = 'none';
      return;
    }
    const r = t.getBoundingClientRect();
    hoverBox.style.display = 'block';
    hoverBox.style.left = `${r.left}px`;
    hoverBox.style.top = `${r.top}px`;
    hoverBox.style.width = `${r.width}px`;
    hoverBox.style.height = `${r.height}px`;
    hoverLabel.textContent = `${t.tagName.toLowerCase()}.${String(t.className).trim().split(/\s+/).filter(Boolean).join('.')}`;
  }, true);

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') hoverBox.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (!state.on || !e.altKey) return;
    const t = e.target;
    if (!(t instanceof Element) || isTweakerUI(t)) return;
    e.preventDefault();
    e.stopPropagation();
    state.selected = t;
    hoverBox.style.display = 'none';
    editor.style.display = 'none';
    positionEditIcon(t);
  }, true);

  /* --------------------------------------------------------------- editor */

  const currentClasses = () =>
    String(state.selected?.className ?? '').trim().split(/\s+/).filter(Boolean);

  const recordOriginal = (target) => {
    if (!state.edits.has(target)) state.edits.set(target, { original: String(target.className) });
  };

  const renderChips = () => {
    chipsWrap.textContent = '';
    for (const cls of currentClasses()) {
      const chip = el('span', {
        'data-chip': cls,
        style: 'display:inline-flex;align-items:center;gap:4px;background:#27272a;border:1px solid #3f3f46;border-radius:999px;padding:2px 4px 2px 8px;font-size:11px;',
      },
        cls,
        el('button', {
          'data-remove': '', title: `remove ${cls}`,
          style: 'border:none;background:#3f3f46;color:#fafafa;border-radius:50%;width:14px;height:14px;line-height:12px;font-size:10px;cursor:pointer;padding:0;',
          onclick: () => applyClassChange(() => state.selected.classList.remove(cls)),
        }, '×'));
      chipsWrap.append(chip);
    }
  };

  const applyClassChange = (mutate) => {
    if (!state.selected) return;
    recordOriginal(state.selected);
    mutate();
    renderChips();
    renderDiff();
    positionEditIcon(state.selected);
  };

  const openEditor = () => {
    if (!state.selected) return;
    const r = state.selected.getBoundingClientRect();
    editor.style.left = `${Math.max(8, Math.min(window.innerWidth - 316, r.left))}px`;
    editor.style.top = `${Math.min(window.innerHeight - 260, r.bottom + 8)}px`;
    editor.style.display = 'block';
    editorTitle.textContent = selectorPath(state.selected);
    renderChips();
    classInput.value = '';
    sugList.style.display = 'none';
    classInput.focus();
  };

  // suggestion dropdown
  let activeSug = -1;
  const renderSuggestions = () => {
    const q = classInput.value.trim();
    sugList.textContent = '';
    activeSug = -1;
    if (!q) { sugList.style.display = 'none'; return; }
    const matches = SUGGESTIONS.filter((s) => s.startsWith(q)).slice(0, 12);
    if (!matches.length) { sugList.style.display = 'none'; return; }
    matches.forEach((m) => {
      sugList.append(el('div', {
        'data-sug': m,
        style: 'padding:4px 8px;cursor:pointer;font-size:11px;',
        onmousedown: (e) => { e.preventDefault(); addClass(m); },
        onmouseenter: (e) => e.target.style.background = '#3f3f46',
        onmouseleave: (e) => e.target.style.background = '',
      }, m));
    });
    sugList.style.display = 'block';
  };

  const addClass = (cls) => {
    if (!cls) return;
    applyClassChange(() => state.selected.classList.add(cls));
    classInput.value = '';
    sugList.style.display = 'none';
    classInput.focus();
  };

  classInput.addEventListener('input', renderSuggestions);
  classInput.addEventListener('keydown', (e) => {
    const items = [...sugList.children];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      activeSug = e.key === 'ArrowDown'
        ? (activeSug + 1) % items.length
        : (activeSug - 1 + items.length) % items.length;
      items.forEach((it, i) => it.style.background = i === activeSug ? '#3f3f46' : '');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter takes the highlighted suggestion if any, else the raw typed text.
      addClass(activeSug >= 0 && items[activeSug]
        ? items[activeSug].dataset.sug
        : classInput.value.trim());
    } else if (e.key === 'Escape') {
      sugList.style.display = 'none';
      activeSug = -1;
    }
  });

  /* ----------------------------------------------------------------- diff */

  const renderDiff = () => {
    const blocks = [];
    for (const [target, { original }] of state.edits) {
      if (!target.isConnected) continue;
      const before = original.trim().split(/\s+/).filter(Boolean);
      const after = String(target.className).trim().split(/\s+/).filter(Boolean);
      const removed = before.filter((c) => !after.includes(c));
      const added = after.filter((c) => !before.includes(c));
      if (!removed.length && !added.length) continue;
      blocks.push([
        selectorPath(target),
        `  before: "${before.join(' ')}"`,
        `  after:  "${after.join(' ')}"`,
        `  diff:   ${[...removed.map((c) => `-${c}`), ...added.map((c) => `+${c}`)].join(' ')}`,
      ].join('\n'));
    }
    diffPanel.style.display = blocks.length ? 'block' : 'none';
    diffArea.value = blocks.length
      ? `DOM Tweaker edits (${blocks.length} element${blocks.length > 1 ? 's' : ''})\n\n${blocks.join('\n\n')}\n`
      : '';
  };
})();
