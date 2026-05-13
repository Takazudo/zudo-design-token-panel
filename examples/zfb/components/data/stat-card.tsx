/**
 * StatCard — metric display with a prominent large number.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/stat-card.tsx.
 *
 * Token consumption (via .zfbexample-stat-card* classes in global.css):
 *   .zfbexample-stat-card         → color-surface, spacing-md, radius, color-muted (border), spacing-xs (gap)
 *   .zfbexample-stat-card__value  → text-h2, color-primary (no hardcoded font-size)
 *   .zfbexample-stat-card__label  → text-small, color-muted
 */

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div class="zfbexample-stat-card">
      <span class="zfbexample-stat-card__value">{value}</span>
      <span class="zfbexample-stat-card__label">{label}</span>
    </div>
  );
}
