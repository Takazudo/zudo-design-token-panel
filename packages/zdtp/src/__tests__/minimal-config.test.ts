import { describe, expect, it } from 'vitest';
import { assertValidPanelConfig } from '@takazudo/zdtp';
import { panelConfig } from '../../../../demos/cssmodules/config/panel-config';

describe('css modules demo configuration', () => {
  it('accepts grouped palette ramps and cross-tab semantic colors through the public validator', () => {
    expect(() => assertValidPanelConfig(panelConfig)).not.toThrow();
  });
});
