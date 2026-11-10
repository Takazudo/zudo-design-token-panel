import { defineConfig } from '@takazudo/zfb/config';

export default defineConfig({
  wind: false,
  strictPlainCssImports: true,
  base: '/',
  plugins: [
    { name: './plugins/dev-apply-proxy.mjs' },
  ],
});
