/**
 * Back-compat shim: lift legacy PanelConfig (tokens + colorCluster) onto TabConfig[].
 *
 * Hosts that supply `tabs` directly on PanelConfig bypass this module entirely.
 * This shim is called lazily by getPanelConfig() only when `tabs` is absent.
 *
 * Mapping rules:
 *  - tokens.spacing  → tab 'spacing', tier 'raw' of kind: 'length' items
 *  - tokens.typography → tab 'font', tier 'raw' (non-advanced) + tier 'scale'
 *    (advanced === true items); 'scale' listed in advancedTiers
 *  - tokens.size     → tab 'size', tier 'raw', pill preserved
 *  - tokens.color + colorCluster → tab 'color', tier 'palette' (kind: 'color')
 *    + tier 'semantic' (referencesTier: 'palette'); colorExtras carries the
 *    full cluster config for Wave 7 wiring
 */

import type { TokenDef, TokenManifest } from '../tokens/manifest';
import type { ColorClusterDataConfig } from './cluster-config';
import type { PanelConfig } from './panel-config';
import type { TabConfig, TierConfig, TierItem, TierValueKind, PillSpec } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function tokenDefToKind(t: TokenDef): TierValueKind {
  if (t.control === 'text') return { kind: 'text' };
  if (t.control === 'select') {
    return { kind: 'select', options: t.options ?? [] };
  }
  // Default: slider → length kind
  return { kind: 'length', min: t.min, max: t.max, step: t.step, unit: t.unit };
}

function tokenDefToTierItem(t: TokenDef): TierItem {
  const base: TierItem = {
    id: t.id,
    cssVar: t.cssVar,
    label: t.label,
    default: t.default,
    type: tokenDefToKind(t),
    ...(t.group !== undefined ? { group: t.group } : {}),
    ...(t.readonly ? { readonly: true as const } : {}),
  };
  if (t.pill) {
    const pill: PillSpec = { value: t.pill.value, customDefault: t.pill.customDefault };
    return { ...base, pill };
  }
  return base;
}

// ---------------------------------------------------------------------------
// Per-tab lift functions
// ---------------------------------------------------------------------------

function liftSpacingTab(manifest: TokenManifest): TabConfig {
  const items: TierItem[] = manifest.spacing.map(tokenDefToTierItem);
  const rawTier: TierConfig = { id: 'raw', label: 'Spacing', items };
  return {
    id: 'spacing',
    label: 'Spacing',
    tiers: [rawTier],
    ...(manifest.spacingGroupOrder !== undefined
      ? { spacingGroupOrder: manifest.spacingGroupOrder }
      : {}),
    ...(manifest.groupTitles !== undefined ? { groupTitles: manifest.groupTitles } : {}),
  } as TabConfig;
}

function liftFontTab(manifest: TokenManifest): TabConfig {
  const regular: TokenDef[] = [];
  const advanced: TokenDef[] = [];
  for (const t of manifest.typography) {
    if (t.advanced) {
      advanced.push(t);
    } else {
      regular.push(t);
    }
  }

  const tiers: TierConfig[] = [
    { id: 'raw', label: 'Typography', items: regular.map(tokenDefToTierItem) },
  ];

  const advancedTiers: string[] = [];
  if (advanced.length > 0) {
    tiers.push({ id: 'scale', label: 'Scale', items: advanced.map(tokenDefToTierItem) });
    advancedTiers.push('scale');
  }

  return {
    id: 'font',
    label: 'Font',
    tiers,
    ...(advancedTiers.length > 0 ? { advancedTiers } : {}),
    ...(manifest.fontGroupOrder !== undefined ? { fontGroupOrder: manifest.fontGroupOrder } : {}),
    ...(manifest.groupTitles !== undefined ? { groupTitles: manifest.groupTitles } : {}),
  } as TabConfig;
}

function liftSizeTab(manifest: TokenManifest): TabConfig {
  const items: TierItem[] = manifest.size.map(tokenDefToTierItem);
  const rawTier: TierConfig = { id: 'raw', label: 'Size', items };
  return {
    id: 'size',
    label: 'Size',
    tiers: [rawTier],
    ...(manifest.sizeGroupOrder !== undefined ? { sizeGroupOrder: manifest.sizeGroupOrder } : {}),
    ...(manifest.groupTitles !== undefined ? { groupTitles: manifest.groupTitles } : {}),
  } as TabConfig;
}

function liftColorTab(
  manifest: TokenManifest,
  colorCluster: ColorClusterDataConfig,
  secondaryColorCluster?: ColorClusterDataConfig | null,
): TabConfig {
  // Palette items from colorCluster — one TierItem per palette slot
  const paletteItems: TierItem[] = Array.from({ length: colorCluster.paletteSize }, (_, i) => {
    const cssVar = colorCluster.paletteCssVarTemplate.replace('{n}', String(i));
    return {
      id: `palette-${i}`,
      cssVar,
      label: `Palette ${i}`,
      default: '',
      type: { kind: 'color' as const },
    };
  });

  // Per-token color rows from the manifest (cluster-less hosts)
  const colorTokenItems: TierItem[] = manifest.color.map(tokenDefToTierItem);

  const paletteTier: TierConfig = {
    id: 'palette',
    label: 'Palette',
    items: [...paletteItems, ...colorTokenItems],
  };

  // Semantic items — each references a palette slot (referencesTier: 'palette')
  const semanticItems: TierItem[] = Object.keys(colorCluster.semanticCssNames).map((name) => ({
    id: `semantic-${name}`,
    cssVar: colorCluster.semanticCssNames[name],
    label: name,
    default: String(colorCluster.semanticDefaults[name] ?? 0),
    type: { kind: 'color' as const },
  }));

  const semanticTier: TierConfig = {
    id: 'semantic',
    label: 'Semantic',
    items: semanticItems,
    // semantic items reference the palette tier
    referencesTier: 'palette',
  };

  return {
    id: 'color',
    label: 'Color',
    tiers: [paletteTier, semanticTier],
    colorExtras: {
      ...colorCluster,
      ...(secondaryColorCluster !== undefined && secondaryColorCluster !== null
        ? { _secondaryCluster: secondaryColorCluster }
        : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synthesise a TabConfig[] from a legacy PanelConfig.
 *
 * Called lazily from getPanelConfig() when the host has not supplied tabs
 * directly. Legacy hosts see no change — they get the same token data
 * surfaced through the new shape.
 */
export function liftLegacyConfigToTabs(panelConfig: PanelConfig): TabConfig[] {
  const { tokens, colorCluster, secondaryColorCluster } = panelConfig;
  return [
    liftSpacingTab(tokens),
    liftFontTab(tokens),
    liftSizeTab(tokens),
    liftColorTab(tokens, colorCluster, secondaryColorCluster),
  ];
}
