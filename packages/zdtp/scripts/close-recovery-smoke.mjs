import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function writeCloseRecoveryFixture(appDir) {
  await writeFile(join(appDir, 'close-recovery.html'), '<link rel="icon" href="data:,"><script type="module" src="/close-recovery.js"></script>');
  await writeFile(join(appDir, 'close-recovery.js'), `
import { configurePanel } from '@takazudo/zdtp';
window.startCloseRecovery = () => {
  window.closeRecoveryHandle = configurePanel({
    storagePrefix: 'packed-close-recovery', consoleNamespace: 'packedCloseRecovery',
    modalClassPrefix: 'packed-close-modal', schemaId: 'packed-close/v1',
    exportFilenameBase: 'packed-close', autoRememberOnOpen: false, tabs: [],
  });
  window.closeRecoveryHandle.open();
};
window.closeRecoveryState = () => ({
  children: document.getElementById('packed-close-recovery-root')?.childElementCount,
  shells: document.querySelectorAll('#packed-close-recovery-root .tokenpanel-shell').length,
  open: localStorage.getItem('packed-close-recovery-open'),
  visible: localStorage.getItem('packed-close-recovery:visible'),
});
`);
}

export async function verifyCloseRecovery(browser, origin) {
  const closed = { children: 0, shells: 0, open: null, visible: '0' };
  const opened = { children: 1, shells: 1, open: '1', visible: '1' };
  const arms = [
    ...[245, 248, 249, 250, 251].map((delay) => ({ delay, path: 'click' })),
    ...['Enter', 'Space', 'Escape', 'public'].map((path) => ({ delay: 248, path })),
    { delay: 248, path: 'immediate-reopen' },
  ];
  for (const { delay, path } of arms) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.clock.install({ time: new Date('2026-10-15T00:00:00Z') });
      await page.goto(`${origin}/close-recovery.html`);
      await page.waitForFunction(() => window.startCloseRecovery);
      await page.clock.pauseAt(new Date('2026-10-15T00:00:10Z'));
      await page.evaluate(() => window.startCloseRecovery());
      await page.clock.runFor(delay);
      assert.deepEqual(await page.evaluate(() => window.closeRecoveryState()), opened, `${path}/${delay}: populated before close`);
      if (path === 'public') await page.evaluate(() => window.closeRecoveryHandle.close());
      else if (path === 'Escape') await page.keyboard.press('Escape');
      else if (path === 'Enter' || path === 'Space') {
        await page.getByRole('button', { name: 'Close panel', exact: true }).focus();
        await page.keyboard.press(path);
      } else {
        // DOM click dispatches the real RoleButton handler without advancing the paused clock.
        await page.evaluate(() => document.querySelector('[aria-label="Close panel"]').click());
      }
      assert.deepEqual(await page.evaluate(() => window.closeRecoveryState()), closed, `${path}/${delay}: immediate closed intent`);
      if (path === 'immediate-reopen') await page.evaluate(() => window.closeRecoveryHandle.open());
      await page.clock.runFor(Math.max(0, 250 - delay));
      await page.clock.runFor(400);
      assert.deepEqual(await page.evaluate(() => window.closeRecoveryState()), path === 'immediate-reopen' ? opened : closed, `${path}/${delay}: after recovery and effects`);
      if (path !== 'immediate-reopen') {
        await page.evaluate(() => window.closeRecoveryHandle.open());
        await page.clock.runFor(400);
        assert.deepEqual(await page.evaluate(() => window.closeRecoveryState()), opened, `${path}/${delay}: explicit reopen`);
      }
      assert.deepEqual(errors, [], `${path}/${delay}: browser errors`);
      console.log(`Packed Close recovery: ${path} at ${delay} ms PASS`);
    } finally {
      await context.close();
    }
  }
}
