/** Pure declared-default model. No panel state, configuration singleton or DOM. */
import type { BaseRoleKey } from '../config/cluster-config';
import type { SemanticValue, TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import type {
  DashboardDiagnostic,
  DashboardMode,
  DashboardModel,
  DashboardRow,
  DashboardTab,
  DashboardTier,
} from './types';

interface Node {
  row: DashboardRow;
  tab: TabConfig;
  tier?: TierConfig;
  item?: TierItem;
  baseRole?: BaseRoleKey;
  directReference?: Node;
  dependencies: Node[];
  contextDependent: boolean;
}

// This recognizes color keywords only to distinguish an authored ramp-item id
// from a literal. It is deliberately not a CSS validity/computed-color parser.
const COLOR_KEYWORDS = new Set((
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
  'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
  'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
  'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
  'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
  'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
  'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
  'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
  'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
  'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
  'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
  'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
  'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
  'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
  'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
  'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
  'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow ' +
  'yellowgreen transparent currentcolor inherit initial unset revert revert-layer'
).split(' '));

function looksLikeColorLiteral(value: string): boolean {
  return value.startsWith('#') || value.includes('(') || COLOR_KEYWORDS.has(value.toLowerCase());
}

const BASE_ROLES: readonly BaseRoleKey[] = [
  'background', 'foreground', 'cursor', 'selectionBg', 'selectionFg',
];

// Escaped CSS identifiers are intentionally unsupported in preview declarations.
const CSS_VARIABLE = /^--[\w\u0080-\uffff-]+$/u;

/**
 * Keep quoted strings opaque, discard comments, and reject declaration-breaking
 * syntax and escaped tokens outside strings. This conservative scan prevents
 * untrusted token values from becoming additional style properties or requests.
 * It does not claim that an accepted value is valid for a particular CSS type.
 */
function scanCss(value: string): { syntax: string; safe: boolean } {
  let syntax = '';
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '"' || char === "'") {
      const quote = char;
      let closed = false;
      for (i++; i < value.length; i++) {
        if (value[i] === '\\') i++;
        else if (value[i] === quote) { closed = true; break; }
        else if (/[\n\r\f]/.test(value[i])) return { syntax, safe: false };
      }
      if (!closed) return { syntax, safe: false };
      syntax += '""';
    } else if (char === '/' && value[i + 1] === '*') {
      const end = value.indexOf('*/', i + 2);
      if (end === -1) return { syntax, safe: false };
      syntax += ' ';
      i = end + 1;
    } else {
      const code = char.charCodeAt(0);
      if (/[;{}\\@]/.test(char) || code <= 8 || code === 11 || (code >= 14 && code <= 31) || code === 127) {
        return { syntax, safe: false };
      }
      if (char === '(') depth++;
      if (char === ')' && --depth < 0) return { syntax, safe: false };
      syntax += char;
    }
  }
  return {
    syntax,
    safe: depth === 0 && !/\b(?:url|(?:-webkit-)?image-set|image|cross-fade|element|paint|src)\s*\(/i.test(syntax) &&
      !/!\s*important\b/i.test(syntax),
  };
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    const group = groups.get(name) ?? [];
    group.push(item);
    groups.set(name, group);
  }
  return groups;
}

/**
 * Normalize the authored inventory for a static dashboard. Named color schemes,
 * stored changes, editor fallback values and pill.customDefault are not inputs.
 */
