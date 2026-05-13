/**
 * ProfileCard — avatar + name + role + action button.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/profile-card.tsx.
 *
 * Token consumption (via .zfb-profile-card* classes in global.css):
 *   .zfb-profile-card         → spacing-md (gap + padding), color-surface, radius, color-muted (border)
 *   .zfb-profile-card__avatar → size-avatar-md (w/h), radius, color-accent (bg placeholder)
 *   .zfb-profile-card__name   → text-h4, fg
 *   .zfb-profile-card__role   → text-small, color-muted
 *   .zfb-profile-card__action → color-accent (bg), bg (text), spacing-sm, radius
 */

interface ProfileCardProps {
  name: string;
  role: string;
}

export function ProfileCard({ name, role }: ProfileCardProps) {
  return (
    <div class="zfb-profile-card">
      <div class="zfb-profile-card__avatar" aria-hidden="true" />
      <div class="zfb-profile-card__info">
        <span class="zfb-profile-card__name">{name}</span>
        <span class="zfb-profile-card__role">{role}</span>
      </div>
      <button type="button" class="zfb-profile-card__action">
        Follow
      </button>
    </div>
  );
}
