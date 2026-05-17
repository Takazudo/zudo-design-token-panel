/**
 * ProfileCard — avatar + name + role + action button.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-profile-card          → flex row container with border and surface bg
 *   .nx-profile-card__avatar  → avatar square from --nx-size-avatar-md, accent bg
 *   .nx-profile-card__info    → flex-col name/role wrapper
 *   .nx-profile-card__name    → subsection-title sized name
 *   .nx-profile-card__role    → helper-sized muted role label
 *   .nx-button.is-primary     → follow CTA
 */

interface ProfileCardProps {
  name: string;
  role: string;
}

export default function ProfileCard({ name, role }: ProfileCardProps) {
  return (
    <div className="nx-profile-card">
      <div className="nx-profile-card__avatar" aria-hidden="true" />
      <div className="nx-profile-card__info">
        <span className="nx-profile-card__name">{name}</span>
        <span className="nx-profile-card__role">{role}</span>
      </div>
      <button type="button" className="nx-button is-primary">
        Follow
      </button>
    </div>
  );
}