export function buildDashboardModel(
  tabs: readonly TabConfig[],
  mode: DashboardMode = 'light',
): DashboardModel {
  const model: DashboardModel = {
    mode, tabs: [], rows: [], declarations: Object.create(null), diagnostics: [],
  };
  const nodes: Node[] = [];
  const tokenTabs = tabs.filter((tab) => tab.id !== 'notes');
  const tabGroups = groupBy(tokenTabs, (tab) => tab.id);

  function diagnose(node: Node | undefined, code: string, message: string, severity: DashboardDiagnostic['severity'] = 'error'): void {
    const diagnostic: DashboardDiagnostic = { code, severity, message, ...(node ? { rowKey: node.row.key } : {}) };
    if (node?.row.diagnostics.some((entry) => entry.code === code && entry.message === message)) return;
    node?.row.diagnostics.push(diagnostic);
    model.diagnostics.push(diagnostic);
  }

  function addNode(tab: TabConfig, tier: DashboardTier, row: DashboardRow, item?: TierItem, sourceTier?: TierConfig, baseRole?: BaseRoleKey): void {
    tier.rows.push(row);
    model.rows.push(row);
    nodes.push({ row, tab, tier: sourceTier, item, baseRole, dependencies: [], contextDependent: false });
  }

  tokenTabs.forEach((tab, tabIndex) => {
    const outputTab: DashboardTab = { key: `tab-${tabIndex}`, id: tab.id, label: tab.label, tiers: [] };
    model.tabs.push(outputTab);
    tab.tiers.forEach((tier, tierIndex) => {
      const outputTier: DashboardTier = {
        key: `${outputTab.key}-tier-${tierIndex}`, id: tier.id, label: tier.label,
        preview: tier.preview, previewBase: tier.previewBase, rows: [],
      };
      outputTab.tiers.push(outputTier);
      tier.items.forEach((item, itemIndex) => addNode(tab, outputTier, {
        key: `${outputTier.key}-item-${itemIndex}`, tabId: tab.id, tierId: tier.id,
        itemId: item.id, label: item.label, cssVar: item.cssVar, kind: item.type.kind,
        source: 'item', defaultValue: item.default, declaredValue: item.default,
        cssValue: null, resolvedValue: null, references: [], diagnostics: [],
      }, item, tier));
    });

    const extras = tab.colorExtras;
    if (!extras) return;
    const baseTier: DashboardTier = {
      key: `${outputTab.key}-base-roles`, id: 'base-roles', label: 'Base roles', rows: [],
    };
    for (const role of BASE_ROLES) {
      const cssVar = extras.baseRoles[role];
      if (cssVar === undefined) continue;
      const value = extras.baseDefaults[role];
      addNode(tab, baseTier, {
        key: `${baseTier.key}-${role}`, tabId: tab.id, tierId: baseTier.id, itemId: role,
        label: role, cssVar, kind: 'color', source: 'base-role',
        defaultValue: value === undefined ? '' : String(value),
        declaredValue: value === undefined ? '(no declared default)' : `palette[${value}]`,
        cssValue: null, resolvedValue: null, references: [], diagnostics: [],
      }, undefined, undefined, role);
    }
    if (baseTier.rows.length > 0) outputTab.tiers.push(baseTier);
  });

  const variableGroups = groupBy(nodes, (node) => node.row.cssVar);
  for (const node of nodes) {
    if (!CSS_VARIABLE.test(node.row.cssVar)) diagnose(node, 'invalid-variable', `Unsupported CSS custom property name: ${node.row.cssVar}.`);
    if (variableGroups.get(node.row.cssVar)!.length > 1) diagnose(node, 'duplicate-variable', `Multiple declarations use ${node.row.cssVar}; none is selected.`);
    if (tabGroups.get(node.tab.id)!.length > 1) diagnose(node, 'duplicate-tab', `Multiple tabs use the id ${node.tab.id}.`);
    if (node.tier) {
      if (node.tab.tiers.filter((tier) => tier.id === node.tier!.id).length > 1) diagnose(node, 'duplicate-tier', `Multiple tiers use the id ${node.tier.id} in tab ${node.tab.id}.`);
      if (node.tier.items.filter((item) => item.id === node.item!.id).length > 1) diagnose(node, 'duplicate-item', `Multiple items use the id ${node.item!.id} in tier ${node.tier.id}.`);
    }
  }

  function reference(node: Node, target: Node): void {
    node.directReference = target;
    node.row.cssValue = `var(${target.row.cssVar})`;
  }

  function findTarget(node: Node, tabId: string, tierId: string, itemId: string): Node | undefined {
    const targetTabs = tabGroups.get(tabId) ?? [];
    if (targetTabs.length !== 1) {
      diagnose(node, targetTabs.length ? 'ambiguous-reference' : 'missing-reference', `Reference tab ${tabId} ${targetTabs.length ? 'is ambiguous' : 'does not exist'}.`);
      return undefined;
    }
    const tiers = targetTabs[0].tiers.filter((tier) => tier.id === tierId);
    if (tiers.length !== 1) {
      diagnose(node, tiers.length ? 'ambiguous-reference' : 'missing-reference', `Reference tier ${tabId}/${tierId} ${tiers.length ? 'is ambiguous' : 'does not exist'}.`);
      return undefined;
    }
    const matches = nodes.filter((target) => target.tab === targetTabs[0] && target.tier === tiers[0] && target.item?.id === itemId);
    if (matches.length !== 1) {
      diagnose(node, matches.length ? 'ambiguous-reference' : 'missing-reference', `Reference item ${tabId}/${tierId}/${itemId} ${matches.length ? 'is ambiguous' : 'does not exist'}.`);
      return undefined;
    }
    return matches[0];
  }

  function paletteTiers(node: Node): TierConfig[] {
    return node.tab.tiers.filter((tier) => !tier.semantic && !tier.referencesTier && tier.items.length > 0 && tier.items.every((item) => item.type.kind === 'color'));
  }

  function paletteReference(node: Node, index: number): void {
    const palettes = paletteTiers(node);
    // An explicit referencesTier identifies the legacy palette without guessing.
    const chosen = node.tier?.referencesTier
      ? palettes.filter((tier) => tier.id === node.tier!.referencesTier)
      : palettes;
    if (chosen.length !== 1) {
      diagnose(node, 'unsupported-palette', `A palette index requires one unambiguous declared palette tier; found ${chosen.length}.`);
      return;
    }
    if (!Number.isInteger(index) || index < 0 || index >= chosen[0].items.length) {
      diagnose(node, 'invalid-palette-index', `Palette index ${index} is outside the declared palette.`);
      return;
    }
    const item = chosen[0].items[index];
    const target = findTarget(node, node.tab.id, chosen[0].id, item.id);
    if (target) reference(node, target);
  }

  function baseReference(node: Node, role: BaseRoleKey): void {
    const index = node.tab.colorExtras?.baseDefaults[role];
    if (index === undefined) {
      diagnose(node, 'missing-base-default', `Base role ${role} has no explicit baseDefaults mapping.`);
      return;
    }
    paletteReference(node, index);
  }

  function semanticOverride(node: Node, value: SemanticValue): void {
    if (typeof value === 'number') {
      node.row.declaredValue = `palette[${value}]`;
      paletteReference(node, value);
    } else if (value === 'bg' || value === 'fg') {
      node.row.declaredValue = value;
      baseReference(node, value === 'bg' ? 'background' : 'foreground');
    } else if (typeof value === 'object' && value !== null && 'literal' in value) {
      const literal = typeof value.literal === 'string' ? value.literal : value.literal[mode];
      node.row.declaredValue = literal;
      node.row.cssValue = literal;
    } else if (typeof value === 'object' && value !== null && 'ref' in value) {
      const { tab = node.tab.id, tier, item } = value.ref;
      node.row.declaredValue = `${tab}/${tier}/${item}`;
      const target = findTarget(node, tab, tier, item);
      if (target) reference(node, target);
    } else {
      diagnose(node, 'invalid-semantic-default', 'Unsupported semantic default mapping.');
    }
  }

  for (const node of nodes) {
    if (node.baseRole) { baseReference(node, node.baseRole); continue; }
    const tier = node.tier!;
    const item = node.item!;
    const palettes = paletteTiers(node);
    const isSemantic = tier.semantic || (node.tab.colorExtras && palettes.some((palette) => palette.id === tier.referencesTier));
    const defaultPalettes = tier.referencesTier === undefined ? palettes : palettes.filter((palette) => palette.id === tier.referencesTier);
    const paletteMatches = defaultPalettes.flatMap((palette) => palette.items.filter((entry) => entry.id === item.default).map(() => palette));
    const overrides = node.tab.colorExtras?.semanticDefaults;
    if (isSemantic && overrides && Object.hasOwn(overrides, item.id)) {
      semanticOverride(node, overrides[item.id]);
    } else if (isSemantic && paletteMatches.length > 0) {
      if (paletteMatches.length > 1) {
        diagnose(node, 'ambiguous-reference', `Default ${item.default} names multiple palette items.`);
      } else {
        const target = findTarget(node, node.tab.id, paletteMatches[0].id, item.default);
        if (target) reference(node, target);
      }
    } else if (isSemantic && (item.default === 'bg' || item.default === 'fg')) {
      baseReference(node, item.default === 'bg' ? 'background' : 'foreground');
    } else if (tier.referencesTier !== undefined &&
      !(isSemantic && tier.referencesRamps?.length) &&
      !(tier.semantic && looksLikeColorLiteral(item.default))) {
      // A retained legacy palette pointer must not override modern semantic
      // literals or ramp mappings. Generic aliases still require their explicit tier.
      const target = findTarget(node, node.tab.id, tier.referencesTier, item.default);
      if (target) reference(node, target);
    } else if (isSemantic) {
      if (tier.referencesRamps?.length && !looksLikeColorLiteral(item.default)) {
        const separator = item.default.indexOf(':');
        const sources = separator === -1 ? [tier.referencesRamps[0]] : tier.referencesRamps.filter((source) => source.tier === item.default.slice(0, separator));
        if (sources.length !== 1) {
          diagnose(node, sources.length ? 'ambiguous-reference' : 'missing-reference', `Ramp source for ${item.default} ${sources.length ? 'is ambiguous' : 'does not exist'}.`);
        } else {
          const target = findTarget(node, sources[0].tab ?? node.tab.id, sources[0].tier, separator === -1 ? item.default : item.default.slice(separator + 1));
          if (target) reference(node, target);
        }
      } else {
        node.row.cssValue = item.default;
      }
    } else {
      node.row.cssValue = item.default;
    }
  }

  for (const node of nodes) {
    const value = node.row.cssValue;
    if (value === null) continue;
    const scanned = scanCss(value);
    if (!scanned.safe) {
      diagnose(node, 'unsafe-css', 'This declaration contains unsupported CSS syntax or a resource-loading function; preview omitted.');
      continue;
    }
    if (node.directReference) node.dependencies.push(node.directReference);
    for (const match of scanned.syntax.matchAll(/\bvar\(\s*(--[\w\u0080-\uffff-]+)\s*(?=[,)])/giu)) {
      const matches = variableGroups.get(match[1]) ?? [];
      if (matches.length > 1) diagnose(node, 'ambiguous-reference', `CSS reference ${match[1]} has multiple declarations.`);
      else if (matches.length === 1) node.dependencies.push(matches[0]);
      else {
        node.contextDependent = true;
        diagnose(node, 'external-reference', `CSS reference ${match[1]} is not in this inventory; its value depends on the host context or fallback.`, 'warning');
      }
    }
    node.dependencies = [...new Set(node.dependencies)];
    node.row.references = node.dependencies.map(({ row }) => ({ key: row.key, cssVar: row.cssVar, label: row.label }));
    if (/(?:^|[^\w-])(?:currentcolor|initial|inherit|unset|revert|revert-layer)(?=$|[^\w-])|\b(?:env|attr)\s*\(/i.test(scanned.syntax)) {
      node.contextDependent = true;
      diagnose(node, 'context-dependent', 'This CSS value depends on the surrounding document; no computed preview is claimed.', 'warning');
    }
  }

  const visited = new Set<Node>();
  const visiting: Node[] = [];
  function resolve(node: Node): void {
    if (visited.has(node)) return;
    const cycleStart = visiting.indexOf(node);
    if (cycleStart !== -1) {
      for (const member of visiting.slice(cycleStart)) diagnose(member, 'cyclic-reference', 'Declared references form a cycle.');
      return;
    }
    visiting.push(node);
    for (const dependency of node.dependencies) {
      resolve(dependency);
      if (dependency.row.diagnostics.some((entry) => entry.severity === 'error')) {
        diagnose(node, 'invalid-reference', `Referenced declaration ${dependency.row.cssVar} is invalid.`);
      } else if (dependency.contextDependent) {
        node.contextDependent = true;
        diagnose(node, 'context-dependent', `Referenced declaration ${dependency.row.cssVar} depends on the host context.`, 'warning');
      }
    }
    visiting.pop();
    visited.add(node);
    if (node.row.diagnostics.some((entry) => entry.severity === 'error')) node.row.cssValue = null;
    else if (!node.contextDependent) node.row.resolvedValue = node.directReference?.row.resolvedValue ?? node.row.cssValue;
  }
  for (const node of nodes) resolve(node);
  model.declarations = Object.fromEntries(nodes.filter((node) => node.row.cssValue !== null).map((node) => [node.row.cssVar, node.row.cssValue!]));
  return model;
}
