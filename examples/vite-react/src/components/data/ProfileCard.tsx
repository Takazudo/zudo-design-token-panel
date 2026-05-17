/**
 * ProfileCard — avatar + name + role + action button.
 *
 * Token consumption:
 *   .vr-profile-card         → flex-row, gap, bg-surface, border, radius, padding
 *   .vr-profile-card__avatar → size-avatar-md, radius, bg-accent, flex-shrink-0
 *   .vr-profile-card__info   → flex-col, gap, flex-1
 *   .vr-profile-card__name   → text-subsection-title, fg
 *   .vr-profile-card__role   → text-helper, muted
 *   .vr-button.is-accent     → follow button
 */

interface ProfileCardProps {
  name: string;
  role: string;
}

export function ProfileCard({ name, role }: ProfileCardProps) {
  return (
    <div className="vr-profile-card">
      <div
        className="vr-profile-card__avatar"
        aria-hidden="true"
      />
      <div className="vr-profile-card__info">
        <span className="vr-profile-card__name">{name}</span>
        <span className="vr-profile-card__role">{role}</span>
      </div>
      <button type="button" className="vr-button is-accent" style={{ flexShrink: 0 }}>
        Follow
      </button>
    </div>
  );
}
