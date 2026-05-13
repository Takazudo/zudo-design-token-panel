/**
 * Data & media demo — zfb plain CSS.
 *
 * Plain CSS mirror of zfb-tailwind/pages/components/data.tsx (#138).
 * Tailwind utilities replaced by .zfb-table*, .zfb-media-card*,
 * .zfb-stat-card*, .zfb-profile-card*, .zfb-avatar-row*
 * classes from global.css.
 */

import { AppShell } from '../../components/app-shell';
import { DataTable } from '../../components/data/data-table';
import { MediaCard } from '../../components/data/media-card';
import { StatCard } from '../../components/data/stat-card';
import { ProfileCard } from '../../components/data/profile-card';
import { AvatarRow } from '../../components/data/avatar-row';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

export default function DataPage() {
  return (
    <AppShell
      title="Data — zfb — Design Token Panel"
      activePath={`${BASE_PATH}components/data/`}
    >
      <div class="zfb-page-stack" style={{ gap: 'var(--zfb-vsp-xl)' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div>
          <h1 class="zfb-section-h2">Data &amp; media demo</h1>
          <p class="zfb-body-text" style={{ marginTop: 'var(--zfb-spacing-sm)' }}>
            Token map: table borders use <code>color-muted</code>,
            row hover uses <code>color-surface</code>,
            stat number reads <code>text-h2</code>,
            avatars resize via <code>size-avatar-sm</code> / <code>size-avatar-md</code>.
          </p>
        </div>

        {/* ── 1. Data table ───────────────────────────────────────────────── */}
        <section class="zfb-field-group" style={{ gap: 'var(--zfb-vsp-sm)' }}>
          <h2 class="zfb-section-h3">Data table with row actions</h2>
          <p class="zfb-muted-text">
            Table header: <code>text-h4</code>. Body: <code>text-small</code>.
            Borders: <code>color-muted</code>. Row hover: <code>color-surface</code>.
            Action icon size: <code>size-icon-md</code>.
          </p>
          <DataTable />
        </section>

        {/* ── 2. Media card ───────────────────────────────────────────────── */}
        <section class="zfb-field-group" style={{ gap: 'var(--zfb-vsp-sm)' }}>
          <h2 class="zfb-section-h3">Media card</h2>
          <p class="zfb-muted-text">
            Container: <code>color-surface</code> + <code>color-muted</code> border.
            Image placeholder: CSS gradient, no network fetch.
            CTA: <code>color-accent</code>.
          </p>
          <MediaCard />
        </section>

        {/* ── 3. Stat cards ───────────────────────────────────────────────── */}
        <section class="zfb-field-group" style={{ gap: 'var(--zfb-vsp-sm)' }}>
          <h2 class="zfb-section-h3">Stat cards</h2>
          <p class="zfb-muted-text">
            Big number: semantic font token <code>text-h2</code> + <code>color-primary</code>.
            Label: <code>text-small</code> + <code>color-muted</code>. No hardcoded <code>font-size</code>.
          </p>
          <div class="zfb-flex-wrap-md">
            <StatCard value="24,891" label="Total users" />
            <StatCard value="98.6%" label="Uptime this month" />
            <StatCard value="1,204" label="Active sessions" />
          </div>
        </section>

        {/* ── 4. Profile card ─────────────────────────────────────────────── */}
        <section class="zfb-field-group" style={{ gap: 'var(--zfb-vsp-sm)' }}>
          <h2 class="zfb-section-h3">Profile card</h2>
          <p class="zfb-muted-text">
            Avatar: <code>size-avatar-md</code> (tweak in panel to resize).
            Name: <code>text-h4</code>. Role: <code>text-small color-muted</code>.
          </p>
          {/* reason: card list width is page-local */}
          <div class="zfb-field-group" style={{ maxWidth: '32rem' }}>
            <ProfileCard name="Alice Martin" role="Product Designer" />
            <ProfileCard name="Bob Chen" role="Frontend Engineer" />
          </div>
        </section>

        {/* ── 5. Avatar row ───────────────────────────────────────────────── */}
        <section class="zfb-field-group" style={{ gap: 'var(--zfb-vsp-sm)' }}>
          <h2 class="zfb-section-h3">Avatar row</h2>
          <p class="zfb-muted-text">
            Each avatar reads <code>size-avatar-sm</code> (tweak in panel to resize all at once).
            Background: <code>palette-1</code>–<code>palette-4</code> via inline style.
          </p>
          <AvatarRow />
        </section>

      </div>
    </AppShell>
  );
}
