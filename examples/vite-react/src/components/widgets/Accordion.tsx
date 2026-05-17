/**
 * Accordion — 3 expandable sections using native <details>/<summary>.
 *
 * Token consumption:
 *   .vr-accordion            → wrapper with border, radius, interpolate-size
 *   .vr-accordion__summary   → summary row (flex, bg-surface, cursor-pointer)
 *   .vr-accordion__body      → content area (padding, border-top)
 *
 * Height transition (progressive enhancement):
 *   Uses `interpolate-size: allow-keywords` + CSS `::details-content`
 *   pseudo-element transition (Chrome 131+) defined in components.css.
 *   Open  → easing-tab-open  (--vr-easing-tab-open)
 *   Close → easing-tab-close (--vr-easing-tab-close)
 *   Older browsers get instant open/close — acceptable for a demo.
 */

const ITEMS = [
  {
    id: 'a1',
    summary: 'What is a design token?',
    body: 'A design token is a named CSS custom property (e.g. --spacing-md: 1rem) that centralises a raw value behind a semantic name, making it easy to update globally.',
    note: 'Open timing uses easing-tab-open → --vr-easing-tab-open.',
  },
  {
    id: 'a2',
    summary: 'How does the panel update tokens live?',
    body: 'The panel writes :root overrides directly into the page via a <style> tag, so every CSS rule that references a --vr-* var picks up the new value before the next paint — no rebuild required.',
    note: 'Change the Tab Open easing in the panel to see the accordion motion update.',
  },
  {
    id: 'a3',
    summary: 'Which easing tokens does this accordion use?',
    body: 'The open transition uses easing-tab-open and the close transition uses easing-tab-close. Change either in the Easing tab of the panel to see the effect here.',
    note: 'Close timing uses easing-tab-close → --vr-easing-tab-close.',
  },
] as const;

export function Accordion() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {ITEMS.map((item) => (
        <details key={item.id} className="vr-accordion">
          <summary className="vr-accordion__summary">
            <span>{item.summary}</span>
            <span className="vr-helper" style={{ userSelect: 'none' }}>▾</span>
          </summary>
          <div className="vr-accordion__body">
            <div className="vr-body">{item.body}</div>
            <div className="vr-helper">{item.note}</div>
          </div>
        </details>
      ))}
    </div>
  );
}
