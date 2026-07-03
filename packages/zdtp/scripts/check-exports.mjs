#!/usr/bin/env node
/**
 * Post-build exports-resolution check.
 *
 * Reads every target path declared in the package.json `exports` map and
 * asserts that the corresponding file exists on disk under the package root.
 * Exits with a non-zero status and a descriptive error message if any target
 * is missing, so the build fails fast before a bad tarball can be published.
 *
 * Design notes:
 * - Handles both plain-string export values ("./styles": "./dist/zdtp.css")
 *   and condition-object values (".": {"types": "...", "import": "...", "default": "..."}).
 * - Skips `./package.json` (it is always the package root file, not in dist).
 * - Kept dependency-free — Node built-ins only.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');

// Load package.json via createRequire so we don't need fs.readFileSync + JSON.parse.
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const exports_ = pkg.exports ?? {};

/** Collect all file paths that need to exist after the build. */
function collectPaths(value) {
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(collectPaths);
  }
  return [];
}

let failed = false;

for (const [exportKey, exportValue] of Object.entries(exports_)) {
  // The ./package.json export always points at the root file — skip.
  if (exportKey === './package.json') continue;

  const paths = collectPaths(exportValue);

  for (const relPath of paths) {
    // Only check paths that live inside dist (types + runtime files).
    // Paths like "./package.json" are self-referential root files, already excluded above.
    if (!relPath.startsWith('./dist/')) continue;

    const absPath = join(packageRoot, relPath);
    if (!existsSync(absPath)) {
      console.error(
        `[check-exports] MISSING: exports["${exportKey}"] -> "${relPath}" not found at ${absPath}`,
      );
      failed = true;
    } else {
      console.log(`[check-exports] OK: exports["${exportKey}"] -> "${relPath}"`);
    }
  }
}

if (failed) {
  console.error('[check-exports] Build failed: one or more export targets are missing from dist.');
  process.exit(1);
}

console.log('[check-exports] All export targets resolved successfully.');
