/**
 * MediaCard — card with image placeholder, title, description, CTA.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/media-card.tsx.
 *
 * Token consumption (via .zfb-media-card* classes in global.css):
 *   .zfb-media-card       → color-surface, spacing-md, radius, color-muted (border), spacing-sm (gap)
 *   .zfb-media-card__image → color-muted (placeholder), radius; aspect-ratio: 16/9 literal (reason: media constant)
 *   .zfb-media-card__title → text-h3, fg
 *   .zfb-media-card__desc  → text-body, fg
 *   .zfb-media-card__cta   → color-accent (bg), bg (text), spacing-sm, radius
 */

export function MediaCard() {
  return (
    <div class="zfb-media-card">
      <div class="zfb-media-card__image">
        {/* reason: image aspect is a media constant, not a token — CSS gradient placeholder; no network fetch */}
        <div
          class="zfb-media-card__image-inner"
          style="background: linear-gradient(135deg, var(--zfb-color-surface) 0%, var(--zfb-color-muted) 100%);"
          aria-hidden="true"
        />
      </div>
      <h3 class="zfb-media-card__title">Intro to Design Tokens</h3>
      <p class="zfb-media-card__desc">
        Design tokens are the smallest atomic values in a design system — spacing,
        colour, typography — stored as CSS custom properties and shared across every
        component.
      </p>
      <button type="button" class="zfb-media-card__cta">
        Learn more
      </button>
    </div>
  );
}
