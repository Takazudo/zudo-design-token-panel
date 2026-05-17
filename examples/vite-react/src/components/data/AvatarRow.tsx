/**
 * AvatarRow — 4 small avatars using size-avatar-sm, each with a palette background.
 *
 * Token consumption:
 *   .vr-avatar-row       → flex container, gap-hsp-sm
 *   .vr-avatar.is-sm     → width/height: --vr-size-avatar-sm
 *   inline style bg      → var(--vr-palette-N) (reason: dynamic var name from
 *                          loop index — no static class can express N)
 *
 * Resizing: avatars read from --vr-size-avatar-sm, so tweaking that token
 * in the panel resizes every avatar in this row.
 */

// Palette indices 1–4 for distinct palette slots
const AVATAR_PALETTE_INDICES = [1, 2, 3, 4] as const;

export function AvatarRow() {
  return (
    <div className="vr-avatar-row" role="list" aria-label="Avatar row">
      {AVATAR_PALETTE_INDICES.map((i) => (
        <div
          key={i}
          role="listitem"
          className="vr-avatar is-sm"
          // reason: dynamic var name from loop index — no static class possible
          style={{ background: `var(--vr-palette-${i})` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
