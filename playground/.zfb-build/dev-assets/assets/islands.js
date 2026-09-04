import {
  R,
  U,
  d,
  hr,
  k,
  re,
  u,
  y
} from "./islands-chunk-AL2HAPSI.js";
import {
  __export
} from "./islands-chunk-EDDP7NYW.js";

// ../../../node_modules/.pnpm/@takazudo+zfb@2.13.1/node_modules/@takazudo/zfb/dist/types.js
var WHEN_VALUES = ["visible", "idle", "load", "media"];
var DEFAULT_WHEN = "load";
function isWhen(value) {
  return typeof value === "string" && WHEN_VALUES.includes(value);
}
function resolveWhen(when) {
  if (when === void 0)
    return DEFAULT_WHEN;
  if (isWhen(when))
    return when;
  if (typeof process !== "undefined" && process.env && true) {
    console.warn(`[zfb] <Island when="${String(when)}"> is not a valid value. Expected "visible" | "idle" | "load" | "media". Falling back to "${DEFAULT_WHEN}".`);
  }
  return DEFAULT_WHEN;
}

// ../../../node_modules/.pnpm/@takazudo+zfb@2.13.1/node_modules/@takazudo/zfb/dist/runtime.js
var g = globalThis;
function scheduleHydrateInternal(target, when, fire) {
  const resolved = resolveWhen(when);
  if (resolved === "load") {
    fire();
    return { fired: true, cancel: noop };
  }
  if (resolved === "idle") {
    return { fired: false, cancel: scheduleIdle(fire) };
  }
  if (resolved === "media") {
    return scheduleMedia(target, fire);
  }
  return scheduleVisible(target, fire);
}
function noop() {
}
function oneShot(fn) {
  let fired = false;
  let cancelled = false;
  return {
    run() {
      if (cancelled || fired)
        return;
      fired = true;
      fn();
    },
    cancel() {
      if (fired)
        return true;
      cancelled = true;
      return false;
    }
  };
}
function scheduleIdle(fire) {
  const gate = oneShot(fire);
  if (typeof g.requestIdleCallback === "function") {
    const handle2 = g.requestIdleCallback(gate.run);
    return () => {
      const alreadyFired = gate.cancel();
      if (alreadyFired)
        return;
      if (typeof g.cancelIdleCallback === "function")
        g.cancelIdleCallback(handle2);
    };
  }
  const handle = setTimeout(gate.run, 0);
  return () => {
    const alreadyFired = gate.cancel();
    if (alreadyFired)
      return;
    clearTimeout(handle);
  };
}
function scheduleVisible(target, fire) {
  const Observer = g.IntersectionObserver;
  if (typeof Observer !== "function") {
    fire();
    return { fired: true, cancel: noop };
  }
  const gate = oneShot(fire);
  const observer = new Observer((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        obs.disconnect();
        gate.run();
        return;
      }
    }
  }, { threshold: 0 });
  observer.observe(target);
  return {
    fired: false,
    cancel: () => {
      const alreadyFired = gate.cancel();
      if (alreadyFired)
        return;
      observer.disconnect();
    }
  };
}
function scheduleMedia(target, fire) {
  const query = target.getAttribute("data-media");
  if (typeof g.matchMedia !== "function" || !query) {
    fire();
    return { fired: true, cancel: noop };
  }
  const mql = g.matchMedia(query);
  if (mql.matches) {
    fire();
    return { fired: true, cancel: noop };
  }
  const gate = oneShot(fire);
  let removeListener = noop;
  const handler = (e) => {
    if (!e.matches)
      return;
    removeListener();
    gate.run();
  };
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler);
    removeListener = () => mql.removeEventListener("change", handler);
  } else if (typeof mql.addListener === "function") {
    mql.addListener(handler);
    removeListener = () => mql.removeListener(handler);
  } else {
    fire();
    return { fired: true, cancel: noop };
  }
  return {
    fired: false,
    cancel: () => {
      const alreadyFired = gate.cancel();
      if (alreadyFired)
        return;
      removeListener();
    }
  };
}
var ISLAND_REMOUNT_ATTR = "data-zfb-island-remount";
var ISLAND_MOUNTED_ATTR = "data-zfb-island-mounted";
var mounted = /* @__PURE__ */ new WeakMap();
var warnedNested = /* @__PURE__ */ new WeakSet();
var pending = /* @__PURE__ */ new WeakSet();
var capturedManifest = null;
var pendingCancels = /* @__PURE__ */ new Map();
function mountIslands(manifest) {
  if (typeof document === "undefined")
    return;
  capturedManifest = manifest;
  const ssrIslands = document.querySelectorAll("[data-zfb-island]");
  for (const el of Array.from(ssrIslands)) {
    stripStaleMountedMarker(el);
    const name = el.getAttribute("data-zfb-island");
    if (!name)
      continue;
    warnIfNestedIsland(el, name);
    scheduleMount(manifest, el, name, "hydrate");
  }
  const skipSsrIslands = document.querySelectorAll("[data-zfb-island-skip-ssr]");
  for (const el of Array.from(skipSsrIslands)) {
    stripStaleMountedMarker(el);
    const name = el.getAttribute("data-zfb-island-skip-ssr");
    if (!name)
      continue;
    warnIfNestedIsland(el, name);
    scheduleMount(manifest, el, name, "render");
  }
}
function stripStaleMountedMarker(el) {
  if (!mounted.has(el))
    el.removeAttribute(ISLAND_MOUNTED_ATTR);
}
function warnIfNestedIsland(el, componentName) {
  if (typeof process === "undefined" || !process.env || false) {
    return;
  }
  if (warnedNested.has(el))
    return;
  const parent = el.parentElement;
  if (!parent || typeof parent.closest !== "function")
    return;
  const ancestor = parent.closest("[data-zfb-island],[data-zfb-island-skip-ssr]");
  if (!ancestor)
    return;
  warnedNested.add(el);
  console.warn(`[zfb] Island "${componentName}" is nested inside another island marker. Self-wrapping an island mis-hydrates: the outer framework instance owns the inner DOM, causing a conflicting mount. Fix: author "${componentName}" bare (remove <Island> from its own render output) and apply <Island when="..."> at the call site instead.`);
}
function scheduleMount(manifest, element, componentName, mode, options = {}) {
  if (mounted.has(element) || pending.has(element))
    return;
  const entry = manifest[componentName];
  if (entry == null) {
    if (typeof process !== "undefined" && process.env && true) {
      console.warn(`[zfb] no island manifest entry for component "${componentName}" \u2014 the runtime manifest is out of sync with the rendered HTML.`);
    }
    return;
  }
  const when = element.getAttribute("data-when") ?? void 0;
  if (typeof entry !== "string") {
    fireInlineMount(element, entry, mode, options);
    return;
  }
  const url = entry;
  const fire = () => {
    if (mounted.has(element) || pending.has(element))
      return;
    pendingCancels.delete(element);
    const props = readProps(element);
    pending.add(element);
    let started;
    try {
      started = importIsland(url);
    } catch (err) {
      pending.delete(element);
      console.error(`[zfb] failed to start dynamic import for ${url}`, err);
      return;
    }
    started.then((mod) => {
      const fn = mod.mount ?? mod.default;
      if (typeof fn !== "function") {
        pending.delete(element);
        if (typeof process !== "undefined" && process.env && true) {
          console.warn(`[zfb] island bundle at ${url} did not export mount() or default()`);
        }
        return;
      }
      if (!element.isConnected) {
        pending.delete(element);
        return;
      }
      const shouldRefreshProps = element.hasAttribute(ISLAND_REMOUNT_ATTR);
      const propsForMount = shouldRefreshProps ? readProps(element) : props;
      if (shouldRefreshProps)
        element.removeAttribute(ISLAND_REMOUNT_ATTR);
      const unmountThunk = mod.unmount ? () => mod.unmount(element) : () => {
      };
      try {
        fn(propsForMount, element, mode);
        mounted.set(element, unmountThunk);
        element.setAttribute(ISLAND_MOUNTED_ATTR, "");
      } finally {
        pending.delete(element);
      }
    }, (err) => {
      pending.delete(element);
      mounted.delete(element);
      console.error(`[zfb] failed to load island bundle ${url}`, err);
    });
  };
  if (mode === "render") {
    fire();
    return;
  }
  if (options.force) {
    fire();
    return;
  }
  const { fired, cancel } = scheduleHydrateInternal(element, when, fire);
  if (when && when !== "load" && !fired) {
    pendingCancels.set(element, cancel);
  }
}
function fireInlineMount(element, mod, mode, options = {}) {
  const fn = mod.mount ?? mod.default;
  if (typeof fn !== "function") {
    if (typeof process !== "undefined" && process.env && true) {
      console.warn("[zfb] inline island manifest entry did not export mount() or default()");
    }
    return;
  }
  const fire = () => {
    if (mounted.has(element))
      return;
    pendingCancels.delete(element);
    if (!element.isConnected)
      return;
    const props = readProps(element);
    const unmountThunk = mod.unmount ? () => mod.unmount(element) : () => {
    };
    fn(props, element, mode);
    mounted.set(element, unmountThunk);
    element.setAttribute(ISLAND_MOUNTED_ATTR, "");
  };
  if (mode === "render") {
    fire();
    return;
  }
  if (options.force) {
    fire();
    return;
  }
  const when = element.getAttribute("data-when") ?? void 0;
  const { fired, cancel } = scheduleHydrateInternal(element, when, fire);
  if (when && when !== "load" && !fired) {
    pendingCancels.set(element, cancel);
  }
}
function readProps(element) {
  const raw = element.getAttribute("data-props");
  if (!raw)
    return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
  }
  return {};
}
var importImpl = (url) => (
  // Modern bundlers (esbuild, Vite, Rollup, webpack) preserve a plain
  // `import(<dynamic>)` call when the argument isn't a static literal,
  // so we no longer need the `new Function(...)` indirection — which
  // also failed under strict CSPs that disallow `unsafe-eval`.
  import(
    /* @vite-ignore */
    /* webpackIgnore: true */
    url
  )
);
function importIsland(url) {
  return importImpl(url);
}

