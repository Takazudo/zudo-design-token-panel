/**
 * MediaCard — card with image placeholder, title, description, CTA.
 *
 * Token consumption (§134.2):
 *   container:  bg-surface px-hsp-md py-vsp-md rounded-md border border-muted flex flex-col
 *               gap-vsp-sm max-w-[24rem]
 *   image:      w-full aspect-[16/9] bg-muted rounded-md
 *   title:      text-section-title text-fg
 *   description:text-body text-fg
 *   cta:        bg-accent text-bg px-hsp-sm py-vsp-sm rounded-md
 */

export function MediaCard() {
  return (
    <div class="bg-surface px-hsp-md py-vsp-md rounded-md border border-muted flex flex-col gap-vsp-sm max-w-[24rem]">
      {/* reason: card width is page-local */}
      <div class="w-full aspect-[16/9] bg-muted rounded-md">
        {/* reason: image aspect is a media constant, not a token — CSS gradient placeholder; no network fetch */}
        <div
          class="w-full h-full rounded-md"
          style="background: linear-gradient(135deg, var(--zfbtw-color-surface) 0%, var(--zfbtw-color-muted) 100%);"
          aria-hidden="true"
        />
      </div>
      <h3 class="text-section-title text-fg">Intro to Design Tokens</h3>
      <p class="text-body text-fg">
        Design tokens are the smallest atomic values in a design system — spacing,
        colour, typography — stored as CSS custom properties and shared across every
        component.
      </p>
      <button type="button" class="bg-accent text-bg px-hsp-sm py-vsp-sm rounded-md cursor-pointer">
        Learn more
      </button>
    </div>
  );
}
