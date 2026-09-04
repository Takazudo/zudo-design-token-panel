import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetArmingCoordinatorForTests,
  ELEMENT_INSPECT_PICKER_FEATURE_ID,
  getCurrentArmingOwnerForTests,
  registerArmingOwner,
  requestArming,
} from '../arming-coordinator';

afterEach(() => {
  __resetArmingCoordinatorForTests();
});

describe('arming coordinator', () => {
  it('lets element-path take over from a stub owner and revokes the stub', () => {
    const stubRevoked = vi.fn();
    const elementPathRevoked = vi.fn();

    registerArmingOwner('stub-feature', { onArmingRevoked: stubRevoked });
    registerArmingOwner('element-path', { onArmingRevoked: elementPathRevoked });

    requestArming('stub-feature');
    expect(getCurrentArmingOwnerForTests()).toBe('stub-feature');

    requestArming('element-path');

    expect(getCurrentArmingOwnerForTests()).toBe('element-path');
    expect(stubRevoked).toHaveBeenCalledTimes(1);
    expect(elementPathRevoked).not.toHaveBeenCalled();
  });

  it('lets a stub owner take over from element-path and revokes element-path', () => {
    const stubRevoked = vi.fn();
    const elementPathRevoked = vi.fn();

    registerArmingOwner('element-path', { onArmingRevoked: elementPathRevoked });
    registerArmingOwner('stub-feature', { onArmingRevoked: stubRevoked });

    requestArming('element-path');
    expect(getCurrentArmingOwnerForTests()).toBe('element-path');

    requestArming('stub-feature');

    expect(getCurrentArmingOwnerForTests()).toBe('stub-feature');
    expect(elementPathRevoked).toHaveBeenCalledTimes(1);
    expect(stubRevoked).not.toHaveBeenCalled();
  });

  it('gives the registered element-inspect owner exclusive arming', () => {
    const previousRevoked = vi.fn();
    const inspectRevoked = vi.fn();
    registerArmingOwner('element-path', { onArmingRevoked: previousRevoked });
    registerArmingOwner(ELEMENT_INSPECT_PICKER_FEATURE_ID, {
      onArmingRevoked: inspectRevoked,
    });
    requestArming('element-path');

    requestArming(ELEMENT_INSPECT_PICKER_FEATURE_ID);

    expect(getCurrentArmingOwnerForTests()).toBe(ELEMENT_INSPECT_PICKER_FEATURE_ID);
    expect(previousRevoked).toHaveBeenCalledOnce();
    expect(inspectRevoked).not.toHaveBeenCalled();
  });
});