// components/playground-controls.tsx
var playground_controls_exports = {};
__export(playground_controls_exports, {
  default: () => PlaygroundControls
});

// ../packages/zdtp/package.json
var package_default = {
  name: "@takazudo/zdtp",
  version: "0.4.14",
  description: "Dynamic design-token tweak panel \u2014 host-config-driven, framework-agnostic Preact UI.",
  private: false,
  license: "MIT",
  type: "module",
  author: "Takeshi Takatsudo <takazudo@gmail.com> (https://github.com/Takazudo)",
  keywords: [
    "design-tokens",
    "design-token",
    "design-system",
    "theming",
    "tweak-panel",
    "preact",
    "react",
    "css-variables",
    "framework-agnostic"
  ],
  publishConfig: {
    access: "public"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/Takazudo/zudo-design-token-panel.git",
    directory: "packages/zdtp"
  },
  homepage: "https://zudo-design-token-panel.takazudomodular.com/",
  bugs: {
    url: "https://github.com/Takazudo/zudo-design-token-panel/issues"
  },
  main: "./dist/index.js",
  types: "./dist/index.d.ts",
  bin: {
    "zdtp-server": "./dist/bin/server.js"
  },
  sideEffects: [
    "**/*.css",
    "./dist/astro/host-adapter.js",
    "**/host-adapter.js"
  ],
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.js"
    },
    "./astro": {
      types: "./dist/astro/index.d.ts",
      import: "./dist/astro/index.js",
      default: "./dist/astro/index.js"
    },
    "./astro/host-adapter": {
      types: "./dist/astro/host-adapter.d.ts",
      import: "./dist/astro/host-adapter.js",
      default: "./dist/astro/host-adapter.js"
    },
    "./astro/DesignTokenPanelHost.astro": "./dist/astro/DesignTokenPanelHost.astro",
    "./server": {
      types: "./dist/server/index.d.ts",
      import: "./dist/server/index.js",
      default: "./dist/server/index.js"
    },
    "./testing": {
      types: "./dist/testing.d.ts",
      import: "./dist/testing.js",
      default: "./dist/testing.js"
    },
    "./styles": "./dist/zdtp.css",
    "./styles.css": "./dist/zdtp.css",
    "./package.json": "./package.json"
  },
  files: [
    "dist",
    "README.md",
    "PORTABLE-CONTRACT.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  engines: {
    node: ">=22.0.0",
    pnpm: ">=10.0.0"
  },
  scripts: {
    build: "vite build && tsc -p tsconfig.build.json && node scripts/copy-astro-assets.mjs && chmod +x dist/bin/server.js && node scripts/check-exports.mjs",
    "// prepublishOnly": "build-only gate. The full test suite needs Playwright Chromium (browser tests) and is run upstream in ci.yml on every PR and main push, not at publish time.",
    prepublishOnly: "pnpm build",
    test: "vitest run",
    "test:unit": "vitest run --project node",
    "test:browser": "vitest run --project browser",
    "test:unit:watch": "vitest --project node",
    "test:watch": "vitest",
    "test:vrt": "playwright test",
    "test:vrt:update": "playwright test --update-snapshots",
    typecheck: "tsc --noEmit",
    lint: "oxlint src"
  },
  peerDependencies: {
    preact: "^10.29.1"
  },
  dependencies: {
    "@tailwindcss/browser": "4.3.2",
    culori: "^4.0.2",
    "tailwind-merge": "3.6.0"
  },
  devDependencies: {
    "@playwright/test": "^1.60.0",
    "@types/culori": "^4.0.1",
    "@types/node": "^22.0.0",
    "@vitest/browser-playwright": "4.1.8",
    jsdom: "^25.0.0",
    playwright: "^1.60.0",
    preact: "^10.29.1",
    typescript: "^5.6.0",
    vite: "^7.3.5",
    vitest: "^4.1.8",
    oxlint: "^1.0.0"
  }
};

