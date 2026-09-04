import { Fragment } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/compat';
import type { PanelConfig } from '../config/panel-config';
import { getPanelConfig } from '../config/panel-config';
import { previewGlyphContribution } from '../specimen/preview-glyphs';
import { createSpecimenContribution, renderSpecimenTierBody } from '../specimen/specimen-tab-body';
import { loadSpecimenState, saveSpecimenState } from '../specimen/specimen-state';
import SpecimenToolbar from '../specimen/specimen-toolbar';
import OnPageSpecimen from '../specimen/on-page-specimen';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { TokenOverrides } from '../state/tweak-state';
import type { PersistFont } from '../state/persist';
import FlatTab from './flat/flat-tab';
import type { TokenAddress } from './flat/types';

interface FontTabProps {
  tab: TabConfig;
  state: TokenOverrides;
  persistFont: PersistFont;
  instanceConfig?: PanelConfig;
  /** Whether the read-only specimen is currently portaled into the host page. */
  renderOnPage?: boolean;
  /** Called when the toolbar toggles the page-level specimen. */
  onRenderOnPageChange?: (enabled: boolean) => void;
}

export default function FontTab({
  tab,
  state,
  persistFont,
  instanceConfig = getPanelConfig(),
  renderOnPage: renderOnPageProp = false,
  onRenderOnPageChange,
}: FontTabProps) {
  const getValue = useCallback((_address: TokenAddress, item: TierItem) => state[item.id] ?? item.default, [state]);
  const setValue = useCallback((address: TokenAddress, next: string) => {
    persistFont((prev) => ({ ...prev, [address.itemId]: next }));
  }, [persistFont]);
  const deleteValue = useCallback((address: TokenAddress) => {
    persistFont((prev) => { const next = { ...prev }; delete next[address.itemId]; return next; });
  }, [persistFont]);
  const resetAll = useCallback(() => persistFont(() => ({})), [persistFont]);
  const overrides = Object.fromEntries(tab.tiers.map((tier) => [tier.id, state]));
  const hasSpecimen = tab.tiers.some((tier) => tier.preview === 'size' || tier.preview === 'line-height');
  const hasLineHeight = tab.tiers.some((tier) => tier.preview === 'line-height');
  const [specimen, setSpecimen] = useState(() => loadSpecimenState(instanceConfig));
  const [localRenderOnPage, setLocalRenderOnPage] = useState(false);
  const renderOnPage = onRenderOnPageChange ? renderOnPageProp : localRenderOnPage;
  const handleRenderOnPageChange = useCallback((enabled: boolean) => {
    if (onRenderOnPageChange) onRenderOnPageChange(enabled);
    else setLocalRenderOnPage(enabled);
  }, [onRenderOnPageChange]);
  useEffect(() => {
    if (hasSpecimen) saveSpecimenState(instanceConfig, specimen);
  }, [hasSpecimen, instanceConfig, specimen]);
  const valueFor = useCallback((item: TierItem) => state[item.id] ?? item.default, [state]);
  const contributions = useMemo(() => [
    previewGlyphContribution(),
    createSpecimenContribution({ tab, state: specimen, valueFor, onPage: renderOnPage }),
  ], [renderOnPage, specimen, tab, valueFor]);
  const renderTierBody = useCallback((tier: Parameters<typeof renderSpecimenTierBody>[0], renderRow: Parameters<typeof renderSpecimenTierBody>[1]) => (
    renderSpecimenTierBody(tier, renderRow, { tab, state: specimen, valueFor })
  ), [specimen, tab, valueFor]);

  return <>
    {hasSpecimen && (
      <OnPageSpecimen
        enabled={renderOnPage}
        tab={tab}
        state={specimen}
        valueFor={valueFor}
        instanceConfig={instanceConfig}
      />
    )}
    <FlatTab tab={tab} getValue={getValue} setValue={setValue} deleteValue={deleteValue}
      overrides={overrides} contributions={contributions} renderTierBody={renderTierBody}
      sectionTestId={(tier) => `font-tier-${tier.id}`} actions={(
        <Fragment>
          {hasSpecimen && (
            <SpecimenToolbar
              state={specimen}
              showWidth={hasLineHeight}
              onChange={setSpecimen}
              renderOnPage={renderOnPage}
              onRenderOnPageChange={handleRenderOnPageChange}
            />
          )}
          <div className="tokenpanel-tab-actions"><div role="button" tabIndex={0} className="tokenpanel-action-link"
            onClick={resetAll} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); resetAll(); } }}>
            Reset Font
          </div></div>
        </Fragment>
      )} />
  </>;
}
