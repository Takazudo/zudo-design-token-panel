/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { pushDismissLayer } from '../controls/dismiss-layer';
import { useLayerRegistration, type LayerActivity } from '../shell/layer-activity';
import { useShortcut, type ShortcutDispatcher } from '../shell/shortcut-dispatcher';
import { TextInput } from '../zr/form-controls';
import { Rebuild } from '../zr/rebuild';
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
  open: ReadonlySignal<boolean>;
  onOpen: () => void;
  onClose: () => void;
  config: PanelConfig;
  state: ReadonlySignal<TweakState | null>;
  actions: ReadonlySignal<readonly CommandPaletteAction[]>;
  onSelectToken: (address: TokenAddress) => void;
  shortcuts: ShortcutDispatcher;
  layers: LayerActivity;
}

type PaletteResult =
  | { kind: 'token'; token: SearchToken }
  | { kind: 'action'; action: CommandPaletteAction };

function isCommandKey(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

/** In-shell command palette with dismiss-layer Escape arbitration. */
export function CommandPalette(props: CommandPaletteProps) {
  const { open, onOpen, shortcuts, layers } = props;

  useLayerRegistration(layers, 'command-palette', open);

  useShortcut(
    shortcuts,
    { key: 'k', when: isCommandKey },
    (event) => {
      event.preventDefault();
      onOpen();
    },
    computed(() => !open.value && !layers.active.value),
  );

  return (
    <Show when={open}>
      {() => <CommandPaletteDialog {...props} />}
    </Show>
  );
}

function CommandPaletteDialog({
  onClose,
  config,
  state,
  actions,
  onSelectToken,
}: CommandPaletteProps) {
  const dialogRef: { current: HTMLDivElement | null } = { current: null };
  const listRef: { current: HTMLDivElement | null } = { current: null };
  const query = signal('');
  const selectedIndex = signal(0);

  let lastState: TweakState | null | undefined;
  let lastTokens: SearchToken[] = [];
  const tokens = computed(() => {
    const current = state.value;
    if (current !== lastState) {
      lastState = current;
      lastTokens = buildSearchTokens(config, current ?? undefined);
    }
    return lastTokens;
  });
  const results = computed<PaletteResult[]>(() => {
    const needle = query.value.trim();
    const matchingTokens = fuzzyFilterTokens(tokens.value, needle);
    const matchingActions = actions.value.filter((action) => {
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
  });
  const selected = computed(() =>
    Math.min(selectedIndex.value, Math.max(0, results.value.length - 1)),
  );

  const scope = getScope();
  scope.onActivate(() => {
    dialogRef.current?.querySelector<HTMLInputElement>('.tokenpanel-command-palette-input')?.focus();
    return pushDismissLayer({
      onEscape: onClose,
      getElement: () => dialogRef.current,
    });
  });
  scope.effect(() => {
    void selected.value;
    void results.value;
    queueMicrotask(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    });
  });

  function selectResult(result: PaletteResult | undefined): void {
    if (!result) return;
    if (result.kind === 'action' && result.action.disabled) return;
    onClose();
    if (result.kind === 'action') result.action.onSelect();
    else onSelectToken(result.token.address);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const count = results.value.length;
    const index = selected.value;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      if (count === 0) return;
      event.preventDefault();
      selectedIndex.value = (index + 1) % count;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      if (count === 0) return;
      event.preventDefault();
      selectedIndex.value = (index - 1 + count) % count;
    } else if (event.key === 'Home') {
      if (count === 0) return;
      event.preventDefault();
      selectedIndex.value = 0;
    } else if (event.key === 'End') {
      if (count === 0) return;
      event.preventDefault();
      selectedIndex.value = count - 1;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectResult(results.value[index]);
    } else if (event.key === 'Escape') {
      if (event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      class="tokenpanel-command-palette-backdrop"
      role="presentation"
      on:click={(event: MouseEvent) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        class="tokenpanel-command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
          <TextInput
            value={query}
            class="tokenpanel-command-palette-input"
            attrs={{
              role: 'combobox',
              placeholder: 'Jump to a token or run an action…',
              'aria-label': 'Jump to a token or run an action',
              'aria-controls': 'tokenpanel-command-palette-results',
              'aria-expanded': 'true',
              'aria-autocomplete': 'list',
              'aria-activedescendant': computed(() =>
                results.value[selected.value] ? `tokenpanel-command-result-${selected.value}` : null),
            }}
            onInput={(value) => {
              query.value = value;
              selectedIndex.value = 0;
            }}
            onKeyDown={handleKeyDown}
          />
        <div
          ref={listRef}
          id="tokenpanel-command-palette-results"
          class="tokenpanel-command-palette-list"
          role="listbox"
          aria-label="Command palette results"
          on:keydown={handleKeyDown}
        >
          <Rebuild value={results}>
            {(list) => {
              let previousKind: PaletteResult['kind'] | null = null;
              const items = list.flatMap((result, index) => {
                const group = result.kind === 'token' ? 'Tokens' : 'Actions';
                const heading = result.kind !== previousKind ? (
                  <div class="tokenpanel-command-palette-group" role="presentation">
                    {group}
                  </div>
                ) : null;
                previousKind = result.kind;
                const isSelected = computed(() => index === selected.value);
                if (result.kind === 'token') {
                  return [
                    heading,
                    <div
                      id={`tokenpanel-command-result-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      class={computed(() => (isSelected.value
                        ? 'tokenpanel-command-palette-item is-selected'
                        : 'tokenpanel-command-palette-item'))}
                      on:click={() => selectResult(result)}
                    >
                      <span class="tokenpanel-command-palette-item-label">{result.token.cssVar}</span>
                      <span class="tokenpanel-command-palette-item-detail">
                        {`${result.token.tabLabel} › ${result.token.tierLabel} · ${result.token.value}`}
                      </span>
                    </div>,
                  ];
                }
                const disabled = result.action.disabled === true;
                return [
                  heading,
                  <div
                    id={`tokenpanel-command-result-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={disabled ? true : null}
                    title={result.action.disabledReason ?? null}
                    class={computed(() =>
                      `tokenpanel-command-palette-item${isSelected.value ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`)}
                    on:click={() => selectResult(result)}
                  >
                    <span class="tokenpanel-command-palette-item-label">{result.action.label}</span>
                    <span class="tokenpanel-command-palette-item-detail">
                      {disabled ? 'unavailable' : 'action'}
                    </span>
                  </div>,
                ];
              });
              return list.length === 0
                ? <div class="tokenpanel-command-palette-empty">No matches</div>
                : items;
            }}
          </Rebuild>
        </div>
        <div class="tokenpanel-command-palette-footer">
          <span>↑↓ navigate</span><span>↵ go</span><span>Esc close</span>
          <span class="tokenpanel-command-palette-footer-hint">fuzzy matching across every tab</span>
        </div>
      </div>
    </div>
  );
}
