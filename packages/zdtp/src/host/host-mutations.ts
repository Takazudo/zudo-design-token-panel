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
}

const HOST_MUTATIONS = Symbol.for('zdtp.hostMutations');

type RegistryWindow = Window & { [HOST_MUTATIONS]?: HostMutationRegistry };

function registry(targetWindow: Window): HostMutationRegistry {
  const shared = targetWindow as RegistryWindow;
  return (shared[HOST_MUTATIONS] ??= { claims: new Map() });
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

/** Release every edge owned by one panel and restore exact value + priority. */
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
  delete (targetWindow as RegistryWindow)[HOST_MUTATIONS];
}
