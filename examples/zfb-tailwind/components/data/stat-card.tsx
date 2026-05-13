/**
 * StatCard — metric display with a prominent large number.
 *
 * Token consumption (§134.3):
 *   container:  bg-surface p-spacing-md rounded-md border border-muted flex flex-col gap-spacing-xs
 *   big number: text-h2 text-primary  (semantic font token — no hardcoded font-size)
 *   label:      text-small text-muted
 */

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div class="bg-surface p-spacing-md rounded-md border border-muted flex flex-col gap-spacing-xs">
      <span class="text-h2 text-primary">{value}</span>
      <span class="text-small text-muted">{label}</span>
    </div>
  );
}
