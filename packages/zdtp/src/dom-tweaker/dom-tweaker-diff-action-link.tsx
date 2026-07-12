import { useContext } from 'preact/hooks';
import type { JSX } from 'preact';
import type { PanelConfig } from '../config/panel-config';
import { RoleButton } from '../controls/role-button';
import { DomTweakerContext } from './dom-tweaker-context';

export interface DomTweakerDiffActionLinkProps {
  instanceConfig: PanelConfig;
  onSelected?: () => void;
}

export function DomTweakerDiffActionLink({
  instanceConfig,
  onSelected,
}: DomTweakerDiffActionLinkProps): JSX.Element | null {
  const ctx = useContext(DomTweakerContext);
  if (instanceConfig.domTweaker === undefined || ctx === null) return null;

  return (
    <RoleButton
      className="tokenpanel-action-link"
      onClick={() => {
        ctx.openDiffExport();
        onSelected?.();
      }}
    >
      DOM Tweaker diff
    </RoleButton>
  );
}
