import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { PanelConfig } from '../config/panel-config';
import { createTweakHistory, type TweakHistory, type TweakHistorySnapshot } from './history';
import { createPersist } from './persist';
import { createTweakStateTransaction, type CommitTweakState } from './transaction';
import type { TweakState } from './tweak-state';

// Preact adapters over the framework-free state modules, used by the panel
// shell until it moves to zudo-react (epic #1075).

type SetState = (updater: (previous: TweakState | null) => TweakState | null) => void;

export function useTweakStateTransaction(
  state: TweakState | null,
  setState: SetState,
  cfg: PanelConfig,
): { commitTweakState: CommitTweakState; history: TweakHistory } {
  const currentRef = useRef<TweakState | null>(state);
  currentRef.current = state;
  const history = useMemo(() => createTweakHistory(), []);
  return useMemo(
    () =>
      createTweakStateTransaction({
        cfg,
        history,
        getState: () => currentRef.current,
        setState: (next) => {
          currentRef.current = next;
          setState(() => next);
        },
      }),
    [cfg, history, setState],
  );
}

/** `cfg` is accepted so the callbacks re-bind when the config reference changes. */
export function usePersist(commitTweakState: CommitTweakState, cfg?: PanelConfig) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createPersist(commitTweakState), [commitTweakState, cfg]);
}

export function useHistory(history: TweakHistory) {
  const [snapshot, setSnapshot] = useState<TweakHistorySnapshot>(() => history.getSnapshot());
  useEffect(() => history.subscribe(() => setSnapshot(history.getSnapshot())), [history]);
  return {
    ...snapshot,
    undo: () => history.undo(),
    redo: () => history.redo(),
    jumpTo: (index: number) => history.jumpTo(index),
  };
}
