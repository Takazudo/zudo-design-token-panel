/**
 * StatCard — metric display with a prominent large number.
 *
 * Plain CSS mirror of zfb-tailwind/components/data/stat-card.tsx.
 *
 * Token consumption (via .zfb-stat-card* classes in global.css):
 *   .zfb-stat-card         → color-surface, spacing-md, radius, color-muted (border), spacing-xs (gap)
 *   .zfb-stat-card__value  → text-h2, color-primary (no hardcoded font-size)
 *   .zfb-stat-card__label  → text-small, color-muted
 */

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div class="zfb-stat-card">
      <span class="zfb-stat-card__value">{value}</span>
      <span class="zfb-stat-card__label">{label}</span>
    </div>
  );
}
