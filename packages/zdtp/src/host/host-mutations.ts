export type DockEdge = 'right' | 'bottom';
export type DockReflow = 'body-margin' | 'none';

interface PriorDeclaration {
  value: string;
  priority: string;
}

interface HostMutationClaim {
  owner: string;
  edge: DockEdge;
  body: HTMLElement;
  root: HTMLElement;
  bodyProperty: 'margin-right' | 'margin-bottom';
  insetProperty: '--zdtp-dock-inset-right' | '--zdtp-dock-inset-bottom';
  priorBody: PriorDeclaration;
  priorInset: PriorDeclaration;
}

interface HostMutationRegistry {
  claims: Map<DockEdge, HostMutationClaim>;
  /** Host-owned nodes (for example the on-page specimen portal) by owner. */
  nodes: Map<string, Set<Element>>;
}

const HOST_MUTATIONS = Symbol.for('zdtp.hostMutations');

type RegistryWindow = Window & { [HOST_MUTATIONS]?: HostMutationRegistry };

function registry(targetWindow: Window): HostMutationRegistry {
  const shared = targetWindow as RegistryWindow;
  const existing = shared[HOST_MUTATIONS];
  if (existing) {
    // Keep the registry compatible with an older bundle that may already have
    // installed the dock-only shape on this window.  The on-page specimen is
    // deliberately an additive claim type, so a mixed-version page can still
    // release both kinds of host mutation safely.
    existing.nodes ??= new Map();
    return existing;
  }
  return (shared[HOST_MUTATIONS] = { claims: new Map(), nodes: new Map() });
}

function declaration(style: CSSStyleDeclaration, property: string): PriorDeclaration {
  return { value: style.getPropertyValue(property), priority: style.getPropertyPriority(property) };
}

function restore(style: CSSStyleDeclaration, property: string, prior: PriorDeclaration): void {
  if (prior.value === '') style.removeProperty(property);
  else style.setProperty(property, prior.value, prior.priority);
}

/**
 * Claim one host-document dock edge. Returns false when another panel owns it.
 * Re-claiming the same edge by the same owner updates its size without losing
 * the declaration snapshot captured by the first claim.
 */
export function claimHostDock(
  owner: string,
  edge: DockEdge,
  size: number,
  reflow: DockReflow = 'body-margin',
  doc: Document = document,
): boolean {
  const claims = registry(doc.defaultView ?? window).claims;
  const occupied = claims.get(edge);
  if (occupied && occupied.owner !== owner) return false;

  const bodyProperty = edge === 'right' ? 'margin-right' : 'margin-bottom';
  const insetProperty =
    edge === 'right' ? '--zdtp-dock-inset-right' : '--zdtp-dock-inset-bottom';
  const claim =
    occupied ??
    ({
      owner,
      edge,
      body: doc.body,
      root: doc.documentElement,
      bodyProperty,
      insetProperty,
      priorBody: declaration(doc.body.style, bodyProperty),
      priorInset: declaration(doc.documentElement.style, insetProperty),
    } satisfies HostMutationClaim);
  claims.set(edge, claim);

  const pixels = `${Math.max(0, size)}px`;
  claim.root.style.setProperty(insetProperty, pixels);
  if (reflow === 'body-margin') claim.body.style.setProperty(bodyProperty, pixels);
  else restore(claim.body.style, bodyProperty, claim.priorBody);
  return true;
}

/**
 * Claim a host-owned DOM node for one panel owner.
 *
 * The node is removed when `releaseHostMutations(owner)` runs.  Keeping this
 * ownership in the same window-level registry as dock declarations makes the
 * cleanup path robust when a panel is destroyed or an Astro swap removes the
 * Preact root before effect cleanups get a chance to run.  Claims are keyed by
 * owner, rather than by node identity, so a single owner can safely recreate
 * its portal during a navigation.
 */
export function claimHostNode(
  owner: string,
  node: Element,
  doc: Document = node.ownerDocument ?? document,
): void {
  const targetWindow = doc.defaultView ?? (typeof window !== 'undefined' ? window : null);
  if (!targetWindow) return;
  const nodes = registry(targetWindow).nodes.get(owner) ?? new Set<Element>();
  nodes.add(node);
  registry(targetWindow).nodes.set(owner, nodes);
}

/** Release every edge and host node owned by one panel and restore exact values. */
export function releaseHostMutations(owner: string, targetWindow?: Window): void {
  const win = targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win) return;
  const existing = (win as RegistryWindow)[HOST_MUTATIONS];
  if (!existing) return;
  for (const [edge, claim] of existing.claims) {
    if (claim.owner !== owner) continue;
    restore(claim.body.style, claim.bodyProperty, claim.priorBody);
    restore(claim.root.style, claim.insetProperty, claim.priorInset);
    existing.claims.delete(edge);
  }
  const nodes = existing.nodes?.get(owner);
  if (!nodes) return;
  for (const node of nodes) node.remove();
  existing.nodes.delete(owner);
}

/** Test-only reset that also restores outstanding declarations. */
export function __resetHostMutationsForTests(targetWindow: Window = window): void {
  const existing = (targetWindow as RegistryWindow)[HOST_MUTATIONS];
  if (!existing) return;
  for (const claim of existing.claims.values()) {
    restore(claim.body.style, claim.bodyProperty, claim.priorBody);
    restore(claim.root.style, claim.insetProperty, claim.priorInset);
  }
  existing.claims.clear();
  for (const nodes of existing.nodes?.values() ?? []) {
    for (const node of nodes) node.remove();
  }
  existing.nodes?.clear();
  delete (targetWindow as RegistryWindow)[HOST_MUTATIONS];
}
