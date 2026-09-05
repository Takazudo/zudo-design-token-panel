import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/compat';
import { pushDismissLayer } from '../controls/dismiss-layer';
import { useLayerActivity, useLayerRegistration } from '../shell/layer-activity';
import { useShortcut } from '../shell/shortcut-dispatcher';
import type { PanelConfig } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import { buildSearchTokens, fuzzyFilterTokens, type SearchToken } from './token-search';
import { fuzzySubsequence } from './fuzzy';
import type { TokenAddress } from '../utils/token-index';

export interface CommandPaletteAction {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  config: PanelConfig;
  state?: TweakState | null;
  actions: readonly CommandPaletteAction[];
  onSelectToken: (address: TokenAddress) => void;
}

type PaletteResult =
  | { kind: 'token'; token: SearchToken }
  | { kind: 'action'; action: CommandPaletteAction };

function isCommandKey(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

/** In-shell command palette with dismiss-layer Escape arbitration. */
export function CommandPalette({
  open,
  onOpen,
  onClose,
  config,
  state,
  actions,
  onSelectToken,
}: CommandPaletteProps) {
  const layerActive = useLayerActivity();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useLayerRegistration('command-palette', open);

  useShortcut(
    { key: 'k', when: isCommandKey },
    (event) => {
      event.preventDefault();
      onOpen();
    },
    !open && !layerActive,
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const removeLayer = pushDismissLayer({
      onEscape: onClose,
      getElement: () => dialogRef.current,
    });
    return removeLayer;
  }, [onClose, open]);

  const tokens = useMemo(() => buildSearchTokens(config, state ?? undefined), [config, state]);
  const results = useMemo<PaletteResult[]>(() => {
    const needle = query.trim();
    const matchingTokens = fuzzyFilterTokens(tokens, needle);
    const matchingActions = actions.filter((action) => {
      if (!needle) return true;
      // Keep action matching independent from token field matching, while
      // allowing a query such as "reset font" to find the whole label.
      return fuzzySubsequence(needle, action.label);
    });
    const tokenResults = matchingTokens.map((token) => ({ kind: 'token' as const, token }));
    const actionResults = matchingActions.map((action) => ({ kind: 'action' as const, action }));
    // A blank palette is useful as a command launcher, so actions lead it.
    // Once typing begins, token results lead it as a token-oriented search.
    return needle
      ? [...tokenResults, ...actionResults]
      : [...actionResults, ...tokenResults.slice(0, 16)];
  }, [actions, query, tokens]);

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, results]);

  function selectResult(result: PaletteResult | undefined): void {
    if (!result) return;
    if (result.kind === 'action' && result.action.disabled) return;
    onClose();
    if (result.kind === 'action') result.action.onSelect();
    else onSelectToken(result.token.address);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      if (results.length === 0) return;
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      if (results.length === 0) return;
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Home') {
      if (results.length === 0) return;
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === 'End') {
      if (results.length === 0) return;
      event.preventDefault();
      setSelectedIndex(results.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (event.key === 'Escape') {
      if (event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  let previousKind: PaletteResult['kind'] | null = null;
  return (
    <div
      className="tokenpanel-command-palette-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="tokenpanel-command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          className="tokenpanel-command-palette-input"
          role="combobox"
          value={query}
          placeholder="Jump to a token or run an action…"
          aria-label="Jump to a token or run an action"
          aria-controls="tokenpanel-command-palette-results"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-activedescendant={results[selectedIndex] ? `tokenpanel-command-result-${selectedIndex}` : undefined}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <div
          ref={listRef}
          id="tokenpanel-command-palette-results"
          className="tokenpanel-command-palette-list"
          role="listbox"
          aria-label="Command palette results"
          onKeyDown={handleKeyDown}
        >
          {results.map((result, index) => {
            const group = result.kind === 'token' ? 'Tokens' : 'Actions';
            const heading = result.kind !== previousKind ? (
              <div key={`heading-${group}`} className="tokenpanel-command-palette-group" role="presentation">
                {group}
              </div>
            ) : null;
            previousKind = result.kind;
            const selected = index === selectedIndex;
            if (result.kind === 'token') {
              return (
                <Fragment key={`token-result-${index}`}>
                  {heading}
                  <div
                    id={`tokenpanel-command-result-${index}`}
                    role="option"
                    aria-selected={selected}
                    className={selected ? 'tokenpanel-command-palette-item is-selected' : 'tokenpanel-command-palette-item'}
                    onClick={() => selectResult(result)}
                  >
                    <span className="tokenpanel-command-palette-item-label">{result.token.cssVar}</span>
                    <span className="tokenpanel-command-palette-item-detail">
                      {result.token.tabLabel} › {result.token.tierLabel} · {result.token.value}
                    </span>
                  </div>
                </Fragment>
              );
            }
            return (
              <Fragment key={`action-result-${result.action.id}`}>
                {heading}
                <div
                  id={`tokenpanel-command-result-${index}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={result.action.disabled || undefined}
                  title={result.action.disabledReason}
                  className={`tokenpanel-command-palette-item${selected ? ' is-selected' : ''}${result.action.disabled ? ' is-disabled' : ''}`}
                  onClick={() => selectResult(result)}
                >
                  <span className="tokenpanel-command-palette-item-label">{result.action.label}</span>
                  <span className="tokenpanel-command-palette-item-detail">
                    {result.action.disabled ? 'unavailable' : 'action'}
                  </span>
                </div>
              </Fragment>
            );
          })}
          {results.length === 0 && <div className="tokenpanel-command-palette-empty">No matches</div>}
        </div>
        <div className="tokenpanel-command-palette-footer">
          <span>↑↓ navigate</span><span>↵ go</span><span>Esc close</span>
          <span className="tokenpanel-command-palette-footer-hint">fuzzy matching across every tab</span>
        </div>
      </div>
    </div>
  );
}
