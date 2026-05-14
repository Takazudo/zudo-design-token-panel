// pages/components/data.tsx — Data & media demo (#134)
import { AppShell } from '../../components/app-shell';
import { DataTable } from '../../components/data/data-table';
import { MediaCard } from '../../components/data/media-card';
import { StatCard } from '../../components/data/stat-card';
import { ProfileCard } from '../../components/data/profile-card';
import { AvatarRow } from '../../components/data/avatar-row';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function DataPage() {
  return (
    <AppShell
      title="Data — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/data/`}
    >
      <div class="flex flex-col gap-vsp-xl">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div>
          <h1 class="text-page-title text-primary">Data &amp; media demo</h1>
          <p class="text-body">
            Token map: table borders use <code>color-muted</code>,
            row hover uses <code>color-surface</code>,
            stat number reads <code>text-page-title</code>,
            avatars resize via <code>size-avatar-sm</code> / <code>size-avatar-md</code>.
          </p>
        </div>

        {/* ── 1. Data table ───────────────────────────────────────────────── */}
        <section class="flex flex-col gap-vsp-sm">
          <h2 class="text-section-title text-fg">Data table with row actions</h2>
          <p class="text-helper text-muted">
            Table header: <code>text-subsection-title</code>. Body: <code>text-helper</code>.
            Borders: <code>color-muted</code>. Row hover: <code>color-surface</code>.
            Action icon size: <code>size-icon-md</code>.
          </p>
          <DataTable />
        </section>

        {/* ── 2. Media card ───────────────────────────────────────────────── */}
        <section class="flex flex-col gap-vsp-sm">
          <h2 class="text-section-title text-fg">Media card</h2>
          <p class="text-helper text-muted">
            Container: <code>color-surface</code> + <code>color-muted</code> border.
            Image placeholder: CSS gradient, no network fetch.
            CTA: <code>color-accent</code>.
          </p>
          <MediaCard />
        </section>

        {/* ── 3. Stat cards ───────────────────────────────────────────────── */}
        <section class="flex flex-col gap-vsp-sm">
          <h2 class="text-section-title text-fg">Stat cards</h2>
          <p class="text-helper text-muted">
            Big number: semantic font token <code>text-page-title</code> + <code>color-primary</code>.
            Label: <code>text-helper</code> + <code>color-muted</code>. No hardcoded <code>font-size</code>.
          </p>
          <div class="flex gap-x-hsp-md gap-y-vsp-md flex-wrap">
            <StatCard value="24,891" label="Total users" />
            <StatCard value="98.6%" label="Uptime this month" />
            <StatCard value="1,204" label="Active sessions" />
          </div>
        </section>

        {/* ── 4. Profile card ─────────────────────────────────────────────── */}
        <section class="flex flex-col gap-vsp-sm">
          <h2 class="text-section-title text-fg">Profile card</h2>
          <p class="text-helper text-muted">
            Avatar: <code>size-avatar-md</code> (tweak in panel to resize).
            Name: <code>text-subsection-title</code>. Role: <code>text-helper color-muted</code>.
          </p>
          <div class="flex flex-col gap-vsp-md max-w-[32rem]">
            {/* reason: card list width is page-local */}
            <ProfileCard name="Alice Martin" role="Product Designer" />
            <ProfileCard name="Bob Chen" role="Frontend Engineer" />
          </div>
        </section>

        {/* ── 5. Avatar row ───────────────────────────────────────────────── */}
        <section class="flex flex-col gap-vsp-sm">
          <h2 class="text-section-title text-fg">Avatar row</h2>
          <p class="text-helper text-muted">
            Each avatar reads <code>size-avatar-sm</code> (tweak in panel to resize all at once).
            Background: <code>palette-1</code>–<code>palette-4</code> via inline style.
          </p>
          <AvatarRow />
        </section>

      </div>
    </AppShell>
  );
}
