/**
 * ProfileCard — avatar + name + role + action button.
 *
 * Token consumption (§134.4):
 *   container: flex items-center gap-hsp-md px-hsp-md py-vsp-md bg-surface rounded-md border border-muted
 *   avatar:    w-size-avatar-md h-size-avatar-md rounded-md bg-accent
 *   name:      text-subsection-title text-fg
 *   role:      text-helper text-muted
 *   action:    bg-accent text-bg px-hsp-sm py-vsp-sm rounded-md
 */

interface ProfileCardProps {
  name: string;
  role: string;
}

export function ProfileCard({ name, role }: ProfileCardProps) {
  return (
    <div class="flex items-center gap-hsp-md px-hsp-md py-vsp-md bg-surface rounded-md border border-muted">
      <div
        class="w-size-avatar-md h-size-avatar-md rounded-md bg-accent flex-shrink-0"
        aria-hidden="true"
      />
      <div class="flex flex-col gap-vsp-xs flex-1">
        <span class="text-subsection-title text-fg">{name}</span>
        <span class="text-helper text-muted">{role}</span>
      </div>
      <button type="button" class="bg-accent text-bg px-hsp-sm py-vsp-sm rounded-md cursor-pointer flex-shrink-0">
        Follow
      </button>
    </div>
  );
}
