/**
 * MediaCard — card with image placeholder, title, description, CTA.
 *
 * Token consumption:
 *   .vr-media-card        → bg-surface, border, radius, flex-col, gap, max-w
 *   .vr-media-card__image → aspect-ratio 16/9, bg-muted, radius, overflow-hidden
 *   .vr-section-title     → card title font-size
 *   .vr-body              → description text
 *   .vr-button.is-accent  → CTA button
 *
 * Image placeholder: CSS gradient from surface → muted.
 * reason: no network fetch; aspect ratio is a media constant, not a token.
 */

export function MediaCard() {
  return (
    <div className="vr-media-card">
      <div className="vr-media-card__image">
        {/* reason: gradient placeholder; no network fetch required */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--vr-radius)',
            background: 'linear-gradient(135deg, var(--vr-color-surface) 0%, var(--vr-color-muted) 100%)',
          }}
          aria-hidden="true"
        />
      </div>
      <div role="heading" aria-level={3} className="vr-section-title" style={{ margin: 0 }}>
        Intro to Design Tokens
      </div>
      <div className="vr-body">
        Design tokens are the smallest atomic values in a design system — spacing,
        colour, typography — stored as CSS custom properties and shared across every
        component.
      </div>
      <div>
        <button type="button" className="vr-button is-accent">
          Learn more
        </button>
      </div>
    </div>
  );
}
