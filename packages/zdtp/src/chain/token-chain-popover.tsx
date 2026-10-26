/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type Ref } from '@takazudo/zfb/zudo-react';
import { bindPopoverClose, getFixedPopoverStyle } from '../components/color-picker/popover';
import { RoleButton } from '../controls/role-button';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import { Z } from '../styles/z-index-tokens';
import { staticCssColorToOklcha } from '../utils/color-oklch';
import {
  tokenAddressKey,
  type TokenAddress,
  type TokenIndexEntry,
} from '../utils/token-index';
import type { RowContribution } from '../tabs/flat/types';
import { scrollToTokenRow } from '../tabs/flat/scroll-to-token-row';
import type { PanelServices } from '../zr/panel-services';
import { usePortal } from '../zr/portal';
import { Rebuild } from '../zr/rebuild';
import { toZrStyle } from '../zr/style';

function sameAddress(a: TokenAddress, b: TokenAddress): boolean {
  return a.tabId === b.tabId && a.tierId === b.tierId && a.itemId === b.itemId;
}

function entryFor(
  entries: readonly TokenIndexEntry[],
  address: TokenAddress,
): TokenIndexEntry | undefined {
  return entries.find((entry) => sameAddress(entry.address, address));
}

function colorForHops(
  hops: readonly { kind: 'token' | 'literal'; value?: string }[],
): string | undefined {
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const value = hops[index]?.value;
    if (value && staticCssColorToOklcha(value)) return value;
  }
  return undefined;
}

type Hop = { kind: 'token'; address: TokenAddress; cssVar: string } | { kind: 'literal'; value: string };

