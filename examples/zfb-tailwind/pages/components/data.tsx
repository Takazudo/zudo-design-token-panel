// pages/components/data.tsx (stub)
import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function DataPage() {
  return (
    <AppShell
      title="Data — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/data/`}
    >
      <h1 class="text-h2 text-primary">Data &amp; media demo</h1>
      <p class="text-body">Data &amp; media demo lands in #134.</p>
    </AppShell>
  );
}
