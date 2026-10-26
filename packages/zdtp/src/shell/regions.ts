import { computed, getScope, signal, type Child, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { ActionsMenuAction } from '../controls/actions-menu-popover';
import { read, type MaybeSignal } from '../zr/live';

export type ShellRegion = 'header-actions' | 'header-right' | 'tabbar-extras' | 'footer';

export interface ShellRegionRenderContext {
  compact: boolean;
  closeCompactMenu: () => void;
}

export interface ShellRegionItem {
  id: string;
  order?: number;
  /** Rendered once per mount of the region; read signals inside for live values. */
  render: (context: ShellRegionRenderContext) => Child;
  compactAction?: ActionsMenuAction;
  renderInCompactMenu?: boolean;
}

export type RegionItems = Record<ShellRegion, readonly ShellRegionItem[]>;

export interface ShellRegions {
  items: ReadonlySignal<RegionItems>;
  register(region: ShellRegion, item: ShellRegionItem): () => void;
}

const EMPTY_ITEMS: RegionItems = {
  'header-actions': [],
  'header-right': [],
  'tabbar-extras': [],
  footer: [],
};

const REGIONS: readonly ShellRegion[] = ['header-actions', 'header-right', 'tabbar-extras', 'footer'];

function sortItems(items: readonly ShellRegionItem[]): readonly ShellRegionItem[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * The shell's region registry. `initialItems` are the panel's own items; a
 * registered item with the same id replaces one of them.
 */
export function createShellRegions(
  initialItems: MaybeSignal<Partial<RegionItems>> = EMPTY_ITEMS,
): ShellRegions {
  const registered = signal<RegionItems>(EMPTY_ITEMS);
  const items = computed((): RegionItems => {
    const base = read(initialItems);
    const current = registered.value;
    const out = {} as Record<ShellRegion, readonly ShellRegionItem[]>;
    for (const region of REGIONS) {
      const registeredIds = new Set(current[region].map((item) => item.id));
      out[region] = sortItems([
        ...(base[region] ?? []).filter((item) => !registeredIds.has(item.id)),
        ...current[region],
      ]);
    }
    return out;
  });
  return {
    items,
    register(region, item) {
      registered.value = {
        ...registered.value,
        [region]: [...registered.value[region].filter((candidate) => candidate.id !== item.id), item],
      };
      return () => {
        registered.value = {
          ...registered.value,
          [region]: registered.value[region].filter((candidate) => candidate !== item),
        };
      };
    },
  };
}

/** Register `item` in `region` for the calling component's lifetime. */
export function useRegisterRegionItem(
  regions: ShellRegions,
  region: ShellRegion,
  item: ShellRegionItem,
): void {
  getScope().onActivate(() => regions.register(region, item));
}
