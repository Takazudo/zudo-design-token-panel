/**
 * AccordionDemo — 3 expandable sections using native <details>/<summary>.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-accordion            → bordered/rounded details container
 *   .nx-accordion__summary   → styled summary row (flex row, bg-surface)
 *   .nx-accordion__summary-icon → muted chevron icon
 *   .nx-accordion__content   → body area with top border separator
 *
 * Height transition (progressive enhancement):
 *   Uses `interpolate-size: allow-keywords` + CSS `::details-content`
 *   pseudo-element transition (Chrome 131+). Open/close timing references
 *   semantic easing tokens via a scoped <style> block.
 *   Older browsers get instant open/close — acceptable for a demo.
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
    body: 'The panel writes :root overrides directly into the page via a <style> tag, so every component that references a --nx-* var picks up the new value before the next paint — no rebuild required.',
  },
  {
    id: 'a3',
    summary: 'Which easing tokens does this accordion use?',
    body: 'The open transition uses easing-tab-open and the close transition uses easing-tab-close. Change either in the Easing tab of the panel to see the effect here.',
  },
] as const;

export default function AccordionDemo() {
  return (
    <div>
      {/*
        Scoped transition rules for accordion open/close.
        reason: ::details-content pseudo-element requires a stylesheet rule;
        inline style cannot target pseudo-elements
      */}
      <style>{`
        .nx-accordion {
          interpolate-size: allow-keywords;
        }
        .nx-accordion::details-content {
          transition: height 0.3s var(--nx-easing-tab-open),
                      opacity 0.3s var(--nx-easing-tab-open);
          overflow: hidden;
        }
        .nx-accordion:not([open])::details-content {
          transition: height 0.3s var(--nx-easing-tab-close),
                      opacity 0.3s var(--nx-easing-tab-close);
        }
      `}</style>

      {ITEMS.map((item) => (
        <details key={item.id} className="nx-accordion">
          <summary className="nx-accordion__summary">
            <span>{item.summary}</span>
            <span className="nx-accordion__summary-icon" aria-hidden="true">&#9660;</span>
          </summary>
          <div className="nx-accordion__content">
            <div>{item.body}</div>
            <div className="nx-helper" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
              Open timing: <code>easing-tab-open</code> &#8594;{' '}
              <code>--nx-easing-tab-open</code>. Close timing:{' '}
              <code>easing-tab-close</code> &#8594;{' '}
              <code>--nx-easing-tab-close</code>.
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
