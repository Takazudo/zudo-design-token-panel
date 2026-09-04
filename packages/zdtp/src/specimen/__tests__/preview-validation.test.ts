import { describe, expect, it } from 'vitest';
import { assertValidPanelConfig, type PanelConfig } from '../../config/panel-config';
import type { TierConfig, TierValueKind } from '../../tokens/tier-model';

function config(tier: TierConfig, extraTiers: readonly TierConfig[] = []): PanelConfig {
  return {
    storagePrefix: 'preview-validation',
    consoleNamespace: 'previewValidation',
    modalClassPrefix: 'preview-validation-modal',
    schemaId: 'preview-validation/v1',
    exportFilenameBase: 'preview-validation',
    tabs: [{ id: 'tokens', label: 'Tokens', tiers: [...extraTiers, tier] }],
  };
}

function tier(preview: TierConfig['preview'], type: TierValueKind): TierConfig {
  return {
    id: 'subject',
    label: 'Subject',
    preview,
    items: [{ id: 'item', cssVar: '--item', label: 'Item', default: '1', type }],
  };
}

describe('TierConfig.preview validation matrix', () => {
  it.each([
    ['size', { kind: 'length', step: 1, unit: 'px' }],
    ['line-height', { kind: 'number', step: 0.1 }],
    ['family', { kind: 'text' }],
    ['weight', { kind: 'select', options: ['400', '700'] }],
    ['weight', { kind: 'number', step: 100 }],
    ['bar', { kind: 'length', step: 1, unit: 'px' }],
    ['radius', { kind: 'length', step: 1, unit: 'px' }],
    ['duration', { kind: 'length', step: 10, unit: 'ms' }],
    ['duration', { kind: 'number', step: 0.1, unit: 's' }],
  ] as const)('accepts %s with its compatible kind', (preview, type) => {
    expect(() => assertValidPanelConfig(config(tier(preview, type)))).not.toThrow();
  });

  it.each([
    ['size', { kind: 'number', step: 1 }],
    ['line-height', { kind: 'length', step: 1, unit: 'px' }],
    ['family', { kind: 'select', options: ['sans'] }],
    ['weight', { kind: 'text' }],
    ['bar', { kind: 'number', step: 1 }],
    ['radius', { kind: 'number', step: 1 }],
    ['duration', { kind: 'length', step: 1, unit: 'px' }],
  ] as const)('rejects %s with an incompatible kind/unit', (preview, type) => {
    expect(() => assertValidPanelConfig(config(tier(preview, type)))).toThrow(/\.preview/);
  });

  it('accepts size on a reference tier resolving to length', () => {
    const scale = tier(undefined, { kind: 'length', step: 1, unit: 'px' });
    scale.id = 'scale';
    const reference = tier('size', { kind: 'text' });
    reference.referencesTier = 'scale';
    reference.items = [{ ...reference.items[0], id: 'role-item', cssVar: '--role-item', default: 'item' }];
    expect(() => assertValidPanelConfig(config(reference, [scale]))).not.toThrow();
  });

  it('rejects unsupported previews and previewBase outside line-height', () => {
    const invalid = tier('size', { kind: 'length', step: 1, unit: 'px' });
    invalid.previewBase = '--base';
    expect(() => assertValidPanelConfig(config(invalid))).toThrow(/previewBase is only valid/);
    expect(() => assertValidPanelConfig(config({ ...invalid, previewBase: undefined, preview: 'shadow' as never }))).toThrow(/unsupported value/);
  });
});
