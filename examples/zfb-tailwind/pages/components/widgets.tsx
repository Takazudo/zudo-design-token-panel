/**
 * Widgets page — Interactive widgets demo for the zfb-tailwind example.
 *
 * Three interactive widget types, each driven by semantic easing tokens
 * from --zfbtailwindexample-easing-* so the Panel's Easing tab updates
 * motion live.
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

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function WidgetsPage() {
  return (
    <AppShell
      title="Widgets — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/widgets/`}
    >
      {/* reason: page-content max-width is a layout constant for this demo; no structural token covers prose-container widths */}
      <div class="flex flex-col gap-spacing-lg max-w-[56rem] mx-auto">
        <header>
          <h1 class="text-h2 text-primary font-bold mb-spacing-md">
            Interactive Widgets
          </h1>
          <p class="text-body text-fg">
            Each widget uses a semantic easing token from the{' '}
            <strong>Easing</strong> tab. Open the panel and change an easing
            value to see motion update live.
          </p>
        </header>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <section>
          <h2 class="text-h3 text-fg font-semibold mb-spacing-sm">
            Tabs
          </h2>
          <p class="text-body text-muted mb-spacing-md">
            Active indicator slides using{' '}
            <code>easing-tab-open</code>{' '}
            (→&nbsp;<code>--zfbtailwindexample-easing-tab-open</code>).
          </p>
          <div class="bg-surface p-spacing-md rounded-md border border-muted">
            <TabsDemo />
          </div>
        </section>

        {/* ── Accordion ─────────────────────────────────────────────────────── */}
        <section>
          <h2 class="text-h3 text-fg font-semibold mb-spacing-sm">
            Accordion
          </h2>
          <p class="text-body text-muted mb-spacing-md">
            Height transitions use{' '}
            <code>easing-tab-open</code> / <code>easing-tab-close</code>{' '}
            for open/close respectively (progressive enhancement, Chrome 131+).
          </p>
          <AccordionDemo />
        </section>

        {/* ── Modal ─────────────────────────────────────────────────────────── */}
        <section>
          <h2 class="text-h3 text-fg font-semibold mb-spacing-sm">
            Modal
          </h2>
          <p class="text-body text-muted mb-spacing-md">
            Fade-and-scale animation uses{' '}
            <code>easing-modal</code>{' '}
            (→&nbsp;<code>--zfbtailwindexample-easing-modal</code>). Close via
            button or <kbd>Escape</kbd>.
          </p>
          <ModalDemo />
        </section>
      </div>
    </AppShell>
  );
}