// config/default-manifest.ts
var length = (id, cssVar, label, defaultValue, step = 0.0625, unit = "rem") => ({
  id,
  cssVar,
  label,
  default: defaultValue,
  type: { kind: "length", step, unit }
});
var text = (id, cssVar, label, defaultValue) => ({
  id,
  cssVar,
  label,
  default: defaultValue,
  type: { kind: "text" }
});
var color = (index, value) => ({
  id: `zfb-palette-${index}`,
  cssVar: `--zfb-palette-${index}`,
  label: `Palette ${index}`,
  default: value,
  type: { kind: "color" }
});
var palette = [
  "#f8fafc",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0f172a",
  "#0891b2",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#e2e8f0",
  "#f1f5f9",
  "#fef3c7",
  "#bbf7d0",
  "#ffffff"
];
var lightColorScheme = {
  background: 0,
  foreground: 6,
  cursor: 4,
  selectionBg: 1,
  selectionFg: 15,
  palette,
  shikiTheme: "github-light"
};
var darkPalette = [
  "#0f172a",
  "#60a5fa",
  "#4ade80",
  "#fbbf24",
  "#a78bfa",
  "#f87171",
  "#f8fafc",
  "#22d3ee",
  "#94a3b8",
  "#64748b",
  "#475569",
  "#334155",
  "#1e293b",
  "#78350f",
  "#14532d",
  "#020617"
];
var darkColorScheme = {
  background: 0,
  foreground: 6,
  cursor: 4,
  selectionBg: 1,
  selectionFg: 15,
  palette: darkPalette,
  shikiTheme: "github-dark"
};
var defaultTabs = [
  {
    id: "spacing",
    label: "Spacing",
    tiers: [
      {
        id: "hsp-scale",
        label: "Horizontal spacing",
        items: [
          length("zfb-hsp-xs", "--zfb-hsp-xs", "H-Spacing XS", "0.25rem"),
          length("zfb-hsp-sm", "--zfb-hsp-sm", "H-Spacing S", "0.5rem"),
          length("zfb-hsp-md", "--zfb-hsp-md", "H-Spacing M", "1rem"),
          length("zfb-hsp-lg", "--zfb-hsp-lg", "H-Spacing L", "1.5rem"),
          length("zfb-hsp-xl", "--zfb-hsp-xl", "H-Spacing XL", "2rem", 0.125)
        ]
      },
      {
        id: "vsp-scale",
        label: "Vertical spacing",
        items: [
          length("zfb-vsp-2xs", "--zfb-vsp-2xs", "V-Spacing 2XS", "0.25rem"),
          length("zfb-vsp-xs", "--zfb-vsp-xs", "V-Spacing XS", "0.5rem"),
          length("zfb-vsp-sm", "--zfb-vsp-sm", "V-Spacing S", "0.75rem"),
          length("zfb-vsp-md", "--zfb-vsp-md", "V-Spacing M", "1rem"),
          length("zfb-vsp-lg", "--zfb-vsp-lg", "V-Spacing L", "1.75rem"),
          length("zfb-vsp-xl", "--zfb-vsp-xl", "V-Spacing XL", "2.5rem", 0.125),
          length("zfb-vsp-2xl", "--zfb-vsp-2xl", "V-Spacing 2XL", "3.5rem", 0.25)
        ]
      }
    ]
  },
  {
    id: "font",
    label: "Font",
    tiers: [
      {
        id: "font-scale",
        label: "Font scale",
        items: [
          length("zfb-scale-xs", "--zfb-scale-xs", "Scale XS", "0.75rem"),
          length("zfb-scale-sm", "--zfb-scale-sm", "Scale SM", "0.875rem"),
          length("zfb-scale-base", "--zfb-scale-base", "Scale Base", "1rem"),
          length("zfb-scale-md", "--zfb-scale-md", "Scale MD", "1.125rem"),
          length("zfb-scale-lg", "--zfb-scale-lg", "Scale LG", "1.25rem"),
          length("zfb-scale-xl", "--zfb-scale-xl", "Scale XL", "1.75rem"),
          length("zfb-scale-2xl", "--zfb-scale-2xl", "Scale 2XL", "2.5rem")
        ]
      },
      {
        id: "font-role",
        label: "Font role",
        referencesTier: "font-scale",
        items: [
          text("zfb-text-page-title", "--zfb-text-page-title", "Page title", "zfb-scale-xl"),
          text("zfb-text-section-title", "--zfb-text-section-title", "Section title", "zfb-scale-lg"),
          text("zfb-text-subsection-title", "--zfb-text-subsection-title", "Subsection title", "zfb-scale-md"),
          text("zfb-text-body", "--zfb-text-body", "Body", "zfb-scale-base"),
          text("zfb-text-helper", "--zfb-text-helper", "Helper", "zfb-scale-sm"),
          text("zfb-text-annotation", "--zfb-text-annotation", "Annotation", "zfb-scale-xs")
        ]
      },
      {
        id: "line-height",
        label: "Line height",
        items: [
          { id: "zfb-leading-tight", cssVar: "--zfb-leading-tight", label: "Tight", default: "1.2", type: { kind: "number", step: 0.05 } },
          { id: "zfb-leading-body", cssVar: "--zfb-leading-body", label: "Body", default: "1.6", type: { kind: "number", step: 0.05 } },
          { id: "zfb-leading-relaxed", cssVar: "--zfb-leading-relaxed", label: "Relaxed", default: "1.8", type: { kind: "number", step: 0.05 } }
        ]
      },
      {
        id: "font-weight",
        label: "Font weight",
        items: [
          { id: "zfb-weight-body", cssVar: "--zfb-weight-body", label: "Body", default: "400", type: { kind: "select", options: ["300", "400", "500", "600", "700"] } },
          { id: "zfb-weight-heading", cssVar: "--zfb-weight-heading", label: "Heading", default: "700", type: { kind: "select", options: ["400", "500", "600", "700", "800"] } }
        ]
      },
      {
        id: "font-family",
        label: "Font family",
        items: [
          text("zfb-font-sans", "--zfb-font-sans", "Sans", "system-ui, sans-serif"),
          text("zfb-font-mono", "--zfb-font-mono", "Mono", "ui-monospace, monospace")
        ]
      }
    ]
  },
  {
    id: "size",
    label: "Size",
    tiers: [
      {
        id: "radius",
        label: "Radius",
        items: [
          length("zfb-radius-sm", "--zfb-radius-sm", "Small", "0.25rem"),
          length("zfb-radius-md", "--zfb-radius-md", "Medium", "0.5rem"),
          length("zfb-radius-lg", "--zfb-radius-lg", "Large", "1rem")
        ]
      },
      {
        id: "transition",
        label: "Transition",
        items: [
          length("zfb-transition-fast", "--zfb-transition-fast", "Fast", "120ms", 10, "ms"),
          length("zfb-transition-normal", "--zfb-transition-normal", "Normal", "220ms", 10, "ms")
        ]
      }
    ]
  },
  {
    id: "color",
    label: "Color",
    colorExtras: {
      id: "zfb-playground",
      label: "zfb playground",
      baseRoles: { background: "--zfb-bg", foreground: "--zfb-fg" },
      baseDefaults: { background: 0, foreground: 6 },
      defaultShikiTheme: "github-light",
      colorSchemes: { Light: lightColorScheme, Dark: darkColorScheme },
      panelSettings: {
        colorScheme: "Light",
        colorMode: { defaultMode: "light", lightScheme: "Light", darkScheme: "Dark" }
      }
    },
    tiers: [
      {
        id: "palette",
        label: "Palette",
        items: palette.map((value, index) => color(index, value))
      },
      {
        id: "semantic",
        label: "Semantic",
        referencesTier: "palette",
        items: [
          { ...color(1, palette[1]), id: "primary", cssVar: "--zfb-color-primary", label: "Primary", default: "zfb-palette-1" },
          { ...color(3, palette[3]), id: "accent", cssVar: "--zfb-color-accent", label: "Accent", default: "zfb-palette-3" },
          { ...color(15, palette[15]), id: "surface", cssVar: "--zfb-color-surface", label: "Surface", default: "zfb-palette-15" },
          { ...color(8, palette[8]), id: "muted", cssVar: "--zfb-color-muted", label: "Muted", default: "zfb-palette-8" },
          { ...color(2, palette[2]), id: "success", cssVar: "--zfb-color-success", label: "Success", default: "zfb-palette-2" },
          { ...color(5, palette[5]), id: "danger", cssVar: "--zfb-color-danger", label: "Danger", default: "zfb-palette-5" }
        ]
      }
    ]
  },
  {
    id: "easing",
    label: "Easing",
    tiers: [
      {
        id: "easing",
        label: "Easing",
        items: [
          text("zfb-easing-standard", "--zfb-easing-standard", "Standard", "cubic-bezier(0.2, 0, 0, 1)"),
          text("zfb-easing-linear", "--zfb-easing-linear", "Linear", "linear")
        ]
      }
    ]
  },
  {
    id: "notes",
    label: "Notes",
    tiers: [],
    notesExtras: {
      title: "Playground manifest",
      html: "<p>This consumer uses the unpublished workspace panel. Choose the vendored zudo-doc manifest with <code>?manifest=zudo-doc</code>.</p>"
    }
  }
];

