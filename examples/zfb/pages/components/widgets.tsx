/**
 * Widgets demo stub — interactive widgets demo lands in #138.
 */

import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

export default function WidgetsPage() {
  return (
    <AppShell
      title="Widgets — zfb — Design Token Panel"
      activePath={`${BASE_PATH}components/widgets/`}
    >
      <h1 class="zfbexample-heading">Interactive widgets demo</h1>
      <p>Interactive widgets demo lands in #138.</p>
    </AppShell>
  );
}
