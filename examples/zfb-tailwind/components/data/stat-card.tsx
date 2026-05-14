/**
 * StatCard — metric display with a prominent large number.
 *
 * Token consumption (§134.3):
 *   container:  bg-surface px-hsp-md py-vsp-md rounded-md border border-muted flex flex-col gap-vsp-xs
 *   big number: text-page-title text-primary  (semantic font token — no hardcoded font-size)
 *   label:      text-helper text-muted
 */

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div class="bg-surface px-hsp-md py-vsp-md rounded-md border border-muted flex flex-col gap-vsp-xs">
      <span class="text-page-title text-primary">{value}</span>
      <span class="text-helper text-muted">{label}</span>
    </div>
  );
}
