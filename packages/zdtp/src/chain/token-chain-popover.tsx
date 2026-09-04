import { createPortal } from 'preact/compat';
import { useCallback, useContext, useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { HighlightContext } from '../highlight/highlight-toggle-button';
import { getFixedPopoverStyle, usePopoverClose } from '../components/color-picker';
import { RoleButton } from '../controls/role-button';
import { useLayerRegistration } from '../shell/layer-activity';
import { Z } from '../styles/z-index-tokens';
import { staticCssColorToOklcha } from '../utils/color-oklch';
import {
  tokenAddressKey,
  type TokenAddress,
  type TokenIndexEntry,
} from '../utils/token-index';
import type { RowContribution } from '../tabs/flat/types';
import { scrollToTokenRow } from '../tabs/flat/scroll-to-token-row';
import { useTokenChainContext } from './token-chain-context';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';

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

function ChainHop({
  hop,
  color,
}: {
  hop: { kind: 'token'; address: TokenAddress; cssVar: string } | { kind: 'literal'; value: string };
  color?: string;
}): JSX.Element {
  const label = hop.kind === 'token' ? hop.cssVar : hop.value;
  const swatchColor = hop.kind === 'token' ? color : staticCssColorToOklcha(hop.value) ? hop.value : undefined;
  return (
    <span
      className={hop.kind === 'literal' ? 'tokenpanel-chain-hop is-literal' : 'tokenpanel-chain-hop'}
      aria-label={label}
    >
      {swatchColor && (
        <span
          className="tokenpanel-chain-hop-swatch"
          aria-hidden="true"
          style={{ backgroundColor: swatchColor }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

function ChainChip({
  entry,
  onClick,
}: {
  entry: TokenIndexEntry;
  onClick: () => void;
}): JSX.Element {
  return (
    <RoleButton
      className="tokenpanel-chain-chip"
      onClick={onClick}
      aria-label={`Jump to ${entry.cssVar}`}
      title={`Jump to ${entry.cssVar}`}
    >
      {entry.cssVar}
    </RoleButton>
  );
}

export interface TokenChainPopoverProps {
  address: TokenAddress;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * Body of the per-token chain surface. It is mounted only while its trigger
 * is open, so the first page probe is deferred until the user asks for it.
 */
export function TokenChainPopover({
  address,
  anchorRef,
  onClose,
}: TokenChainPopoverProps): JSX.Element | null {
  const chainContext = useTokenChainContext();
  const highlightContext = useContext(HighlightContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [usedCount, setUsedCount] = useState<number | undefined>(undefined);
  const [blastRadius, setBlastRadius] = useState<number | undefined>(undefined);
  const addressKey = tokenAddressKey(address);

  usePopoverClose(containerRef, onClose, anchorRef);
  useLayerRegistration(`token-chain-${addressKey}`, true);

  const entry = chainContext ? entryFor(chainContext.graph.entries, address) : undefined;
  const hops = entry ? chainContext!.graph.resolutionChain(address) : [];
  const dependents = entry ? chainContext!.graph.dependentsOf(address) : [];
  const siblings = entry ? chainContext!.graph.rampSiblings(address) : [];
  const resolvedColor = colorForHops(hops);
  const requestMatchCount = highlightContext?.requestMatchCount;

  const requestedCountFor = useCallback(
    (target: TokenAddress, targetEntry: TokenIndexEntry): number | undefined => {
      if (requestMatchCount) return requestMatchCount(target);
      return highlightContext?.matchCounts?.[targetEntry.cssVar];
    },
    [highlightContext?.matchCounts, requestMatchCount],
  );

  useEffect(() => {
    if (!entry) return;
    const count = requestedCountFor(address, entry);
    if (count !== undefined) setUsedCount(count);
  }, [addressKey, entry, requestedCountFor]);

  const dependentKey = dependents.map(tokenAddressKey).join('|');
  const loadBlastRadius = useCallback(() => {
    if (dependents.length === 0 || !chainContext) {
      setBlastRadius(dependents.length === 0 ? 0 : undefined);
      return;
    }
    let total = 0;
    let complete = true;
    for (const dependent of dependents) {
      const dependentEntry = entryFor(chainContext.graph.entries, dependent);
      if (!dependentEntry) continue;
      const count = requestedCountFor(dependent, dependentEntry);
      if (count === undefined) complete = false;
      else total += count;
    }
    setBlastRadius(complete ? total : undefined);
  }, [chainContext, dependentKey, dependents, requestedCountFor]);

  useEffect(() => {
    loadBlastRadius();
  }, [loadBlastRadius]);

  if (!chainContext || !entry) return null;

  const jumpTo = (target: TokenAddress) => {
    // `data-address` is shared by the flat row and Color-tab row renderers.
    // The document root is intentional: target rows may live in a different,
    // currently hidden tab panel, which remains mounted for tab switching.
    scrollToTokenRow(document, target);
  };

  const popover = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={`${entry.cssVar} token chain`}
      className="tokenpanel-chain-popover"
      style={{ ...getFixedPopoverStyle(anchorRef.current, 460, 440), zIndex: Z.settingsPopover }}
      data-layer-active="true"
    >
      <div className="tokenpanel-chain-hops" aria-label="Resolution chain">
        {hops.map((hop, index) => (
          <span className="tokenpanel-chain-hop-wrap" key={`${hop.kind}-${index}`}>
            {index > 0 && <span className="tokenpanel-chain-arrow" aria-hidden="true">→</span>}
            <ChainHop hop={hop} color={hop.kind === 'token' && entry.kind === 'color' ? resolvedColor : undefined} />
          </span>
        ))}
      </div>

      <div className="tokenpanel-chain-row tokenpanel-chain-used-row">
        <span className="tokenpanel-chain-row-label">used on page</span>
        <span className="tokenpanel-chain-row-value">
          {usedCount === undefined
            ? '…'
            : `${usedCount} element${usedCount === 1 ? '' : 's'}`}
        </span>
        <span className="tokenpanel-chain-row-action">
          <span>highlight on page</span>
          <HighlightToggleButton cssVar={entry.cssVar} />
        </span>
      </div>

      <div className="tokenpanel-chain-row">
        <span className="tokenpanel-chain-row-label">depended on by</span>
        <span className="tokenpanel-chain-chip-list">
          {dependents.length === 0
            ? <span className="tokenpanel-chain-empty">—</span>
            : dependents.map((dependent) => {
                const dependentEntry = entryFor(chainContext.graph.entries, dependent);
                return dependentEntry ? (
                  <ChainChip
                    key={tokenAddressKey(dependent)}
                    entry={dependentEntry}
                    onClick={() => jumpTo(dependent)}
                  />
                ) : null;
              })}
        </span>
      </div>

      {entry.kind === 'color' && entry.source !== 'semantic' && (
        <>
          <div className="tokenpanel-chain-row">
            <span className="tokenpanel-chain-row-label">ramp siblings</span>
            <span className="tokenpanel-chain-chip-list">
              {siblings.length === 0
                ? <span className="tokenpanel-chain-empty">—</span>
                : siblings.map((sibling) => {
                    const siblingEntry = entryFor(chainContext.graph.entries, sibling);
                    return siblingEntry ? (
                      <ChainChip
                        key={tokenAddressKey(sibling)}
                        entry={siblingEntry}
                        onClick={() => jumpTo(sibling)}
                      />
                    ) : null;
                  })}
            </span>
          </div>
          <div className="tokenpanel-chain-row">
            <span className="tokenpanel-chain-row-label">blast radius</span>
            <span className="tokenpanel-chain-row-value">
              {blastRadius === undefined
                ? '…'
                : `${blastRadius} element${blastRadius === 1 ? '' : 's'} change`}
            </span>
          </div>
        </>
      )}
    </div>
  );

  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(popover, document.body);
}

export interface TokenChainButtonProps {
  address: TokenAddress;
}

/** Chain trigger used by flat rows and Color-tab custom rows. */
export function TokenChainButton({ address }: TokenChainButtonProps): JSX.Element | null {
  const chainContext = useTokenChainContext();
  const entry = chainContext ? entryFor(chainContext.graph.entries, address) : undefined;
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  if (!entry) return null;

  const toggle = () => setIsOpen((open) => !open);
  return (
    <>
      <RoleButton
        elementRef={triggerRef}
        className={isOpen ? 'tokenpanel-chain-button is-open' : 'tokenpanel-chain-button'}
        onClick={toggle}
        aria-label={`Show resolution chain for ${entry.cssVar}`}
        title="Show resolution chain"
        ariaProps={{ 'aria-expanded': isOpen, 'aria-haspopup': 'dialog' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
        </svg>
      </RoleButton>
      {isOpen && (
        <TokenChainPopover
          address={address}
          anchorRef={triggerRef}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

/** Shared FlatTab contribution for every non-Color row. */
export const TOKEN_CHAIN_CONTRIBUTION: RowContribution = {
  id: 'token-chain',
  trailing: (entry) => <TokenChainButton address={entry.address} />,
};

export const ChainPopover = TokenChainPopover;
export const ChainButton = TokenChainButton;
