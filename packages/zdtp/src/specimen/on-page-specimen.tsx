/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope } from '@takazudo/zfb/zudo-react';
import type { PanelConfig } from '../config/panel-config';
import { claimHostNode, releaseHostMutations } from '../host/host-mutations';
import { isDocumentUsable } from '../utils/document-liveness';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import {
  findLineHeightBasePx,
  resolvePreviewLength,
} from './specimen-values';
import { specimenFontStyle, type ValueFor } from './specimen-tab-body';
import { read, type MaybeSignal } from '../zr/live';
import { Rebuild } from '../zr/rebuild';
import { mountOwnedRoot, type RootHandle } from '../zr/root';
import type { SpecimenState } from './specimen-state';

/** The host-mutation owner suffix for a panel's page-level specimen node. */
export function onPageSpecimenMutationOwner(cfg: PanelConfig): string {
  return `${cfg.storagePrefix}-on-page-specimen`;
}

interface OnPageSpecimenProps {
  enabled: MaybeSignal<boolean>;
  tab: TabConfig;
  state: MaybeSignal<SpecimenState>;
  valueFor: MaybeSignal<ValueFor>;
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
  // The mount is host-facing DOM.  Do not let a late effect create it
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

function OnPageSpecimenContent({ tab, state, valueFor }: { tab: TabConfig; state: SpecimenState; valueFor: ValueFor }) {
  const fontStyle = specimenFontStyle(tab, valueFor);
  const sizes = sortedSizeEntries(tab, valueFor);
  const lineHeightTiers = tab.tiers.filter((tier) => tier.preview === 'line-height');

  return (
    <>
      <div class="tokenpanel-on-page-specimen-heading" role="heading" aria-level={3}>
        <span>zdtp · type specimen (rendered in the page)</span>
        <span>edit values in the panel</span>
      </div>
      {sizes.length > 0 && (
        <div class="tokenpanel-on-page-specimen-section">
          <div class="tokenpanel-on-page-specimen-section-label">Scale</div>
          {sizes.map(({ item, px, value }) => (
            <div
              class="tokenpanel-on-page-specimen-row"
              data-testid={`on-page-specimen-size-${item.id}`}
              data-css-var={item.cssVar}
            >
              <span class="tokenpanel-on-page-specimen-meta">
                <span>{item.cssVar}</span>
                <span>{item.id} · {displayPx(px)}</span>
              </span>
              <span
                class="tokenpanel-on-page-specimen-size-text"
                style={{ ...fontStyle, 'font-size': value }}
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
          <div class="tokenpanel-on-page-specimen-section">
            <div class="tokenpanel-on-page-specimen-section-label">Line height</div>
            {tier.items.map((item) => {
              const lineHeight = valueFor(item);
              const linePx = basePx * parseFloat(lineHeight);
              return (
                <div
                  class="tokenpanel-on-page-specimen-row is-line-height"
                  data-testid={`on-page-specimen-line-height-${item.id}`}
                  data-css-var={item.cssVar}
                >
                  <span class="tokenpanel-on-page-specimen-meta">
                    <span>{item.cssVar}</span>
                    <span>{item.id} · {Number(linePx.toFixed(1))}px line at {Number(basePx.toFixed(1))}px</span>
                  </span>
                  <span
                    class="tokenpanel-on-page-specimen-line-height-text"
                    style={{
                      ...fontStyle,
                      'font-size': `${basePx}px`,
                      'line-height': lineHeight,
                      width: `${state.width}px`,
                      '--tokenpanel-specimen-line': `${linePx}px`,
                    }}
                  >
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
 * even when the panel tree no longer has a live root to run effect cleanup.
 */
export default function OnPageSpecimen(props: OnPageSpecimenProps) {
  const { tab, instanceConfig } = props;
  const owner = onPageSpecimenMutationOwner(instanceConfig);
  const enabled = computed(() => read(props.enabled));
  const content = computed(() => ({ state: read(props.state), valueFor: read(props.valueFor) }));

  getScope().effect(() => {
    if (!enabled.value) return;
    const node = createMount(owner);
    if (!node) return;
    let root: RootHandle | null = mountOwnedRoot(node, function OnPageSpecimenRoot() {
      return (
        <Rebuild value={content}>
          {({ state, valueFor }) => <OnPageSpecimenContent tab={tab} state={state} valueFor={valueFor} />}
        </Rebuild>
      );
    }, {});
    return () => {
      root?.unmount();
      root = null;
      releaseHostMutations(owner);
      // `releaseHostMutations` removes the node. Keep the explicit remove as
      // a defense for a mixed-version registry that cannot see this claim.
      node.remove();
    };
  });
  return null;
}
