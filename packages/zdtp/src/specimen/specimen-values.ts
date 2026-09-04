import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';

export interface ResolvedPreviewLength {
  value: string;
  px: number | null;
}

function rootFontSize(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 16;
  const parsed = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(parsed) ? parsed : 16;
}

export function lengthToPx(value: string): number | null {
  const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em)$/i);
  if (!match) return null;
  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  return match[2].toLowerCase() === 'px' ? magnitude : magnitude * rootFontSize();
}

export function resolvePreviewValue(
  tab: TabConfig,
  tier: TierConfig,
  item: TierItem,
  valueFor: (item: TierItem) => string,
): string {
  if (!tier.referencesTier) return valueFor(item);
  const targetTier = tab.tiers.find((candidate) => candidate.id === tier.referencesTier);
  if (!targetTier) return item.default;
  const targetId = valueFor(item);
  const target = targetTier.items.find((candidate) => candidate.id === targetId)
    ?? targetTier.items.find((candidate) => candidate.id === item.default)
    ?? targetTier.items.find((candidate) => candidate.id === item.id)
    ?? targetTier.items[0];
  return target ? valueFor(target) : item.default;
}

export function resolvePreviewLength(
  tab: TabConfig,
  tier: TierConfig,
  item: TierItem,
  valueFor: (item: TierItem) => string,
): ResolvedPreviewLength {
  const value = resolvePreviewValue(tab, tier, item, valueFor);
  return { value, px: lengthToPx(value) };
}

export function findLineHeightBasePx(
  tab: TabConfig,
  tier: TierConfig,
  valueFor: (item: TierItem) => string,
): number {
  if (tier.previewBase) {
    for (const candidateTier of tab.tiers) {
      const candidate = candidateTier.items.find((item) => item.cssVar === tier.previewBase);
      if (!candidate) continue;
      const px = resolvePreviewLength(tab, candidateTier, candidate, valueFor).px;
      if (px !== null) return px;
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const computed = window.getComputedStyle(document.documentElement).getPropertyValue(tier.previewBase);
      const px = lengthToPx(computed);
      if (px !== null) return px;
    }
  }
  const sizeTier = tab.tiers.find((candidate) => candidate.preview === 'size');
  if (!sizeTier) return 16;
  const candidates = sizeTier.items
    .map((item, index) => ({ index, px: resolvePreviewLength(tab, sizeTier, item, valueFor).px }))
    .filter((candidate): candidate is { index: number; px: number } => candidate.px !== null)
    .sort((a, b) => Math.abs(a.px - 16) - Math.abs(b.px - 16) || a.index - b.index);
  return candidates[0]?.px ?? 16;
}
