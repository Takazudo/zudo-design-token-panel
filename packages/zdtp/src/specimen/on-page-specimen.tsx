import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import type { CSSProperties } from 'preact/compat';
import type { PanelConfig } from '../config/panel-config';
import { claimHostNode, releaseHostMutations } from '../host/host-mutations';
import { isDocumentUsable } from '../utils/document-liveness';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import {
  findLineHeightBasePx,
  resolvePreviewLength,
} from './specimen-values';
import { specimenFontStyle } from './specimen-tab-body';
import type { SpecimenState } from './specimen-state';

/** The host-mutation owner suffix for a panel's page-level specimen node. */
export function onPageSpecimenMutationOwner(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-on-page-specimen`;
}

interface OnPageSpecimenProps {
  enabled: boolean;
  tab: TabConfig;
  state: SpecimenState;
  valueFor: (item: TierItem) => string;
  instanceConfig: PanelConfig;
}

interface SizeEntry {
  tier: TierConfig;
  item: TierItem;
  px: number | null;
  value: string;
  index: number;
}

function displayPx(px: number | null): string {
  return px === null ? 'unresolved' : `${Number(px.toFixed(2))}px`;
}

function sortedSizeEntries(tab: TabConfig, valueFor: (item: TierItem) => string): SizeEntry[] {
  const entries: SizeEntry[] = [];
  let order = 0;
  for (const tier of tab.tiers) {
    if (tier.preview !== 'size') continue;
    tier.items.forEach((item) => {
      const resolved = resolvePreviewLength(tab, tier, item, valueFor);
      entries.push({ tier, item, px: resolved.px, value: resolved.value, index: order++ });
    });
  }
  return entries.sort((a, b) => {
    if (a.px === null && b.px === null) return a.index - b.index;
    if (a.px === null) return 1;
    if (b.px === null) return -1;
    return a.px - b.px || a.index - b.index;
  });
}

function createMount(owner: string): HTMLDivElement | null {
  // The portal is host-facing DOM.  Do not let a late Preact effect create it
  // against a document that Astro has already torn down or swapped.
  if (!isDocumentUsable() || !document.body) return null;
  const node = document.createElement('div');
  node.className = 'tokenpanel-on-page-specimen';
  node.setAttribute('data-zdtp-specimen', '');
  // Keep the specimen ahead of every existing body child, including the
  // panel root, so it reads as page content rather than panel chrome.
  document.body.insertBefore(node, document.body.firstChild);
  claimHostNode(owner, node);
  return node;
}

function OnPageSpecimenContent({ tab, state, valueFor }: Omit<OnPageSpecimenProps, 'enabled' | 'instanceConfig'>) {
  const fontStyle = specimenFontStyle(tab, valueFor);
  const sizes = sortedSizeEntries(tab, valueFor);
  const lineHeightTiers = tab.tiers.filter((tier) => tier.preview === 'line-height');

  return (
    <>
      <div className="tokenpanel-on-page-specimen-heading" role="heading" aria-level={3}>
        <span>zdtp · type specimen (rendered in the page)</span>
        <span>edit values in the panel</span>
      </div>
      {sizes.length > 0 && (
        <div className="tokenpanel-on-page-specimen-section">
          <div className="tokenpanel-on-page-specimen-section-label">Scale</div>
          {sizes.map(({ tier, item, px, value }) => (
            <div
              key={`size-${tier.id}-${item.id}`}
              className="tokenpanel-on-page-specimen-row"
              data-testid={`on-page-specimen-size-${item.id}`}
              data-css-var={item.cssVar}
            >
              <span className="tokenpanel-on-page-specimen-meta">
                <span>{item.cssVar}</span>
                <span>{item.id} · {displayPx(px)}</span>
              </span>
              <span
                className="tokenpanel-on-page-specimen-size-text"
                style={{
                  ...fontStyle,
                  fontSize: `var(${item.cssVar}, ${value})`,
                }}
              >
                {state.text || '…'}
              </span>
            </div>
          ))}
        </div>
      )}
      {lineHeightTiers.map((tier) => {
        const basePx = findLineHeightBasePx(tab, tier, valueFor);
        return (
          <div key={tier.id} className="tokenpanel-on-page-specimen-section">
            <div className="tokenpanel-on-page-specimen-section-label">Line height</div>
            {tier.items.map((item) => {
              const lineHeight = valueFor(item);
              const linePx = basePx * parseFloat(lineHeight);
              const style = {
                ...fontStyle,
                fontSize: `${basePx}px`,
                lineHeight,
                width: `${state.width}px`,
                '--tokenpanel-specimen-line': `${linePx}px`,
              } as CSSProperties;
              return (
                <div
                  key={`line-height-${item.id}`}
                  className="tokenpanel-on-page-specimen-row is-line-height"
                  data-testid={`on-page-specimen-line-height-${item.id}`}
                  data-css-var={item.cssVar}
                >
                  <span className="tokenpanel-on-page-specimen-meta">
                    <span>{item.cssVar}</span>
                    <span>{item.id} · {Number(linePx.toFixed(1))}px line at {Number(basePx.toFixed(1))}px</span>
                  </span>
                  <span className="tokenpanel-on-page-specimen-line-height-text" style={style}>
                    {(state.text ? `${state.text} ${state.text}` : '…')}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/**
 * Render the read-only font specimen into the host document while enabled.
 * The mount itself is registry-owned, so destroy/Astro cleanup can remove it
 * even when the Preact tree no longer has a live root to run effect cleanup.
 */
export default function OnPageSpecimen(props: OnPageSpecimenProps) {
  const { enabled, instanceConfig } = props;
  const owner = onPageSpecimenMutationOwner(instanceConfig);
  const [mount, setMount] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const node = createMount(owner);
    if (!node) return;
    setMount(node);
    return () => {
      releaseHostMutations(owner);
      // `releaseHostMutations` removes the node. Keep the explicit remove as
      // a defense for a mixed-version registry that cannot see this claim.
      node.remove();
    };
  }, [enabled, owner]);

  if (!enabled || !mount || !mount.isConnected) return null;
  return createPortal(
    <OnPageSpecimenContent tab={props.tab} state={props.state} valueFor={props.valueFor} />,
    mount,
  );
}
