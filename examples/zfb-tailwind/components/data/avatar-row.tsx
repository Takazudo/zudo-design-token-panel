/**
 * AvatarRow — 4 small avatars using size-avatar-sm, each with a palette background.
 *
 * Token consumption (§134.5):
 *   container: flex gap-hsp-sm
 *   each item: w-size-avatar-sm h-size-avatar-sm rounded-md
 *              bg via inline-style: var(--zfbtw-palette-{i})
 *
 * Resizing: avatars read from --zfbtw-size-avatar-sm, so
 * tweaking that token in the panel resizes every avatar in this row.
 */

// Palette indices 1–4 per §134.5
const AVATAR_PALETTE_INDICES = [1, 2, 3, 4] as const;

export function AvatarRow() {
  return (
    <div class="flex gap-hsp-sm" role="list" aria-label="Avatar row">
      {AVATAR_PALETTE_INDICES.map((i) => (
        <div
          key={i}
          role="listitem"
          class="w-size-avatar-sm h-size-avatar-sm rounded-md"
          // reason: dynamic var name from loop index — no static utility possible
          style={`background: var(--zfbtw-palette-${i})`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
