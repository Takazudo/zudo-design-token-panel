/**
 * Widgets page — Interactive widgets demo for the zfb example.
 *
 * Plain CSS mirror of zfb-tailwind/pages/components/widgets.tsx (#138).
 * Tailwind utilities replaced by .zfb-tabs*, .zfb-accordion*,
 * .zfb-modal* classes from global.css.
 *
 * Three interactive widget types, each driven by semantic easing tokens
 * from --zfb-easing-* so the Panel's Easing tab updates motion live.
 *
 *   Tabs      — horizontal nav with sliding indicator, easing-tab-open
 *   Accordion — native <details>/<summary> with height transition,
 *               easing-tab-open (open) / easing-tab-close (close)
 *   Modal     — native <dialog>.showModal() with fade+scale animation,
 *               easing-modal
 */

import { AppShell } from '../../components/app-shell';
import { TabsDemo } from '../../components/widgets/tabs';
import { AccordionDemo } from '../../components/widgets/accordion';
import { ModalDemo } from '../../components/widgets/modal';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

export default function WidgetsPage() {
  return (
    <AppShell
      title="Widgets — zfb — Design Token Panel"
      activePath={`${BASE_PATH}components/widgets/`}
    >
      {/* reason: page-content max-width is a layout constant for this demo; no structural token covers prose-container widths */}
      <div class="zfb-page-stack">
        <header>
          <h1 class="zfb-section-h2" style={{ marginBottom: 'var(--zfb-spacing-md)' }}>
            Interactive Widgets
          </h1>
          <p class="zfb-body-text">
            Each widget uses a semantic easing token from the{' '}
            <strong>Easing</strong> tab. Open the panel and change an easing
            value to see motion update live.
          </p>
        </header>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <section>
          <h2 class="zfb-section-h3" style={{ marginBottom: 'var(--zfb-spacing-sm)' }}>
            Tabs
          </h2>
          <p class="zfb-muted-text" style={{ marginBottom: 'var(--zfb-spacing-md)' }}>
            Active indicator slides using{' '}
            <code>easing-tab-open</code>{' '}
            (→&nbsp;<code>--zfb-easing-tab-open</code>).
          </p>
          <div class="zfb-surface-box">
            <TabsDemo />
          </div>
        </section>

        {/* ── Accordion ─────────────────────────────────────────────────────── */}
        <section>
          <h2 class="zfb-section-h3" style={{ marginBottom: 'var(--zfb-spacing-sm)' }}>
            Accordion
          </h2>
          <p class="zfb-muted-text" style={{ marginBottom: 'var(--zfb-spacing-md)' }}>
            Height transitions use{' '}
            <code>easing-tab-open</code> / <code>easing-tab-close</code>{' '}
            for open/close respectively (progressive enhancement, Chrome 131+).
          </p>
          <AccordionDemo />
        </section>

        {/* ── Modal ─────────────────────────────────────────────────────────── */}
        <section>
          <h2 class="zfb-section-h3" style={{ marginBottom: 'var(--zfb-spacing-sm)' }}>
            Modal
          </h2>
          <p class="zfb-muted-text" style={{ marginBottom: 'var(--zfb-spacing-md)' }}>
            Fade-and-scale animation uses{' '}
            <code>easing-modal</code>{' '}
            (→&nbsp;<code>--zfb-easing-modal</code>). Close via
            button or <kbd>Escape</kbd>.
          </p>
          <ModalDemo />
        </section>
      </div>
    </AppShell>
  );
}
