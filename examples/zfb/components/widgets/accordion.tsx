/**
 * AccordionDemo — 3 expandable sections using native <details>/<summary>.
 *
 * Plain CSS mirror of zfb-tailwind/components/widgets/accordion.tsx.
 *
 * Height transition (progressive enhancement):
 *   Uses `interpolate-size: allow-keywords` + CSS `::details-content`
 *   pseudo-element transition (Chrome 131+). Open/close timing references
 *   semantic easing tokens declared in global.css (.zfb-accordion rules).
 *   Older browsers get instant open/close — acceptable for a demo.
 *
 *   Open  → easing-tab-open  (--zfb-easing-tab-open)
 *   Close → easing-tab-close (--zfb-easing-tab-close)
 *
 * Unlike the zfb-tailwind version, the accordion transition rules live in
 * global.css under .zfb-accordion — no scoped <style> block needed.
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
    body: 'The panel writes :root overrides directly into the page via a <style> tag, so every CSS selector that references a --zfb-* var picks up the new value before the next paint — no rebuild required.',
  },
  {
    id: 'a3',
    summary: 'Which easing tokens does this accordion use?',
    body: 'The open transition uses easing-tab-open and the close transition uses easing-tab-close. Change either in the Easing tab of the panel to see the effect here.',
  },
] as const;

export function AccordionDemo() {
  return (
    <div class="zfb-field-group">
      {ITEMS.map((item) => (
        <details key={item.id} class="zfb-accordion">
          <summary class="zfb-accordion__summary">
            <span>{item.summary}</span>
            <span class="zfb-muted-text" aria-hidden="true" style={{ userSelect: 'none' }}>▾</span>
          </summary>
          <div class="zfb-accordion__content">
            <p>{item.body}</p>
            <p class="zfb-muted-text" style={{ marginTop: 'var(--zfb-spacing-sm)' }}>
              Open timing: <code>easing-tab-open</code> →{' '}
              <code>--zfb-easing-tab-open</code>. Close timing:{' '}
              <code>easing-tab-close</code> →{' '}
              <code>--zfb-easing-tab-close</code>.
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
