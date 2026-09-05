import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/compat';
import type { ComponentChildren } from 'preact';

interface LayerActivityValue {
  active: boolean;
  setLayerActive: (id: string, active: boolean) => void;
}

const LayerActivityContext = createContext<LayerActivityValue | null>(null);

export function LayerActivityProvider({ children }: { children: ComponentChildren }) {
  const [activeLayers, setActiveLayers] = useState<ReadonlySet<string>>(() => new Set());
  const setLayerActive = useCallback((id: string, active: boolean) => {
    setActiveLayers((current) => {
      const next = new Set(current);
      if (active) next.add(id);
      else next.delete(id);
      if (next.size === current.size && [...next].every((key) => current.has(key))) return current;
      return next;
    });
  }, []);
  const value = useMemo(
    () => ({ active: activeLayers.size > 0, setLayerActive }),
    [activeLayers, setLayerActive],
  );
  return <LayerActivityContext.Provider value={value}>{children}</LayerActivityContext.Provider>;
}

export function useLayerActivity(): boolean {
  const value = useContext(LayerActivityContext);
  if (!value) throw new Error('useLayerActivity must be used within LayerActivityProvider');
  return value.active;
}

export function useLayerRegistration(id: string, active: boolean): void {
  const value = useContext(LayerActivityContext);
  if (!value) throw new Error('useLayerRegistration must be used within LayerActivityProvider');
  const { setLayerActive } = value;
  useEffect(() => {
    setLayerActive(id, active);
    return () => setLayerActive(id, false);
  }, [active, id, setLayerActive]);
}
