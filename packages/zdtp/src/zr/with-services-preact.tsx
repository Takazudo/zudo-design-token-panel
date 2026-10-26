import type { FunctionComponent } from 'preact';
import type { PanelServices } from './panel-services';
import { usePanelServices } from './panel-services-preact';

type WithoutServices<P> = Omit<P, 'services'>;

const identities = new WeakMap<object, number>();
let nextIdentity = 0;

function identityOf(value: unknown): string {
  if (typeof value !== 'object' || value === null) return String(value);
  let id = identities.get(value);
  if (id === undefined) {
    id = nextIdentity++;
    identities.set(value, id);
  }
  return String(id);
}

/**
 * Preact adapter for a bridged zudo-react panel part (epic #1075): reads the
 * panel's Preact contexts into the `services` object the zudo-react subtree
 * needs. Bridge statics are read once at mount, so a change to any prop named
 * in `remountOn` (e.g. a new tab config) remounts the part.
 */
export function withServices<P extends { services: PanelServices }>(
  Bridged: FunctionComponent<P>,
  remountOn: ReadonlyArray<keyof P>,
): FunctionComponent<WithoutServices<P>> {
  function WithPanelServices(props: WithoutServices<P>) {
    const services = usePanelServices();
    const record = props as Record<PropertyKey, unknown>;
    const key = remountOn.map((name) => identityOf(record[name])).join(':');
    return <Bridged key={key} {...(props as P)} services={services} />;
  }
  return WithPanelServices;
}
