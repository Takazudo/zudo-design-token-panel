import { useContext, useMemo, useState, useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { RoleButton } from '../controls/role-button';
import { useTokenController } from '../tabs/flat/token-controller';
import { tokenAddressKey as flatTokenAddressKey, type TokenAddress } from '../tabs/flat/types';
import type { ElementTokenMatch } from './find-tokens-for-element';
import { ElementInspectContext } from './element-inspect-context';
import { buildBreadcrumb, buildSummary } from '../element-path/build-element-path';

function ancestorChain(element: Element): Element[] {
  const chain: Element[] = [];
  let current: Element | null = element;
  while (current && current.nodeType === 1 && current.tagName !== 'HTML') {
    chain.unshift(current);
    current = current.parentElement;
  }
  return chain;
}

function parseNumber(value: string): string {
  const match = value.trim().match(/^-?(?:\d+\.?\d*|\.\d+)/);
  return match?.[0] ?? '';
}

function tokenAddressFor(match: ElementTokenMatch): TokenAddress | null {
  const address = match.addresses[0];
  return address ? address : null;
}

function InspectorValue({
  match,
  onJumpToColorTab,
}: {
  match: ElementTokenMatch;
  onJumpToColorTab: () => void;
}): JSX.Element {
  const address = tokenAddressFor(match);
  if (!address) return <span className="tokenpanel-element-inspect-value-empty">unavailable</span>;
  return <InspectorValueForAddress address={address} onJumpToColorTab={onJumpToColorTab} />;
}

function InspectorValueForAddress({
  address,
  onJumpToColorTab,
}: {
  address: TokenAddress;
  onJumpToColorTab: () => void;
}): JSX.Element {
  const controller = useTokenController(address);
  const { entry } = controller;
  const isReadonly = controller.readonly || entry.item.readonly === true;
  const [draft, setDraft] = useState(() => parseNumber(controller.value));

  useEffect(() => setDraft(parseNumber(controller.value)), [controller.value]);

  if (controller.readonly) {
    const jumpToColorTab = controller.jumpTo ?? onJumpToColorTab;
    return (
      <div className="tokenpanel-element-inspect-color-value">
        <span
          className="tokenpanel-element-inspect-swatch"
          aria-hidden="true"
          style={{ backgroundColor: controller.value }}
        />
        <span className="tokenpanel-element-inspect-resolved-value">{controller.value || 'unresolved'}</span>
        {jumpToColorTab && (
          <RoleButton
            className="tokenpanel-element-inspect-jump"
            onClick={jumpToColorTab}
            aria-label={`Jump to Color tab for ${entry.item.cssVar}`}
          >
            jump to Color tab
          </RoleButton>
        )}
      </div>
    );
  }

  const kind = entry.item.type.kind;
  if (kind === 'length' || kind === 'number') {
    const unit = kind === 'length' ? entry.item.type.unit : '';
    return (
      <div className="tokenpanel-element-inspect-edit-value">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          disabled={isReadonly}
          className="tokenpanel-element-inspect-number-input"
          aria-label={`${entry.item.cssVar} value`}
          onInput={(event) => {
            const raw = event.currentTarget.value;
            setDraft(raw);
            if (!raw.trim()) return;
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) controller.setValue(unit ? `${parsed}${unit}` : String(parsed));
          }}
          onBlur={() => {
            if (!draft.trim() || !Number.isFinite(Number(draft))) {
              setDraft(parseNumber(controller.value));
            }
          }}
        />
        {unit && <span className="tokenpanel-element-inspect-unit">{unit}</span>}
      </div>
    );
  }

  if (kind === 'select') {
    return (
      <select
        value={controller.value}
        disabled={isReadonly}
        className="tokenpanel-element-inspect-select"
        aria-label={`${entry.item.cssVar} value`}
        onChange={(event) => controller.setValue(event.currentTarget.value)}
      >
        {entry.item.type.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={controller.value}
      disabled={isReadonly}
      className="tokenpanel-element-inspect-text-input"
      aria-label={`${entry.item.cssVar} value`}
      spellcheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      onInput={(event) => controller.setValue(event.currentTarget.value)}
    />
  );
}

function InspectorTokenRow({
  match,
  onJumpToColorTab,
}: {
  match: ElementTokenMatch;
  onJumpToColorTab: () => void;
}): JSX.Element | null {
  const address = tokenAddressFor(match);
  if (!address) return null;
  const controller = useTokenController(address);
  const from = match.inheritedFrom ? ` · from ${buildSummary(match.inheritedFrom)}` : '';
  return (
    <div
      className={match.confirmed
        ? 'tokenpanel-element-inspect-row'
        : 'tokenpanel-element-inspect-row is-unconfirmed'}
      data-testid="element-inspect-token-row"
      data-css-var={controller.entry.item.cssVar}
      data-address={flatTokenAddressKey(address)}
      data-confirmed={String(match.confirmed)}
    >
      <div className="tokenpanel-element-inspect-token-label">
        <span className="tokenpanel-element-inspect-token-var">{controller.entry.item.cssVar}</span>
        <span className="tokenpanel-element-inspect-token-id">{controller.entry.item.label}</span>
      </div>
      <div className="tokenpanel-element-inspect-property">
        <span className="tokenpanel-element-inspect-property-name">{match.property}</span>
        <span className="tokenpanel-element-inspect-expression" title={match.expression}>
          {match.expression}{from}
        </span>
        {!match.confirmed && <span className="tokenpanel-element-inspect-not-confirmed">not confirmed</span>}
      </div>
      <InspectorValue match={match} onJumpToColorTab={onJumpToColorTab} />
    </div>
  );
}

function MatchRows({
  matches,
  onJumpToColorTab,
}: {
  matches: readonly ElementTokenMatch[];
  onJumpToColorTab: () => void;
}): JSX.Element[] {
  return matches.flatMap((match) => {
    const address = tokenAddressFor(match);
    return address
      ? [<InspectorTokenRow
          key={`${match.property}-${match.cssVar}-${match.selector}-${match.expression}-${flatTokenAddressKey(address)}`}
          match={match}
          onJumpToColorTab={onJumpToColorTab}
        />]
      : [];
  });
}

function MatchSection({
  title,
  groups,
  emptyMessage,
  onJumpToColorTab,
}: {
  title: string;
  groups: readonly { property: string; matches: readonly ElementTokenMatch[] }[];
  emptyMessage?: string;
  onJumpToColorTab: () => void;
}): JSX.Element {
  const rows = groups.flatMap((group) => MatchRows({ matches: group.matches, onJumpToColorTab }));
  return (
    <div className="tokenpanel-element-inspect-section">
      <div role="heading" aria-level={3} className="tokenpanel-element-inspect-section-heading">{title}</div>
      {rows.length > 0
        ? <div className="tokenpanel-element-inspect-rows">{rows}</div>
        : <div className="tokenpanel-element-inspect-empty">{emptyMessage ?? 'No token-backed declarations found.'}</div>}
    </div>
  );
}

export interface ElementInspectViewProps {
  /** Invoked when the Color-tab jump link is selected. */
  onJumpToColorTab: () => void;
}

export function ElementInspectView({ onJumpToColorTab }: ElementInspectViewProps): JSX.Element {
  const context = useContext(ElementInspectContext);
  const pinned = context?.pinned ?? null;
  const chain = useMemo(() => (pinned ? ancestorChain(pinned) : []), [pinned]);
  const breadcrumb = pinned ? buildBreadcrumb(pinned) : '';

  if (context === null) {
    return <div className="tokenpanel-element-inspect-empty">Element inspect is unavailable.</div>;
  }

  const { result, pin, clear } = context;
  if (!pinned || !result) {
    return (
      <div className="tokenpanel-element-inspect-view">
        <div className="tokenpanel-element-inspect-empty tokenpanel-element-inspect-empty--start">
          Press <span className="tokenpanel-element-inspect-kbd">I</span> or click the inspect icon, then click any element on the page.
        </div>
      </div>
    );
  }

  return (
    <div className="tokenpanel-element-inspect-view">
      <div
        className="tokenpanel-element-inspect-breadcrumb"
        aria-label={`Ancestor breadcrumb: ${breadcrumb}`}
      >
        <span className="tokenpanel-element-inspect-pinned-label">Pinned</span>
        {chain.map((element, index) => {
          const isPinned = element === pinned;
          return (
            <RoleButton
              key={`${buildSummary(element)}-${index}`}
              className={isPinned
                ? 'tokenpanel-element-inspect-crumb is-pinned'
                : 'tokenpanel-element-inspect-crumb'}
              ariaProps={isPinned ? { 'aria-current': 'location' } : undefined}
              title={isPinned ? breadcrumb : `Pin ${buildSummary(element)}`}
              onClick={() => pin(element)}
            >
              {buildSummary(element)}
            </RoleButton>
          );
        })}
        <RoleButton
          className="tokenpanel-element-inspect-clear"
          onClick={clear}
          aria-label="Clear inspected element"
          title="Clear inspected element"
        >
          clear ✕
        </RoleButton>
      </div>

      <MatchSection
        title={`Tokens read by ${buildSummary(pinned)}`}
        groups={result.own}
        emptyMessage="This element has no token-backed declarations of its own — check the ancestors below."
        onJumpToColorTab={onJumpToColorTab}
      />
      {result.inherited.length > 0 && (
        <MatchSection
          title="Inherited from ancestors"
          groups={result.inherited}
          onJumpToColorTab={onJumpToColorTab}
        />
      )}
      {result.warnings.length > 0 && (
        <div className="tokenpanel-element-inspect-warning" role="status">
          {result.warnings.join(' ')}
        </div>
      )}
    </div>
  );
}