function ChainHop({ hop, color }: { hop: Hop; color?: string }) {
  const label = hop.kind === 'token' ? hop.cssVar : hop.value;
  const swatchColor = hop.kind === 'token' ? color : staticCssColorToOklcha(hop.value) ? hop.value : undefined;
  return (
    <span
      class={hop.kind === 'literal' ? 'tokenpanel-chain-hop is-literal' : 'tokenpanel-chain-hop'}
      aria-label={label}
    >
      {swatchColor && (
        <span
          class="tokenpanel-chain-hop-swatch"
          aria-hidden="true"
          style={{ 'background-color': swatchColor }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

function ChainChip({ entry, onClick }: { entry: TokenIndexEntry; onClick: () => void }) {
  return (
    <RoleButton
      class="tokenpanel-chain-chip"
      onClick={onClick}
      aria-label={`Jump to ${entry.cssVar}`}
      title={`Jump to ${entry.cssVar}`}
    >
      {entry.cssVar}
    </RoleButton>
  );
}

function countLabel(count: number | undefined, suffix = ''): string {
  return count === undefined ? '…' : `${count} element${count === 1 ? '' : 's'}${suffix}`;
}

export interface TokenChainPopoverProps {
  address: TokenAddress;
  anchorRef: { readonly current: HTMLElement | null };
  onClose: () => void;
  services: PanelServices;
}

/**
 * Body of the per-token chain surface. It is mounted only while its trigger
 * is open, so the first page probe is deferred until the user asks for it.
 * Renders into its own root on `document.body` so panel overflow cannot
 * clip it.
 */
export function TokenChainPopover(props: TokenChainPopoverProps) {
  const { address, services } = props;
  const addressKey = tokenAddressKey(address);
  getScope().onActivate(() => {
    services.setLayerActive?.(`token-chain-${addressKey}`, true);
    return () => services.setLayerActive?.(`token-chain-${addressKey}`, false);
  });
  usePortal(() => <ChainPopoverBody {...props} />);
  return null;
}

function ChainPopoverBody({ address, anchorRef, onClose, services }: TokenChainPopoverProps) {
  const { chain, highlight } = services;
  const container: Ref<HTMLDivElement> = { current: null };
  const usedCount = signal<number | undefined>(undefined);
  const blastRadius = signal<number | undefined>(undefined);

  const entry = computed(() => (chain.value ? entryFor(chain.value.graph.entries, address) : undefined));
  const hops = computed(() => (entry.value ? chain.value!.graph.resolutionChain(address) : []));
  const dependents = computed(() => (entry.value ? chain.value!.graph.dependentsOf(address) : []));
  const siblings = computed(() => (entry.value ? chain.value!.graph.rampSiblings(address) : []));

  const requestedCountFor = (target: TokenAddress, targetEntry: TokenIndexEntry): number | undefined => {
    const ctx = highlight.value;
    if (ctx?.requestMatchCount) return ctx.requestMatchCount(target);
    return ctx?.matchCounts?.[targetEntry.cssVar];
  };

  const scope = getScope();
  scope.onActivate(() => bindPopoverClose(container, onClose, anchorRef));
  scope.effect(() => {
    const current = entry.value;
    if (!current) return;
    const count = requestedCountFor(address, current);
    if (count !== undefined) usedCount.value = count;
  });
  scope.effect(() => {
    const list = dependents.value;
    const graph = chain.value?.graph;
    if (list.length === 0 || !graph) {
      blastRadius.value = list.length === 0 ? 0 : undefined;
      return;
    }
    let total = 0;
    let complete = true;
    for (const dependent of list) {
      const dependentEntry = entryFor(graph.entries, dependent);
      if (!dependentEntry) continue;
      const count = requestedCountFor(dependent, dependentEntry);
      if (count === undefined) complete = false;
      else total += count;
    }
    blastRadius.value = complete ? total : undefined;
  });

  // `data-address` is shared by the flat row and Color-tab row renderers.
  // The document root is intentional: target rows may live in a different,
  // currently hidden tab panel, which remains mounted for tab switching.
  const jumpTo = (target: TokenAddress) => {
    scrollToTokenRow(document, target);
  };

  const chipList = (targets: readonly TokenAddress[]) => {
    const graph = chain.value?.graph;
    if (targets.length === 0 || !graph) return <span class="tokenpanel-chain-empty">—</span>;
    return targets.map((target) => {
      const targetEntry = entryFor(graph.entries, target);
      return targetEntry ? <ChainChip entry={targetEntry} onClick={() => jumpTo(target)} /> : null;
    });
  };

  const style = toZrStyle({ ...getFixedPopoverStyle(anchorRef.current, 460, 440), zIndex: Z.settingsPopover });

  return (
    <Show when={computed(() => entry.value !== undefined)}>
      {() => {
        const current = entry.value!;
        return (
          <div
            ref={container}
            role="dialog"
            aria-label={`${current.cssVar} token chain`}
            class="tokenpanel-chain-popover"
            style={style}
            data-layer-active="true"
          >
            <div class="tokenpanel-chain-hops" aria-label="Resolution chain">
              <Rebuild value={hops}>
                {(list) => list.map((hop, index) => (
                  <span class="tokenpanel-chain-hop-wrap">
                    {index > 0 && <span class="tokenpanel-chain-arrow" aria-hidden="true">→</span>}
                    <ChainHop hop={hop} color={hop.kind === 'token' && current.kind === 'color' ? colorForHops(list) : undefined} />
                  </span>
                ))}
              </Rebuild>
            </div>

            <div class="tokenpanel-chain-row tokenpanel-chain-used-row">
              <span class="tokenpanel-chain-row-label">used on page</span>
              <span class="tokenpanel-chain-row-value">{computed(() => countLabel(usedCount.value))}</span>
              <span class="tokenpanel-chain-row-action">
                <span>highlight on page</span>
                <HighlightToggleButton cssVar={current.cssVar} highlight={highlight} />
              </span>
            </div>

            <div class="tokenpanel-chain-row">
              <span class="tokenpanel-chain-row-label">depended on by</span>
              <span class="tokenpanel-chain-chip-list">
                <Rebuild value={dependents}>{chipList}</Rebuild>
              </span>
            </div>

            {current.kind === 'color' && current.source !== 'semantic' && (
              <>
                <div class="tokenpanel-chain-row">
                  <span class="tokenpanel-chain-row-label">ramp siblings</span>
                  <span class="tokenpanel-chain-chip-list">
                    <Rebuild value={siblings}>{chipList}</Rebuild>
                  </span>
                </div>
                <div class="tokenpanel-chain-row">
                  <span class="tokenpanel-chain-row-label">blast radius</span>
                  <span class="tokenpanel-chain-row-value">{computed(() => countLabel(blastRadius.value, ' change'))}</span>
                </div>
              </>
            )}
          </div>
        );
      }}
    </Show>
  );
}

export interface TokenChainButtonProps {
  address: TokenAddress;
  services: PanelServices;
}

/** Chain trigger used by flat rows and Color-tab custom rows. */
export function TokenChainButton({ address, services }: TokenChainButtonProps) {
  const entry = computed(() => (services.chain.value ? entryFor(services.chain.value.graph.entries, address) : undefined));
  const isOpen = signal(false);
  const trigger: Ref<HTMLDivElement> = { current: null };
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  return (
    <Show when={computed(() => entry.value !== undefined)}>
      {() => (
        <>
          <RoleButton
            ref={trigger}
            class={computed(() => (isOpen.value ? 'tokenpanel-chain-button is-open' : 'tokenpanel-chain-button'))}
            onClick={toggle}
            aria-label={computed(() => `Show resolution chain for ${entry.value?.cssVar ?? ''}`)}
            title="Show resolution chain"
            ariaProps={{ 'aria-expanded': isOpen, 'aria-haspopup': 'dialog' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
            </svg>
          </RoleButton>
          <Show when={isOpen}>
            {() => (
              <TokenChainPopover
                address={address}
                anchorRef={trigger}
                services={services}
                onClose={() => {
                  isOpen.value = false;
                }}
              />
            )}
          </Show>
        </>
      )}
    </Show>
  );
}

/** Shared FlatTab contribution for every non-Color row. */
export function createTokenChainContribution(services: PanelServices): RowContribution {
  return {
    id: 'token-chain',
    trailing: (entry) => <TokenChainButton address={entry.value.address} services={services} />,
  };
}

export const ChainPopover = TokenChainPopover;
export const ChainButton = TokenChainButton;
