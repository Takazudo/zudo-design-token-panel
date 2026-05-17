/**
 * AvatarRow — 4 small avatars using nx-avatar-sm, each with a palette background.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-avatar-row  → flex row with gap from --nx-hsp-sm
 *   .nx-avatar-sm   → w/h from --nx-size-avatar-sm, rounded corners
 *   background      → set via inline style to var(--nx-palette-{i})
 *                     (reason: dynamic var name from loop index —
 *                     no static class can express a runtime palette index)
 */

// Palette indices 1–4
const AVATAR_PALETTE_INDICES = [1, 2, 3, 4] as const;

export default function AvatarRow() {
  return (
    <div className="nx-avatar-row" role="list" aria-label="Avatar row">
      {AVATAR_PALETTE_INDICES.map((i) => (
        <div
          key={i}
          role="listitem"
          className="nx-avatar-sm"
          // reason: dynamic var name from loop index — no static utility possible
          style={{ background: `var(--nx-palette-${i})` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
