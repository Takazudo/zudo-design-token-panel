// pages/components/widgets.tsx (stub)
import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function WidgetsPage() {
  return (
    <AppShell
      title="Widgets — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/widgets/`}
    >
      <h1 class="text-h2 text-primary">Interactive widgets demo</h1>
      <p class="text-body">Interactive widgets demo lands in #133.</p>
    </AppShell>
  );
}
