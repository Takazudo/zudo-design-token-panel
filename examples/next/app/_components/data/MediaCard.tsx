/**
 * MediaCard — card with image placeholder, title, description, CTA.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-media-card           → surface container with flex-col gap
 *   .nx-media-card__thumb    → 16:9 aspect ratio image placeholder
 *   .nx-media-card__thumb-fill → gradient placeholder (no network fetch)
 *   .nx-media-card__title    → section-title sized heading
 *   .nx-media-card__body     → body text with relaxed line-height
 *   .nx-button.is-accent     → CTA button
 */

export default function MediaCard() {
  return (
    <div className="nx-media-card">
      <div className="nx-media-card__thumb">
        {/* reason: image aspect is a media constant, not a token — CSS gradient placeholder; no network fetch */}
        <div className="nx-media-card__thumb-fill" aria-hidden="true" />
      </div>
      <div className="nx-media-card__title">Intro to Design Tokens</div>
      <div className="nx-media-card__body">
        Design tokens are the smallest atomic values in a design system —
        spacing, colour, typography — stored as CSS custom properties and
        shared across every component.
      </div>
      <div>
        <button type="button" className="nx-button is-accent">
          Learn more
        </button>
      </div>
    </div>
  );
}
