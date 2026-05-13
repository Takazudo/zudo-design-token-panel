// pages/components/forms.tsx (stub)
import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function FormsPage() {
  return (
    <AppShell
      title="Forms — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/forms/`}
    >
      <h1 class="text-h2 text-primary">Form controls demo</h1>
      <p class="text-body">Form controls demo lands in #131.</p>
    </AppShell>
  );
}
