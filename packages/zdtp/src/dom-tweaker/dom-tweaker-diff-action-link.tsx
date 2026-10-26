/** @jsxImportSource @takazudo/zfb/zudo-react */
import type { PanelConfig } from '../config/panel-config';
import { RoleButton } from '../controls/role-button';
import type { DomTweakerController } from './dom-tweaker-context';

export interface DomTweakerDiffActionLinkProps {
  instanceConfig: PanelConfig;
  controller: DomTweakerController | null;
  onSelected?: () => void;
}

export function DomTweakerDiffActionLink({
  instanceConfig,
  controller,
  onSelected,
}: DomTweakerDiffActionLinkProps) {
  if (instanceConfig.domTweaker === undefined || controller === null) return null;

  return (
    <RoleButton
      class="tokenpanel-action-link"
      onClick={() => {
        controller.openDiffExport();
        onSelected?.();
      }}
    >
      DOM Tweaker diff
    </RoleButton>
  );
}
