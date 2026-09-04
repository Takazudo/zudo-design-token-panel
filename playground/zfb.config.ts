import { defineConfig } from '@takazudo/zfb/config';

export default defineConfig({
  framework: 'preact',
  base: '/',
  collections: [{ name: 'prose', path: 'content/prose' }],
  markdown: { gfm: true },
  plugins: [
    { name: './plugins/workspace-zdtp-alias.mjs' },
    { name: './plugins/dev-apply-proxy.mjs' },
  ],
});
