import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/compat';
import type { ComponentChildren } from 'preact';
import type { ActionsMenuAction } from '../controls/actions-menu-popover';

export type ShellRegion = 'header-actions' | 'header-right' | 'tabbar-extras' | 'footer';

export interface ShellRegionRenderContext {
  compact: boolean;
  closeCompactMenu: () => void;
}

export interface ShellRegionItem {
  id: string;
  order?: number;
  render: (context: ShellRegionRenderContext) => ComponentChildren;
  compactAction?: ActionsMenuAction;
  renderInCompactMenu?: boolean;
}

type RegionItems = Record<ShellRegion, readonly ShellRegionItem[]>;

interface ShellRegionsValue {
  items: RegionItems;
  registerRegionItem: (region: ShellRegion, item: ShellRegionItem) => () => void;
}

const EMPTY_ITEMS: RegionItems = {
  'header-actions': [],
  'header-right': [],
  'tabbar-extras': [],
  footer: [],
};

const ShellRegionsContext = createContext<ShellRegionsValue | null>(null);

function sortItems(items: readonly ShellRegionItem[]): readonly ShellRegionItem[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function ShellRegionsProvider({
  initialItems = EMPTY_ITEMS,
  children,
}: {
  initialItems?: Partial<RegionItems>;
  children: ComponentChildren;
}) {
  const [registered, setRegistered] = useState<RegionItems>(EMPTY_ITEMS);

  const registerRegionItem = useCallback((region: ShellRegion, item: ShellRegionItem) => {
    setRegistered((current) => ({
      ...current,
      [region]: [...current[region].filter((candidate) => candidate.id !== item.id), item],
    }));
    return () => {
      setRegistered((current) => ({
        ...current,
        [region]: current[region].filter((candidate) => candidate.id !== item.id),
      }));
    };
  }, []);

  const items = useMemo((): RegionItems => {
    const merge = (region: ShellRegion) => {
      const registeredIds = new Set(registered[region].map((item) => item.id));
      return sortItems([
        ...(initialItems[region] ?? []).filter((item) => !registeredIds.has(item.id)),
        ...registered[region],
      ]);
    };
    return {
      'header-actions': merge('header-actions'),
      'header-right': merge('header-right'),
      'tabbar-extras': merge('tabbar-extras'),
      footer: merge('footer'),
    };
  }, [initialItems, registered]);

  const value = useMemo(() => ({ items, registerRegionItem }), [items, registerRegionItem]);
  return <ShellRegionsContext.Provider value={value}>{children}</ShellRegionsContext.Provider>;
}

export function useShellRegions(): ShellRegionsValue {
  const value = useContext(ShellRegionsContext);
  if (!value) throw new Error('useShellRegions must be used within ShellRegionsProvider');
  return value;
}

export function useRegisterRegionItem(region: ShellRegion, item: ShellRegionItem): void {
  const { registerRegionItem } = useShellRegions();
  useEffect(() => registerRegionItem(region, item), [item, region, registerRegionItem]);
}