// config/panel-config.ts
var panelConfig = {
  storagePrefix: "zfb-playground-tokens",
  consoleNamespace: "zfb",
  modalClassPrefix: "zfb-playground-design-token-panel-modal",
  schemaId: "zfb-playground-design-tokens/v1",
  exportFilenameBase: "zfb-playground-design-tokens",
  tabs: defaultTabs,
  applyEndpoint: "/api/dev/apply",
  applyRouting: { zfb: "styles/global.css" }
};

// config/zudo-doc-manifest.generated.ts
var ZUDO_DOC_SOURCE_VERSION = "5.13.1";
var zudoDocConfigs = {
  "light": {
    "storagePrefix": "zudo-doc-tweak",
    "consoleNamespace": "zudoDoc",
    "modalClassPrefix": "zudo-doc-design-token-panel-modal",
    "schemaId": "zudo-design-tokens/v3",
    "exportFilenameBase": "zudo-doc-design-tokens",
    "tabs": [
      {
        "id": "palette",
        "label": "Palette",
        "tiers": [
          {
            "id": "base",
            "label": "Base",
            "items": [
              {
                "id": "base-0",
                "cssVar": "--palette-base-0",
                "label": "0",
                "default": "oklch(.965 .004 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-1",
                "cssVar": "--palette-base-1",
                "label": "1",
                "default": "oklch(.705 .008 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-2",
                "cssVar": "--palette-base-2",
                "label": "2",
                "default": "oklch(.480 .008 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-3",
                "cssVar": "--palette-base-3",
                "label": "3",
                "default": "oklch(.300 .006 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-4",
                "cssVar": "--palette-base-4",
                "label": "4",
                "default": "oklch(.185 .005 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          },
          {
            "id": "accent",
            "label": "Accent",
            "items": [
              {
                "id": "accent-0",
                "cssVar": "--palette-accent-0",
                "label": "0",
                "default": "oklch(.755 .130 64)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accent-1",
                "cssVar": "--palette-accent-1",
                "label": "1",
                "default": "oklch(.700 .158 62)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accent-2",
                "cssVar": "--palette-accent-2",
                "label": "2",
                "default": "oklch(.470 .120 56)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          },
          {
            "id": "state",
            "label": "State",
            "items": [
              {
                "id": "state-danger",
                "cssVar": "--palette-state-danger",
                "label": "danger",
                "default": "oklch(.640 .170 25)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "state-success",
                "cssVar": "--palette-state-success",
                "label": "success",
                "default": "oklch(.680 .145 145)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "state-warning",
                "cssVar": "--palette-state-warning",
                "label": "warning",
                "default": "oklch(.760 .135 82)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "state-info",
                "cssVar": "--palette-state-info",
                "label": "info",
                "default": "oklch(.680 .130 245)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "color",
        "label": "Color",
        "tiers": [
          {
            "id": "semantic",
            "label": "Semantic",
            "semantic": true,
            "referencesRamps": [
              {
                "tab": "palette",
                "tier": "base"
              },
              {
                "tab": "palette",
                "tier": "accent"
              },
              {
                "tab": "palette",
                "tier": "state"
              }
            ],
            "items": [
              {
                "id": "bg",
                "cssVar": "--zd-bg",
                "label": "bg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "fg",
                "cssVar": "--zd-fg",
                "label": "fg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "selection-bg",
                "cssVar": "--zd-selection-bg",
                "label": "selection-bg",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "selection-fg",
                "cssVar": "--zd-selection-fg",
                "label": "selection-fg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "surface",
                "cssVar": "--zd-surface",
                "label": "surface",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "muted",
                "cssVar": "--zd-muted",
                "label": "muted",
                "default": "base:base-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accent",
                "cssVar": "--zd-accent",
                "label": "accent",
                "default": "accent:accent-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accentHover",
                "cssVar": "--zd-accent-hover",
                "label": "accentHover",
                "default": "oklch(.400 .096 56)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "codeBg",
                "cssVar": "--zd-code-bg",
                "label": "codeBg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "codeFg",
                "cssVar": "--zd-code-fg",
                "label": "codeFg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "success",
                "cssVar": "--zd-success",
                "label": "success",
                "default": "oklch(.470 .140 145)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "danger",
                "cssVar": "--zd-danger",
                "label": "danger",
                "default": "oklch(.505 .170 25)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "warning",
                "cssVar": "--zd-warning",
                "label": "warning",
                "default": "oklch(.490 .100 82)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "info",
                "cssVar": "--zd-info",
                "label": "info",
                "default": "oklch(.485 .122 245)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidNodeBg",
                "cssVar": "--zd-mermaid-node-bg",
                "label": "mermaidNodeBg",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidText",
                "cssVar": "--zd-mermaid-text",
                "label": "mermaidText",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidLine",
                "cssVar": "--zd-mermaid-line",
                "label": "mermaidLine",
                "default": "base:base-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidLabelBg",
                "cssVar": "--zd-mermaid-label-bg",
                "label": "mermaidLabelBg",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidNoteBg",
                "cssVar": "--zd-mermaid-note-bg",
                "label": "mermaidNoteBg",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatUserBg",
                "cssVar": "--zd-chat-user-bg",
                "label": "chatUserBg",
                "default": "accent:accent-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatUserText",
                "cssVar": "--zd-chat-user-text",
                "label": "chatUserText",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatAssistantBg",
                "cssVar": "--zd-chat-assistant-bg",
                "label": "chatAssistantBg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatAssistantText",
                "cssVar": "--zd-chat-assistant-text",
                "label": "chatAssistantText",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "imageOverlayBg",
                "cssVar": "--zd-image-overlay-bg",
                "label": "imageOverlayBg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "imageOverlayFg",
                "cssVar": "--zd-image-overlay-fg",
                "label": "imageOverlayFg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "matchedKeywordBg",
                "cssVar": "--zd-matched-keyword-bg",
                "label": "matchedKeywordBg",
                "default": "oklch(.700 .158 62)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "matchedKeywordFg",
                "cssVar": "--zd-matched-keyword-fg",
                "label": "matchedKeywordFg",
                "default": "oklch(.300 .003 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxComment",
                "cssVar": "--zd-syntax-comment",
                "label": "syntaxComment",
                "default": "base:base-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxString",
                "cssVar": "--zd-syntax-string",
                "label": "syntaxString",
                "default": "oklch(.470 .140 145)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxNumber",
                "cssVar": "--zd-syntax-number",
                "label": "syntaxNumber",
                "default": "oklch(.490 .100 82)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxKeyword",
                "cssVar": "--zd-syntax-keyword",
                "label": "syntaxKeyword",
                "default": "accent:accent-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxCallable",
                "cssVar": "--zd-syntax-callable",
                "label": "syntaxCallable",
                "default": "oklch(.485 .122 245)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxType",
                "cssVar": "--zd-syntax-type",
                "label": "syntaxType",
                "default": "oklch(.490 .100 82)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxName",
                "cssVar": "--zd-syntax-name",
                "label": "syntaxName",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxInserted",
                "cssVar": "--zd-syntax-inserted",
                "label": "syntaxInserted",
                "default": "oklch(.460 .140 145)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxDeleted",
                "cssVar": "--zd-syntax-deleted",
                "label": "syntaxDeleted",
                "default": "oklch(.490 .170 25)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          }
        ],
        "colorExtras": {
          "id": "zudo-doc",
          "label": "Zudo Doc",
          "baseRoles": {},
          "baseDefaults": {},
          "defaultShikiTheme": "github-dark",
          "colorSchemes": {},
          "panelSettings": {
            "colorScheme": "Default Light",
            "colorMode": {
              "defaultMode": "light",
              "lightScheme": "Default Light",
              "darkScheme": "Default Dark"
            }
          }
        }
      },
      {
        "id": "font",
        "label": "Font",
        "tiers": [
          {
            "id": "font-scale",
            "label": "Scale",
            "items": [
              {
                "id": "text-scale-2xs",
                "cssVar": "--text-scale-2xs",
                "label": "text-scale-2xs",
                "default": "0.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-xs",
                "cssVar": "--text-scale-xs",
                "label": "text-scale-xs",
                "default": "0.875rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-sm",
                "cssVar": "--text-scale-sm",
                "label": "text-scale-sm",
                "default": "1rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-md",
                "cssVar": "--text-scale-md",
                "label": "text-scale-md",
                "default": "1.2rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-lg",
                "cssVar": "--text-scale-lg",
                "label": "text-scale-lg",
                "default": "1.4rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-xl",
                "cssVar": "--text-scale-xl",
                "label": "text-scale-xl",
                "default": "3rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-2xl",
                "cssVar": "--text-scale-2xl",
                "label": "text-scale-2xl",
                "default": "3.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "font-size",
            "label": "Font size",
            "items": [
              {
                "id": "text-micro",
                "cssVar": "--text-micro",
                "label": "text-micro",
                "default": "text-scale-2xs",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-caption",
                "cssVar": "--text-caption",
                "label": "text-caption",
                "default": "text-scale-xs",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-small",
                "cssVar": "--text-small",
                "label": "text-small",
                "default": "text-scale-sm",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-body",
                "cssVar": "--text-body",
                "label": "text-body",
                "default": "text-scale-md",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-title",
                "cssVar": "--text-title",
                "label": "text-title",
                "default": "text-scale-lg",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-heading",
                "cssVar": "--text-heading",
                "label": "text-heading",
                "default": "text-scale-xl",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-display",
                "cssVar": "--text-display",
                "label": "text-display",
                "default": "text-scale-2xl",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              }
            ],
            "referencesTier": "font-scale"
          },
          {
            "id": "line-height",
            "label": "Line height",
            "items": [
              {
                "id": "leading-tight",
                "cssVar": "--leading-tight",
                "label": "leading-tight",
                "default": "1.25",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              },
              {
                "id": "leading-snug",
                "cssVar": "--leading-snug",
                "label": "leading-snug",
                "default": "1.375",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              },
              {
                "id": "leading-normal",
                "cssVar": "--leading-normal",
                "label": "leading-normal",
                "default": "1.5",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              },
              {
                "id": "leading-relaxed",
                "cssVar": "--leading-relaxed",
                "label": "leading-relaxed",
                "default": "1.625",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              }
            ]
          },
          {
            "id": "font-weight",
            "label": "Font weight",
            "items": [
              {
                "id": "font-weight-normal",
                "cssVar": "--font-weight-normal",
                "label": "font-weight-normal",
                "default": "400",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              },
              {
                "id": "font-weight-medium",
                "cssVar": "--font-weight-medium",
                "label": "font-weight-medium",
                "default": "500",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              },
              {
                "id": "font-weight-semibold",
                "cssVar": "--font-weight-semibold",
                "label": "font-weight-semibold",
                "default": "600",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              },
              {
                "id": "font-weight-bold",
                "cssVar": "--font-weight-bold",
                "label": "font-weight-bold",
                "default": "700",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              }
            ]
          },
          {
            "id": "font-family",
            "label": "Font family",
            "items": [
              {
                "id": "font-sans",
                "cssVar": "--font-sans",
                "label": "font-sans",
                "default": "system-ui, sans-serif",
                "type": {
                  "kind": "text"
                }
              },
              {
                "id": "font-mono",
                "cssVar": "--font-mono",
                "label": "font-mono",
                "default": "ui-monospace, monospace",
                "type": {
                  "kind": "text"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "spacing",
        "label": "Spacing",
        "tiers": [
          {
            "id": "hsp",
            "label": "Horizontal spacing",
            "items": [
              {
                "id": "hsp-2xs",
                "cssVar": "--spacing-hsp-2xs",
                "label": "hsp-2xs",
                "default": "0.125rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-xs",
                "cssVar": "--spacing-hsp-xs",
                "label": "hsp-xs",
                "default": "0.375rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-sm",
                "cssVar": "--spacing-hsp-sm",
                "label": "hsp-sm",
                "default": "0.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-md",
                "cssVar": "--spacing-hsp-md",
                "label": "hsp-md",
                "default": "0.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-lg",
                "cssVar": "--spacing-hsp-lg",
                "label": "hsp-lg",
                "default": "1rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-xl",
                "cssVar": "--spacing-hsp-xl",
                "label": "hsp-xl",
                "default": "1.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-2xl",
                "cssVar": "--spacing-hsp-2xl",
                "label": "hsp-2xl",
                "default": "2rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "vsp",
            "label": "Vertical spacing",
            "items": [
              {
                "id": "vsp-3xs",
                "cssVar": "--spacing-vsp-3xs",
                "label": "vsp-3xs",
                "default": "0.25rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-2xs",
                "cssVar": "--spacing-vsp-2xs",
                "label": "vsp-2xs",
                "default": "0.4375rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-xs",
                "cssVar": "--spacing-vsp-xs",
                "label": "vsp-xs",
                "default": "0.875rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-sm",
                "cssVar": "--spacing-vsp-sm",
                "label": "vsp-sm",
                "default": "1.25rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-md",
                "cssVar": "--spacing-vsp-md",
                "label": "vsp-md",
                "default": "1.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-lg",
                "cssVar": "--spacing-vsp-lg",
                "label": "vsp-lg",
                "default": "1.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-xl",
                "cssVar": "--spacing-vsp-xl",
                "label": "vsp-xl",
                "default": "2.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-2xl",
                "cssVar": "--spacing-vsp-2xl",
                "label": "vsp-2xl",
                "default": "3.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "icon",
            "label": "Icons",
            "items": [
              {
                "id": "icon-xs",
                "cssVar": "--spacing-icon-xs",
                "label": "icon-xs",
                "default": "0.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "icon-sm",
                "cssVar": "--spacing-icon-sm",
                "label": "icon-sm",
                "default": "1rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "icon-md",
                "cssVar": "--spacing-icon-md",
                "label": "icon-md",
                "default": "1.25rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "icon-lg",
                "cssVar": "--spacing-icon-lg",
                "label": "icon-lg",
                "default": "1.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "layout",
            "label": "Layout",
            "items": [
              {
                "id": "image-overlay-inset",
                "cssVar": "--spacing-image-overlay-inset",
                "label": "image-overlay-inset",
                "default": "0.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "spacing-0",
                "cssVar": "--spacing-0",
                "label": "spacing-0",
                "default": "0",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": ""
                },
                "readonly": true
              },
              {
                "id": "spacing-px",
                "cssVar": "--spacing-px",
                "label": "spacing-px",
                "default": "1px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                },
                "readonly": true
              },
              {
                "id": "sidebar-w",
                "cssVar": "--zd-sidebar-w",
                "label": "sidebar-w",
                "default": "clamp(14rem, 20vw, 22rem)",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": ""
                },
                "readonly": true
              }
            ]
          }
        ]
      },
      {
        "id": "size",
        "label": "Size",
        "tiers": [
          {
            "id": "radius",
            "label": "Radius",
            "items": [
              {
                "id": "radius-DEFAULT",
                "cssVar": "--radius-DEFAULT",
                "label": "radius-DEFAULT",
                "default": "4px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                }
              },
              {
                "id": "radius-lg",
                "cssVar": "--radius-lg",
                "label": "radius-lg",
                "default": "8px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                }
              },
              {
                "id": "radius-full",
                "cssVar": "--radius-full",
                "label": "radius-full",
                "default": "9999px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                },
                "pill": {
                  "value": "9999px",
                  "customDefault": "16px"
                }
              }
            ]
          },
          {
            "id": "transition",
            "label": "Transition",
            "items": [
              {
                "id": "default-transition-duration",
                "cssVar": "--default-transition-duration",
                "label": "default-transition-duration",
                "default": "150ms",
                "type": {
                  "kind": "length",
                  "step": 10,
                  "unit": "ms"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "dark": {
    "storagePrefix": "zudo-doc-tweak",
    "consoleNamespace": "zudoDoc",
    "modalClassPrefix": "zudo-doc-design-token-panel-modal",
    "schemaId": "zudo-design-tokens/v3",
    "exportFilenameBase": "zudo-doc-design-tokens",
    "tabs": [
      {
        "id": "palette",
        "label": "Palette",
        "tiers": [
          {
            "id": "base",
            "label": "Base",
            "items": [
              {
                "id": "base-0",
                "cssVar": "--palette-base-0",
                "label": "0",
                "default": "oklch(.965 .004 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-1",
                "cssVar": "--palette-base-1",
                "label": "1",
                "default": "oklch(.705 .008 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-2",
                "cssVar": "--palette-base-2",
                "label": "2",
                "default": "oklch(.480 .008 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-3",
                "cssVar": "--palette-base-3",
                "label": "3",
                "default": "oklch(.300 .006 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "base-4",
                "cssVar": "--palette-base-4",
                "label": "4",
                "default": "oklch(.185 .005 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          },
          {
            "id": "accent",
            "label": "Accent",
            "items": [
              {
                "id": "accent-0",
                "cssVar": "--palette-accent-0",
                "label": "0",
                "default": "oklch(.755 .130 64)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accent-1",
                "cssVar": "--palette-accent-1",
                "label": "1",
                "default": "oklch(.700 .158 62)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accent-2",
                "cssVar": "--palette-accent-2",
                "label": "2",
                "default": "oklch(.470 .120 56)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          },
          {
            "id": "state",
            "label": "State",
            "items": [
              {
                "id": "state-danger",
                "cssVar": "--palette-state-danger",
                "label": "danger",
                "default": "oklch(.640 .170 25)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "state-success",
                "cssVar": "--palette-state-success",
                "label": "success",
                "default": "oklch(.680 .145 145)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "state-warning",
                "cssVar": "--palette-state-warning",
                "label": "warning",
                "default": "oklch(.760 .135 82)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "state-info",
                "cssVar": "--palette-state-info",
                "label": "info",
                "default": "oklch(.680 .130 245)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "color",
        "label": "Color",
        "tiers": [
          {
            "id": "semantic",
            "label": "Semantic",
            "semantic": true,
            "referencesRamps": [
              {
                "tab": "palette",
                "tier": "base"
              },
              {
                "tab": "palette",
                "tier": "accent"
              },
              {
                "tab": "palette",
                "tier": "state"
              }
            ],
            "items": [
              {
                "id": "bg",
                "cssVar": "--zd-bg",
                "label": "bg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "fg",
                "cssVar": "--zd-fg",
                "label": "fg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "selection-bg",
                "cssVar": "--zd-selection-bg",
                "label": "selection-bg",
                "default": "base:base-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "selection-fg",
                "cssVar": "--zd-selection-fg",
                "label": "selection-fg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "surface",
                "cssVar": "--zd-surface",
                "label": "surface",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "muted",
                "cssVar": "--zd-muted",
                "label": "muted",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accent",
                "cssVar": "--zd-accent",
                "label": "accent",
                "default": "accent:accent-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "accentHover",
                "cssVar": "--zd-accent-hover",
                "label": "accentHover",
                "default": "accent:accent-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "codeBg",
                "cssVar": "--zd-code-bg",
                "label": "codeBg",
                "default": "base:base-3",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "codeFg",
                "cssVar": "--zd-code-fg",
                "label": "codeFg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "success",
                "cssVar": "--zd-success",
                "label": "success",
                "default": "state:state-success",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "danger",
                "cssVar": "--zd-danger",
                "label": "danger",
                "default": "oklch(.655 .170 25)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "warning",
                "cssVar": "--zd-warning",
                "label": "warning",
                "default": "state:state-warning",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "info",
                "cssVar": "--zd-info",
                "label": "info",
                "default": "state:state-info",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidNodeBg",
                "cssVar": "--zd-mermaid-node-bg",
                "label": "mermaidNodeBg",
                "default": "base:base-3",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidText",
                "cssVar": "--zd-mermaid-text",
                "label": "mermaidText",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidLine",
                "cssVar": "--zd-mermaid-line",
                "label": "mermaidLine",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidLabelBg",
                "cssVar": "--zd-mermaid-label-bg",
                "label": "mermaidLabelBg",
                "default": "base:base-3",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "mermaidNoteBg",
                "cssVar": "--zd-mermaid-note-bg",
                "label": "mermaidNoteBg",
                "default": "base:base-2",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatUserBg",
                "cssVar": "--zd-chat-user-bg",
                "label": "chatUserBg",
                "default": "accent:accent-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatUserText",
                "cssVar": "--zd-chat-user-text",
                "label": "chatUserText",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatAssistantBg",
                "cssVar": "--zd-chat-assistant-bg",
                "label": "chatAssistantBg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "chatAssistantText",
                "cssVar": "--zd-chat-assistant-text",
                "label": "chatAssistantText",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "imageOverlayBg",
                "cssVar": "--zd-image-overlay-bg",
                "label": "imageOverlayBg",
                "default": "base:base-4",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "imageOverlayFg",
                "cssVar": "--zd-image-overlay-fg",
                "label": "imageOverlayFg",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "matchedKeywordBg",
                "cssVar": "--zd-matched-keyword-bg",
                "label": "matchedKeywordBg",
                "default": "oklch(.700 .158 62)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "matchedKeywordFg",
                "cssVar": "--zd-matched-keyword-fg",
                "label": "matchedKeywordFg",
                "default": "oklch(.300 .003 65)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxComment",
                "cssVar": "--zd-syntax-comment",
                "label": "syntaxComment",
                "default": "base:base-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxString",
                "cssVar": "--zd-syntax-string",
                "label": "syntaxString",
                "default": "state:state-success",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxNumber",
                "cssVar": "--zd-syntax-number",
                "label": "syntaxNumber",
                "default": "state:state-warning",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxKeyword",
                "cssVar": "--zd-syntax-keyword",
                "label": "syntaxKeyword",
                "default": "accent:accent-1",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxCallable",
                "cssVar": "--zd-syntax-callable",
                "label": "syntaxCallable",
                "default": "state:state-info",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxType",
                "cssVar": "--zd-syntax-type",
                "label": "syntaxType",
                "default": "state:state-warning",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxName",
                "cssVar": "--zd-syntax-name",
                "label": "syntaxName",
                "default": "base:base-0",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxInserted",
                "cssVar": "--zd-syntax-inserted",
                "label": "syntaxInserted",
                "default": "oklch(.750 .145 145)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              },
              {
                "id": "syntaxDeleted",
                "cssVar": "--zd-syntax-deleted",
                "label": "syntaxDeleted",
                "default": "oklch(.820 .100 25)",
                "type": {
                  "kind": "color",
                  "format": "oklch"
                }
              }
            ]
          }
        ],
        "colorExtras": {
          "id": "zudo-doc",
          "label": "Zudo Doc",
          "baseRoles": {},
          "baseDefaults": {},
          "defaultShikiTheme": "github-dark",
          "colorSchemes": {},
          "panelSettings": {
            "colorScheme": "Default Dark",
            "colorMode": {
              "defaultMode": "dark",
              "lightScheme": "Default Light",
              "darkScheme": "Default Dark"
            }
          }
        }
      },
      {
        "id": "font",
        "label": "Font",
        "tiers": [
          {
            "id": "font-scale",
            "label": "Scale",
            "items": [
              {
                "id": "text-scale-2xs",
                "cssVar": "--text-scale-2xs",
                "label": "text-scale-2xs",
                "default": "0.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-xs",
                "cssVar": "--text-scale-xs",
                "label": "text-scale-xs",
                "default": "0.875rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-sm",
                "cssVar": "--text-scale-sm",
                "label": "text-scale-sm",
                "default": "1rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-md",
                "cssVar": "--text-scale-md",
                "label": "text-scale-md",
                "default": "1.2rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-lg",
                "cssVar": "--text-scale-lg",
                "label": "text-scale-lg",
                "default": "1.4rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-xl",
                "cssVar": "--text-scale-xl",
                "label": "text-scale-xl",
                "default": "3rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-scale-2xl",
                "cssVar": "--text-scale-2xl",
                "label": "text-scale-2xl",
                "default": "3.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "font-size",
            "label": "Font size",
            "items": [
              {
                "id": "text-micro",
                "cssVar": "--text-micro",
                "label": "text-micro",
                "default": "text-scale-2xs",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-caption",
                "cssVar": "--text-caption",
                "label": "text-caption",
                "default": "text-scale-xs",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-small",
                "cssVar": "--text-small",
                "label": "text-small",
                "default": "text-scale-sm",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-body",
                "cssVar": "--text-body",
                "label": "text-body",
                "default": "text-scale-md",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-title",
                "cssVar": "--text-title",
                "label": "text-title",
                "default": "text-scale-lg",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-heading",
                "cssVar": "--text-heading",
                "label": "text-heading",
                "default": "text-scale-xl",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "text-display",
                "cssVar": "--text-display",
                "label": "text-display",
                "default": "text-scale-2xl",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              }
            ],
            "referencesTier": "font-scale"
          },
          {
            "id": "line-height",
            "label": "Line height",
            "items": [
              {
                "id": "leading-tight",
                "cssVar": "--leading-tight",
                "label": "leading-tight",
                "default": "1.25",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              },
              {
                "id": "leading-snug",
                "cssVar": "--leading-snug",
                "label": "leading-snug",
                "default": "1.375",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              },
              {
                "id": "leading-normal",
                "cssVar": "--leading-normal",
                "label": "leading-normal",
                "default": "1.5",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              },
              {
                "id": "leading-relaxed",
                "cssVar": "--leading-relaxed",
                "label": "leading-relaxed",
                "default": "1.625",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": ""
                }
              }
            ]
          },
          {
            "id": "font-weight",
            "label": "Font weight",
            "items": [
              {
                "id": "font-weight-normal",
                "cssVar": "--font-weight-normal",
                "label": "font-weight-normal",
                "default": "400",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              },
              {
                "id": "font-weight-medium",
                "cssVar": "--font-weight-medium",
                "label": "font-weight-medium",
                "default": "500",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              },
              {
                "id": "font-weight-semibold",
                "cssVar": "--font-weight-semibold",
                "label": "font-weight-semibold",
                "default": "600",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              },
              {
                "id": "font-weight-bold",
                "cssVar": "--font-weight-bold",
                "label": "font-weight-bold",
                "default": "700",
                "type": {
                  "kind": "select",
                  "options": [
                    "100",
                    "200",
                    "300",
                    "400",
                    "500",
                    "600",
                    "700",
                    "800",
                    "900"
                  ]
                }
              }
            ]
          },
          {
            "id": "font-family",
            "label": "Font family",
            "items": [
              {
                "id": "font-sans",
                "cssVar": "--font-sans",
                "label": "font-sans",
                "default": "system-ui, sans-serif",
                "type": {
                  "kind": "text"
                }
              },
              {
                "id": "font-mono",
                "cssVar": "--font-mono",
                "label": "font-mono",
                "default": "ui-monospace, monospace",
                "type": {
                  "kind": "text"
                }
              }
            ]
          }
        ]
      },
      {
        "id": "spacing",
        "label": "Spacing",
        "tiers": [
          {
            "id": "hsp",
            "label": "Horizontal spacing",
            "items": [
              {
                "id": "hsp-2xs",
                "cssVar": "--spacing-hsp-2xs",
                "label": "hsp-2xs",
                "default": "0.125rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-xs",
                "cssVar": "--spacing-hsp-xs",
                "label": "hsp-xs",
                "default": "0.375rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-sm",
                "cssVar": "--spacing-hsp-sm",
                "label": "hsp-sm",
                "default": "0.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-md",
                "cssVar": "--spacing-hsp-md",
                "label": "hsp-md",
                "default": "0.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-lg",
                "cssVar": "--spacing-hsp-lg",
                "label": "hsp-lg",
                "default": "1rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-xl",
                "cssVar": "--spacing-hsp-xl",
                "label": "hsp-xl",
                "default": "1.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "hsp-2xl",
                "cssVar": "--spacing-hsp-2xl",
                "label": "hsp-2xl",
                "default": "2rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "vsp",
            "label": "Vertical spacing",
            "items": [
              {
                "id": "vsp-3xs",
                "cssVar": "--spacing-vsp-3xs",
                "label": "vsp-3xs",
                "default": "0.25rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-2xs",
                "cssVar": "--spacing-vsp-2xs",
                "label": "vsp-2xs",
                "default": "0.4375rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-xs",
                "cssVar": "--spacing-vsp-xs",
                "label": "vsp-xs",
                "default": "0.875rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-sm",
                "cssVar": "--spacing-vsp-sm",
                "label": "vsp-sm",
                "default": "1.25rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-md",
                "cssVar": "--spacing-vsp-md",
                "label": "vsp-md",
                "default": "1.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-lg",
                "cssVar": "--spacing-vsp-lg",
                "label": "vsp-lg",
                "default": "1.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-xl",
                "cssVar": "--spacing-vsp-xl",
                "label": "vsp-xl",
                "default": "2.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              },
              {
                "id": "vsp-2xl",
                "cssVar": "--spacing-vsp-2xl",
                "label": "vsp-2xl",
                "default": "3.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.025,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "icon",
            "label": "Icons",
            "items": [
              {
                "id": "icon-xs",
                "cssVar": "--spacing-icon-xs",
                "label": "icon-xs",
                "default": "0.75rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "icon-sm",
                "cssVar": "--spacing-icon-sm",
                "label": "icon-sm",
                "default": "1rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "icon-md",
                "cssVar": "--spacing-icon-md",
                "label": "icon-md",
                "default": "1.25rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "icon-lg",
                "cssVar": "--spacing-icon-lg",
                "label": "icon-lg",
                "default": "1.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              }
            ]
          },
          {
            "id": "layout",
            "label": "Layout",
            "items": [
              {
                "id": "image-overlay-inset",
                "cssVar": "--spacing-image-overlay-inset",
                "label": "image-overlay-inset",
                "default": "0.5rem",
                "type": {
                  "kind": "length",
                  "step": 0.05,
                  "unit": "rem"
                }
              },
              {
                "id": "spacing-0",
                "cssVar": "--spacing-0",
                "label": "spacing-0",
                "default": "0",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": ""
                },
                "readonly": true
              },
              {
                "id": "spacing-px",
                "cssVar": "--spacing-px",
                "label": "spacing-px",
                "default": "1px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                },
                "readonly": true
              },
              {
                "id": "sidebar-w",
                "cssVar": "--zd-sidebar-w",
                "label": "sidebar-w",
                "default": "clamp(14rem, 20vw, 22rem)",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": ""
                },
                "readonly": true
              }
            ]
          }
        ]
      },
      {
        "id": "size",
        "label": "Size",
        "tiers": [
          {
            "id": "radius",
            "label": "Radius",
            "items": [
              {
                "id": "radius-DEFAULT",
                "cssVar": "--radius-DEFAULT",
                "label": "radius-DEFAULT",
                "default": "4px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                }
              },
              {
                "id": "radius-lg",
                "cssVar": "--radius-lg",
                "label": "radius-lg",
                "default": "8px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                }
              },
              {
                "id": "radius-full",
                "cssVar": "--radius-full",
                "label": "radius-full",
                "default": "9999px",
                "type": {
                  "kind": "length",
                  "step": 1,
                  "unit": "px"
                },
                "pill": {
                  "value": "9999px",
                  "customDefault": "16px"
                }
              }
            ]
          },
          {
            "id": "transition",
            "label": "Transition",
            "items": [
              {
                "id": "default-transition-duration",
                "cssVar": "--default-transition-duration",
                "label": "default-transition-duration",
                "default": "150ms",
                "type": {
                  "kind": "length",
                  "step": 10,
                  "unit": "ms"
                }
              }
            ]
          }
        ]
      }
    ]
  }
};

// components/playground-controls.tsx
function readMode() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function requestedManifest() {
  return new URLSearchParams(window.location.search).get("manifest") === "zudo-doc" ? "zudo-doc" : "playground";
}
function PlaygroundControls() {
  const [mode, setMode] = d("light");
  const [manifest, setManifest] = d("playground");
  y(() => {
    let activeMode = readMode();
    const selected = requestedManifest();
    let activeConfig = selected === "zudo-doc" ? zudoDocConfigs[activeMode] : panelConfig;
    let handle = re(activeConfig);
    hr();
    setMode(activeMode);
    setManifest(selected);
    window.zfb = {
      version: package_default.version,
      manifest: selected,
      ...selected === "zudo-doc" ? { manifestSourceVersion: ZUDO_DOC_SOURCE_VERSION } : {},
      showDesignPanel: () => handle.open(),
      hideDesignPanel: () => handle.close(),
      toggleDesignPanel: () => handle.toggle()
    };
    const alias = window.zdtp;
    if (alias) alias.version = package_default.version;
    const onSchemeChange = () => {
      const nextMode = readMode();
      activeMode = nextMode;
      setMode(nextMode);
      if (selected !== "zudo-doc") return;
      const shouldReopen = localStorage.getItem(`${activeConfig.storagePrefix}:visible`) === "1";
      handle.destroy();
      activeConfig = zudoDocConfigs[nextMode];
      handle = re(activeConfig);
      hr();
      if (shouldReopen) handle.open();
    };
    window.addEventListener("color-scheme-changed", onSchemeChange);
    return () => window.removeEventListener("color-scheme-changed", onSchemeChange);
  }, []);
  const toggleTheme = () => {
    const nextMode = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextMode;
    document.documentElement.style.colorScheme = nextMode;
    localStorage.setItem("zfb-playground-theme", nextMode);
    window.dispatchEvent(new CustomEvent("color-scheme-changed"));
  };
  return /* @__PURE__ */ u("div", { class: "zfb-controls", children: [
    /* @__PURE__ */ u("span", { class: "zfb-meta", children: [
      manifest === "zudo-doc" ? `zudo-doc ${ZUDO_DOC_SOURCE_VERSION}` : "playground manifest",
      " \xB7 zdtp ",
      package_default.version
    ] }),
    /* @__PURE__ */ u("button", { type: "button", class: "zfb-button zfb-button--quiet", onClick: toggleTheme, children: mode === "dark" ? "Light mode" : "Dark mode" }),
    /* @__PURE__ */ u("button", { type: "button", class: "zfb-button", onClick: () => window.zfb?.toggleDesignPanel(), children: "Open token panel" })
  ] });
}

// .zfb-esbuild-entry-tJS2oF.tsx
var __zfb_manifest = {};
function __zfb_pick(ns, exportName) {
  const named = ns[exportName];
  return named !== void 0 && named !== null ? named : ns.default;
}
function __zfb_register(ns, exportName, markerName, moduleLabel) {
  const C = __zfb_pick(ns, exportName);
  if (!(typeof C === "function" || typeof C === "object" && C !== null && C.$$typeof)) {
    console.warn("[zfb] island export " + exportName + " from " + moduleLabel + " is not a component (got " + (C === null ? "null" : typeof C) + "); skipping registration.");
    return;
  }
  __zfb_manifest[markerName] = {
    mount: (props, element, mode) => {
      const v = k(C, props);
      if (mode === "hydrate") {
        U(v, element);
      } else {
        R(v, element);
      }
    },
    unmount: (element) => {
      R(null, element);
    }
  };
}
__zfb_register(playground_controls_exports, "default", "PlaygroundControls", "/home/takazudo/repos/myoss/zdtp/worktrees/649-playground/playground/components/playground-controls.tsx");
mountIslands(__zfb_manifest);
//# sourceMappingURL=islands.js.map
