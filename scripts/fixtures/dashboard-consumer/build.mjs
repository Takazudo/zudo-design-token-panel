import { mkdir, writeFile, copyFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { h } from '@takazudo/zfb/zudo-react';
import { renderToString } from '@takazudo/zfb/zudo-react/server';
import Page from './compiled/page.js';

await mkdir('dist', { recursive: true });
const renderPage = (theme) => '<!doctype html>' + renderToString(h(Page, { theme }));
await writeFile('dist/index.html', renderPage('light'));
await writeFile('dist/dark.html', renderPage('dark'));
await copyFile(fileURLToPath(import.meta.resolve('@takazudo/zdtp/dashboard/styles.css')), 'dist/dashboard.css');
await copyFile('host.css', 'dist/host.css');
const dashboardRequire = createRequire(import.meta.resolve('@takazudo/zdtp/dashboard'));
await writeFile('resolution.json', JSON.stringify({
  dashboardZfbPackage: await realpath(dashboardRequire.resolve('@takazudo/zfb/package.json')),
  zfbPackage: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zfb/package.json'))),
  jsxRuntime: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zfb/zudo-react/jsx-runtime'))),
  dashboard: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zdtp/dashboard'))),
  zudoReact: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zfb/zudo-react'))),
  renderer: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zfb/zudo-react/server'))),
  styles: await realpath(fileURLToPath(import.meta.resolve('@takazudo/zdtp/dashboard/styles.css'))),
}, null, 2));
