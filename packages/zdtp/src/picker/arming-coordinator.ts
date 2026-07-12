/**
 * Single-owner coordinator for Alt-gesture picker arming.
 *
 * Multiple feature surfaces may listen for the same global Alt gesture. This
 * module keeps the actual armed owner exclusive: a new `requestArming(...)`
 * grants ownership to the caller and tells the previous owner to disarm.
 */

export interface ArmingOwner {
  /** Called when another feature takes over the Alt gesture. */
  onArmingRevoked: () => void;
}

let currentOwner: string | null = null;
const owners = new Map<string, ArmingOwner>();

export function registerArmingOwner(featureId: string, owner: ArmingOwner): () => void {
  owners.set(featureId, owner);

  return () => {
    if (owners.get(featureId) !== owner) return;
    owners.delete(featureId);
    if (currentOwner === featureId) currentOwner = null;
  };
}

export function requestArming(featureId: string): void {
  if (currentOwner === featureId) return;

  const previousOwner = currentOwner;
  currentOwner = featureId;

  if (previousOwner !== null) {
    owners.get(previousOwner)?.onArmingRevoked();
  }
}

export function releaseArming(featureId: string): void {
  if (currentOwner === featureId) currentOwner = null;
}

export function getCurrentArmingOwnerForTests(): string | null {
  return currentOwner;
}

export function __resetArmingCoordinatorForTests(): void {
  currentOwner = null;
  owners.clear();
}
