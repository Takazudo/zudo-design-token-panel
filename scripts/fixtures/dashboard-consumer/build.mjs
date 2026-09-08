import { mkdir, writeFile, copyFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import Page from './compiled/page.js';

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', '<!doctype html>' + renderToString(h(Page)));
await copyFile(fileURLToPath(import.meta.resolve('@takazudo/zdtp/dashboard/styles.css')), 'dist/dashboard.css');
await copyFile('host.css', 'dist/host.css');
const dashboardRequire = createRequire(import.meta.resolve('@takazudo/zdtp/dashboard'));
await writeFile('resolution.json', JSON.stringify({
  dashboardPreact: await realpath(dashboardRequire.resolve('preact')),
  dashboardPreactPackage: await realpath(dashboardRequire.resolve('preact/package.json')),
  preactPackage: await realpath(fileURLToPath(import.meta.resolve('preact/package.json'))),
  jsxRuntime: await realpath(fileURLToPath(import.meta.resolve('preact/jsx-runtime'))),
  dashboard: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zdtp/dashboard'))),
  preact: await realpath(fileURLToPath(import.meta.resolve('preact'))),
  renderer: await realpath(fileURLToPath(import.meta.resolve('preact-render-to-string'))),
  styles: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zdtp/dashboard/styles.css'))),
}, null, 2));
