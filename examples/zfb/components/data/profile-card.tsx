/**
 * ProfileCard — avatar + name + role + action button.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/profile-card.tsx.
 *
 * Token consumption (via .zfbexample-profile-card* classes in global.css):
 *   .zfbexample-profile-card         → spacing-md (gap + padding), color-surface, radius, color-muted (border)
 *   .zfbexample-profile-card__avatar → size-avatar-md (w/h), radius, color-accent (bg placeholder)
 *   .zfbexample-profile-card__name   → text-h4, fg
 *   .zfbexample-profile-card__role   → text-small, color-muted
 *   .zfbexample-profile-card__action → color-accent (bg), bg (text), spacing-sm, radius
 */

interface ProfileCardProps {
  name: string;
  role: string;
}

export function ProfileCard({ name, role }: ProfileCardProps) {
  return (
    <div class="zfbexample-profile-card">
      <div class="zfbexample-profile-card__avatar" aria-hidden="true" />
      <div class="zfbexample-profile-card__info">
        <span class="zfbexample-profile-card__name">{name}</span>
        <span class="zfbexample-profile-card__role">{role}</span>
      </div>
      <button type="button" class="zfbexample-profile-card__action">
        Follow
      </button>
    </div>
  );
}
