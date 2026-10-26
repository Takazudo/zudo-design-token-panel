/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, signal, type Child, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import { ControlledSelect, TextInput } from '../zr/form-controls';
import { Rebuild } from '../zr/rebuild';
import { toZrStyle } from '../zr/style';
import { getTokenController, type TokenController } from '../tabs/flat/token-controller';
import { tokenAddressKey as flatTokenAddressKey, type TokenAddress } from '../tabs/flat/types';
import type { ElementTokenMatch, FindTokensForElementResult } from './find-tokens-for-element';
import type { ElementInspectController } from './element-inspect-context';
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
  controller,
  onJumpToColorTab,
}: {
  controller: ReadonlySignal<TokenController>;
  onJumpToColorTab: () => void;
}): Child {
  const initial = controller.value;
  const { entry } = initial;
  const isReadonly = initial.readonly || entry.item.readonly === true;
  const value = computed(() => controller.value.value);

  if (initial.readonly) {
    const jumpToColorTab = initial.jumpTo ?? onJumpToColorTab;
    return (
      <div class="tokenpanel-element-inspect-color-value">
        <span
          class="tokenpanel-element-inspect-swatch"
          aria-hidden="true"
          style={computed(() => toZrStyle({ backgroundColor: value.value }))}
        />
        <span class="tokenpanel-element-inspect-resolved-value">
          {computed(() => value.value || 'unresolved')}
        </span>
        {jumpToColorTab ? (
          <RoleButton
            class="tokenpanel-element-inspect-jump"
            onClick={jumpToColorTab}
            aria-label={`Jump to Color tab for ${entry.item.cssVar}`}
          >
            jump to Color tab
          </RoleButton>
        ) : null}
      </div>
    );
  }

  const kind = entry.item.type.kind;
  if (entry.item.type.kind === 'length' || kind === 'number') {
    const unit = entry.item.type.kind === 'length' ? entry.item.type.unit : '';
    const draft = signal(parseNumber(value.value));
    let lastValue = value.value;
    const shown = computed(() => {
      // Re-seed the draft when the stored value changes from outside.
      const current = value.value;
      if (current !== lastValue) {
        lastValue = current;
        draft.value = parseNumber(current);
      }
      return draft.value;
    });
    return (
      <div class="tokenpanel-element-inspect-edit-value">
        <TextInput
          value={shown}
          disabled={isReadonly}
          class="tokenpanel-element-inspect-number-input"
          attrs={{ inputmode: 'decimal', 'aria-label': `${entry.item.cssVar} value` }}
          onInput={(raw) => {
            draft.value = raw;
            if (!raw.trim()) return;
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) controller.value.setValue(unit ? `${parsed}${unit}` : String(parsed));
          }}
          onBlur={() => {
            if (!draft.value.trim() || !Number.isFinite(Number(draft.value))) {
              draft.value = parseNumber(controller.value.value);
            }
          }}
        />
        {unit ? <span class="tokenpanel-element-inspect-unit">{unit}</span> : null}
      </div>
    );
  }

  if (entry.item.type.kind === 'select') {
    return (
      <ControlledSelect
        value={value}
        disabled={isReadonly}
        class="tokenpanel-element-inspect-select"
        aria-label={`${entry.item.cssVar} value`}
        onChange={(next) => controller.value.setValue(next)}
      >
        {entry.item.type.options.map((option) => <option value={option}>{option}</option>)}
      </ControlledSelect>
    );
  }

  return (
    <TextInput
      value={value}
      disabled={isReadonly}
      class="tokenpanel-element-inspect-text-input"
      attrs={{ 'aria-label': `${entry.item.cssVar} value`, spellcheck: false }}
      rawAttrs={{ autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off' }}
      onInput={(next) => controller.value.setValue(next)}
    />
  );
}

function InspectorTokenRow({
  match,
  address,
  inspect,
  onJumpToColorTab,
}: {
  match: ElementTokenMatch;
  address: TokenAddress;
  inspect: ElementInspectController;
  onJumpToColorTab: () => void;
}): Child {
  const controller = computed(() => getTokenController(inspect.tokens.value, address));
  const { item } = controller.value.entry;
  const from = match.inheritedFrom ? ` · from ${buildSummary(match.inheritedFrom)}` : '';
  return (
    <div
      class={match.confirmed
        ? 'tokenpanel-element-inspect-row'
        : 'tokenpanel-element-inspect-row is-unconfirmed'}
      data-testid="element-inspect-token-row"
      data-css-var={item.cssVar}
      data-address={flatTokenAddressKey(address)}
      data-confirmed={String(match.confirmed)}
    >
      <div class="tokenpanel-element-inspect-token-label">
        <span class="tokenpanel-element-inspect-token-var">{item.cssVar}</span>
        <span class="tokenpanel-element-inspect-token-id">{item.label}</span>
      </div>
      <div class="tokenpanel-element-inspect-property">
        <span class="tokenpanel-element-inspect-property-name">{match.property}</span>
        <span class="tokenpanel-element-inspect-expression" title={match.expression}>
          {`${match.expression}${from}`}
        </span>
        {!match.confirmed ? <span class="tokenpanel-element-inspect-not-confirmed">not confirmed</span> : null}
      </div>
      <InspectorValue controller={controller} onJumpToColorTab={onJumpToColorTab} />
    </div>
  );
}

function MatchSection({
  title,
  groups,
  emptyMessage,
  inspect,
  onJumpToColorTab,
}: {
  title: string;
  groups: FindTokensForElementResult['own'];
  emptyMessage?: string;
  inspect: ElementInspectController;
  onJumpToColorTab: () => void;
}): Child {
  const rows = groups.flatMap((group) =>
    group.matches.flatMap((match) => {
      const address = tokenAddressFor(match);
      return address
        ? [<InspectorTokenRow match={match} address={address} inspect={inspect} onJumpToColorTab={onJumpToColorTab} />]
        : [];
    }),
  );
  return (
    <div class="tokenpanel-element-inspect-section">
      <div role="heading" aria-level={3} class="tokenpanel-element-inspect-section-heading">{title}</div>
      {rows.length > 0
        ? <div class="tokenpanel-element-inspect-rows">{rows}</div>
        : <div class="tokenpanel-element-inspect-empty">{emptyMessage ?? 'No token-backed declarations found.'}</div>}
    </div>
  );
}

function PinnedView({
  pinned,
  result,
  inspect,
  onJumpToColorTab,
}: {
  pinned: Element;
  result: FindTokensForElementResult;
  inspect: ElementInspectController;
  onJumpToColorTab: () => void;
}): Child {
  const chain = ancestorChain(pinned);
  const breadcrumb = buildBreadcrumb(pinned);
  return (
    <div class="tokenpanel-element-inspect-view">
      <div
        class="tokenpanel-element-inspect-breadcrumb"
        aria-label={`Ancestor breadcrumb: ${breadcrumb}`}
      >
        <span class="tokenpanel-element-inspect-pinned-label">Pinned</span>
        {chain.map((element) => {
          const isPinned = element === pinned;
          return (
            <RoleButton
              class={isPinned
                ? 'tokenpanel-element-inspect-crumb is-pinned'
                : 'tokenpanel-element-inspect-crumb'}
              ariaProps={isPinned ? { 'aria-current': 'location' } : undefined}
              title={isPinned ? breadcrumb : `Pin ${buildSummary(element)}`}
              onClick={() => inspect.pin(element)}
            >
              {buildSummary(element)}
            </RoleButton>
          );
        })}
        <RoleButton
          class="tokenpanel-element-inspect-clear"
          onClick={inspect.clear}
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
        inspect={inspect}
        onJumpToColorTab={onJumpToColorTab}
      />
      {result.inherited.length > 0 ? (
        <MatchSection
          title="Inherited from ancestors"
          groups={result.inherited}
          inspect={inspect}
          onJumpToColorTab={onJumpToColorTab}
        />
      ) : null}
      {result.warnings.length > 0 ? (
        <div class="tokenpanel-element-inspect-warning" role="status">
          {result.warnings.join(' ')}
        </div>
      ) : null}
    </div>
  );
}

export interface ElementInspectViewProps {
  inspect: ElementInspectController | null;
  /** Invoked when the Color-tab jump link is selected. */
  onJumpToColorTab: () => void;
}

export function ElementInspectView({ inspect, onJumpToColorTab }: ElementInspectViewProps): Child {
  if (inspect === null) {
    return <div class="tokenpanel-element-inspect-empty">Element inspect is unavailable.</div>;
  }
  const view = computed(() => ({ pinned: inspect.pinned.value, result: inspect.result.value }));
  let last: { pinned: Element | null; result: FindTokensForElementResult | null } | null = null;
  const stable = computed(() => {
    const next = view.value;
    if (last && last.pinned === next.pinned && last.result === next.result) return last;
    last = next;
    return next;
  });
  return (
    <Rebuild value={stable}>
      {({ pinned, result }) => (!pinned || !result ? (
        <div class="tokenpanel-element-inspect-view">
          <div class="tokenpanel-element-inspect-empty tokenpanel-element-inspect-empty--start">
            Press <span class="tokenpanel-element-inspect-kbd">I</span> or click the inspect icon, then click any element on the page.
          </div>
        </div>
      ) : (
        <PinnedView pinned={pinned} result={result} inspect={inspect} onJumpToColorTab={onJumpToColorTab} />
      ))}
    </Rebuild>
  );
}
