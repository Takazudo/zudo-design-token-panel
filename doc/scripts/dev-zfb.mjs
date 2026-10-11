import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const manifestPath = require.resolve('@takazudo/zfb/package.json');
const manifest = require(manifestPath);

// ZFB 4.3.1 cold-lazy dev can serve an incoming route with a different native
// transport identity from the already-loaded islands bundle. Use its supported
// eager startup mode for the real docs server, including browser verification.
const child = spawn(process.execPath, [
  resolve(dirname(manifestPath), manifest.bin.zfb),
  'dev',
  ...process.argv.slice(2),
], {
  stdio: 'inherit',
  env: { ...process.env, ZFB_DEV_BOOT_LAZY: '0' },
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
});
