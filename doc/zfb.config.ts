import { defineConfig } from "zfb/config";
import { zudoDocPreset } from "@takazudo/zudo-doc/preset";
import { settings } from "./src/config/settings";
import { buildDocsSchema } from "./src/config/docs-schema";
import { translations } from "./src/config/i18n";
import { colorSchemes } from "./src/config/color-schemes";
import { tagVocabulary } from "./src/config/tag-vocabulary";

const directiveVocabulary = {
  note: "Note",
  tip: "Tip",
  info: "Info",
  warning: "Warning",
  danger: "Danger",
  caution: "Caution",
  details: "Details",
};

export default defineConfig({
  // ── Host-owned shell fields ──────────────────────────────────────────────
  framework: "preact",
  // Pin the dev/preview port — zfb defaults to 3000, but the generated
  // CLAUDE.md and the Tauri dev wrappers assume 4321.
  port: 4321,
  tailwind: { enabled: true },
  // Public URL prefix for <link rel="stylesheet"> and <script> tags.
  // The site is served at the domain root, so base is "/" (no prefix) and
  // copyPublicWithBase keeps its default — public/ assets land at the dist
  // root, matching the root deploy.
  base: settings.base,

  // ── Preset-owned fields (content collections, plugins, markdown, …) ────────
  ...zudoDocPreset({ settings, buildDocsSchema, directiveVocabulary, translations, colorSchemes, tagVocabulary }),

  // Cloudflare adapter — wraps the SSR bundle into `dist/_worker.js` (the
  // explicit main entry for the Workers static-assets deploy) plus a sidecar
  // `dist/_zfb_inner.mjs`. Required so `zfb build` emits a worker for the
  // Cloudflare Workers deploy (see wrangler.toml + .github/workflows). Placed
  // after the preset spread so it wins regardless of any preset default.
  adapter: "@takazudo/zfb-adapter-cloudflare",
});
