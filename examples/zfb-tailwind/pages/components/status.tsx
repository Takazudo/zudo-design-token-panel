// pages/components/status.tsx (stub)
import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function StatusPage() {
  return (
    <AppShell
      title="Status — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/status/`}
    >
      <h1 class="text-h2 text-primary">Status surfaces demo</h1>
      <p class="text-body">Status surfaces demo lands in #132.</p>
    </AppShell>
  );
}
