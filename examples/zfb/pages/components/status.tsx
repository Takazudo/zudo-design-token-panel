/**
 * Status demo stub — status surfaces demo lands in #138.
 */

import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

export default function StatusPage() {
  return (
    <AppShell
      title="Status — zfb — Design Token Panel"
      activePath={`${BASE_PATH}components/status/`}
    >
      <h1 class="zfbexample-heading">Status surfaces demo</h1>
      <p>Status surfaces demo lands in #138.</p>
    </AppShell>
  );
}
