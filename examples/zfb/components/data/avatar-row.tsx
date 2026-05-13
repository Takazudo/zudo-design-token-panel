/**
 * AvatarRow — 4 small avatars using size-avatar-sm, each with a palette background.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/avatar-row.tsx.
 *
 * Token consumption (via .zfb-avatar-row* classes in global.css):
 *   .zfb-avatar-row        → flex; gap: spacing-sm
 *   .zfb-avatar-row__item  → size-avatar-sm (w/h), radius
 *                                   bg via inline-style: var(--zfb-palette-{i}) (G4 row 3)
 *
 * Resizing: avatars read from --zfb-size-avatar-sm, so tweaking that
 * token in the panel resizes every avatar in this row.
 */

// Palette indices 1–4 per §134.5
const AVATAR_PALETTE_INDICES = [1, 2, 3, 4] as const;

export function AvatarRow() {
  return (
    <div class="zfb-avatar-row" role="list" aria-label="Avatar row">
      {AVATAR_PALETTE_INDICES.map((i) => (
        <div
          key={i}
          role="listitem"
          class="zfb-avatar-row__item"
          // reason: dynamic var name from loop index — no static class possible
          style={`background: var(--zfb-palette-${i})`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
