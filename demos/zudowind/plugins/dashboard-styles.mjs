import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/**
 * Serve the public package stylesheet as an ordinary static asset. This also
 * runs at dev boot; rebuilding the package then restarting refreshes the copy.
 * @type {import('@takazudo/zfb/plugins').ZfbPlugin}
 */
export default {
  name: 'dashboard-styles',
  async preBuild({ projectRoot, config }) {
    const require = createRequire(join(projectRoot, 'package.json'));
    const source = require.resolve('@takazudo/zdtp/dashboard/styles.css');
    const target = join(projectRoot, config.publicDir ?? 'public', '_generated');
    await mkdir(target, { recursive: true });
    await copyFile(source, join(target, 'zdtp-dashboard.css'));
  },
  async postBuild({ outDir, routes }) {
    const route = routes?.routes.find((entry) => entry.source === 'pages/dashboard.tsx');
    if (!route) throw new Error('Static dashboard route is missing from the build.');
    const output = join(outDir, route.output);
    const html = await readFile(output, 'utf8');
    if (/<zfb-island\b|data-zfb-island\b/i.test(html)) {
      throw new Error('Static dashboard must not contain a client island.');
    }
    // zfb 2.13 injects sitewide CSS and its islands loader even on routes with
    // no islands. This page owns its two static CSS links and needs neither.
    // Limit removal to those generated tags; fail on any other script so a
    // future framework/route change cannot silently ship client behavior here.
    const staticHtml = html
      .replace(/<script\b[^>]*\bsrc=["'][^"']*\/assets\/islands(?:-[^"']+)?\.js["'][^>]*>\s*<\/script>/gi, '')
      .replace(/<link\b[^>]*\bhref=["'][^"']*\/assets\/styles(?:-[^"']+)?\.css["'][^>]*>/gi, '');
    if (/<script\b/i.test(staticHtml)) {
      throw new Error('Unexpected script in static dashboard output.');
    }
    await writeFile(output, staticHtml);
  },
};
