/**
 * MediaCard — card with image placeholder, title, description, CTA.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/media-card.tsx.
 *
 * Token consumption (via .zfbexample-media-card* classes in global.css):
 *   .zfbexample-media-card       → color-surface, spacing-md, radius, color-muted (border), spacing-sm (gap)
 *   .zfbexample-media-card__image → color-muted (placeholder), radius; aspect-ratio: 16/9 literal (reason: media constant)
 *   .zfbexample-media-card__title → text-h3, fg
 *   .zfbexample-media-card__desc  → text-body, fg
 *   .zfbexample-media-card__cta   → color-accent (bg), bg (text), spacing-sm, radius
 */

export function MediaCard() {
  return (
    <div class="zfbexample-media-card">
      <div class="zfbexample-media-card__image">
        {/* reason: image aspect is a media constant, not a token — CSS gradient placeholder; no network fetch */}
        <div
          class="zfbexample-media-card__image-inner"
          style="background: linear-gradient(135deg, var(--zfbexample-color-surface) 0%, var(--zfbexample-color-muted) 100%);"
          aria-hidden="true"
        />
      </div>
      <h3 class="zfbexample-media-card__title">Intro to Design Tokens</h3>
      <p class="zfbexample-media-card__desc">
        Design tokens are the smallest atomic values in a design system — spacing,
        colour, typography — stored as CSS custom properties and shared across every
        component.
      </p>
      <button type="button" class="zfbexample-media-card__cta">
        Learn more
      </button>
    </div>
  );
}
