import { computed, getScope, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from '../zr/live';

export interface LayerActivity {
  /** True while any registered layer (modal, popover, palette) is open. */
  active: ReadonlySignal<boolean>;
  setLayerActive(id: string, active: boolean): void;
}

export function createLayerActivity(): LayerActivity {
  // `current` mirrors the signal so callers inside an effect do not track it.
  let current: ReadonlySet<string> = new Set();
  const layers = signal(current);
  return {
    active: computed(() => layers.value.size > 0),
    setLayerActive(id, active) {
      if (current.has(id) === active) return;
      const next = new Set(current);
      if (active) next.add(id);
      else next.delete(id);
      current = next;
      layers.value = next;
    },
  };
}

/** Mark layer `id` active while `active` holds, for the calling component's lifetime. */
export function useLayerRegistration(
  layers: Pick<LayerActivity, 'setLayerActive'>,
  id: string,
  active: MaybeSignal<boolean>,
): void {
  getScope().effect(() => {
    if (!read(active)) return;
    layers.setLayerActive(id, true);
    return () => layers.setLayerActive(id, false);
  });
}
