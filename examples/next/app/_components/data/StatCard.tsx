/**
 * StatCard — metric display with a prominent large number.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-stat-card         → surface container, flex-col with gap
 *   .nx-stat-card__value  → page-title sized, primary color
 *   .nx-stat-card__label  → helper-sized muted label
 */

interface StatCardProps {
  value: string;
  label: string;
}

export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="nx-stat-card">
      <span className="nx-stat-card__value">{value}</span>
      <span className="nx-stat-card__label">{label}</span>
    </div>
  );
}
