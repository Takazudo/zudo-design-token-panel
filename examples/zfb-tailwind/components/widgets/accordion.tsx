/**
 * AccordionDemo — 3 expandable sections using native <details>/<summary>.
 *
 * Token consumption:
 *   flex items-center justify-between px-hsp-md py-vsp-md bg-surface rounded-md text-body cursor-pointer
 *     → summary row
 *   px-hsp-md py-vsp-md border border-muted rounded-md text-body
 *     → content area
 *
 * Height transition (progressive enhancement):
 *   Uses `interpolate-size: allow-keywords` + CSS `::details-content`
 *   pseudo-element transition (Chrome 131+). Open/close timing references
 *   semantic easing tokens via a scoped <style> block inside the component.
 *   Older browsers get instant open/close — acceptable for a demo.
 *
 *   Open  → easing-tab-open  (--zfbtw-easing-tab-open)
 *   Close → easing-tab-close (--zfbtw-easing-tab-close)
 */

const ITEMS = [
  {
    id: 'a1',
    summary: 'What is a design token?',
    body: 'A design token is a named CSS custom property (e.g. --spacing-md: 1rem) that centralises a raw value behind a semantic name, making it easy to update globally.',
  },
  {
    id: 'a2',
    summary: 'How does the panel update tokens live?',
    body: 'The panel writes :root overrides directly into the page via a <style> tag, so every Tailwind utility that references a --zfbtw-* var picks up the new value before the next paint — no rebuild required.',
  },
  {
    id: 'a3',
    summary: 'Which easing tokens does this accordion use?',
    body: 'The open transition uses easing-tab-open and the close transition uses easing-tab-close. Change either in the Easing tab of the panel to see the effect here.',
  },
] as const;

export function AccordionDemo() {
  return (
    <div class="flex flex-col gap-vsp-sm">
      {/*
        Scoped transition rules for accordion open/close.
        Cannot be placed in global.css per task scope constraints.
        reason: ::details-content pseudo-element requires a stylesheet rule;
        inline style cannot target pseudo-elements
      */}
      <style>{`
        .widgets-accordion {
          interpolate-size: allow-keywords;
        }
        .widgets-accordion::details-content {
          transition: height 0.3s var(--zfbtw-easing-tab-open),
                      opacity 0.3s var(--zfbtw-easing-tab-open);
          overflow: hidden;
        }
        .widgets-accordion:not([open])::details-content {
          transition: height 0.3s var(--zfbtw-easing-tab-close),
                      opacity 0.3s var(--zfbtw-easing-tab-close);
        }
      `}</style>

      {ITEMS.map((item) => (
        <details key={item.id} class="widgets-accordion rounded-md overflow-hidden">
          <summary class="flex items-center justify-between px-hsp-md py-vsp-md bg-surface rounded-md text-body cursor-pointer list-none">
            <span>{item.summary}</span>
            <span class="text-muted text-helper select-none" aria-hidden="true">▾</span>
          </summary>
          <div class="px-hsp-md py-vsp-md border border-muted rounded-md text-body text-fg mt-vsp-xs">
            <p>{item.body}</p>
            <p class="text-helper text-muted mt-vsp-sm">
              Open timing: <code>easing-tab-open</code> →{' '}
              <code>--zfbtw-easing-tab-open</code>. Close timing:{' '}
              <code>easing-tab-close</code> →{' '}
              <code>--zfbtw-easing-tab-close</code>.
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
