import { defineConfig } from "zfb/config";
import { zudoDocPreset } from "@takazudo/zudo-doc/preset";
import { settings } from "./src/config/settings";
import { buildDocsSchema } from "./src/config/docs-schema";

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
  ...zudoDocPreset({ settings, buildDocsSchema, directiveVocabulary }),
});
