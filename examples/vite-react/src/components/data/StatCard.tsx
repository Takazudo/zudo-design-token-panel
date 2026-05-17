/**
 * StatCard — metric display with a prominent large number.
 *
 * Token consumption:
 *   .vr-stat-card         → bg-surface, border, radius, flex-col, gap, padding
 *   .vr-stat-card__value  → text-page-title, color-primary (semantic font token)
 *   .vr-stat-card__label  → text-helper, color-muted
 */

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="vr-stat-card">
      <span className="vr-stat-card__value">{value}</span>
      <span className="vr-stat-card__label">{label}</span>
    </div>
  );
}
