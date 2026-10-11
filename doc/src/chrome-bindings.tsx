import { Island } from "@takazudo/zfb";
import { defineChromeBindings } from "@takazudo/zudo-doc/chrome-bindings";
import { DocPanelBootstrap } from "./panel-bootstrap";

function DesignTokenPanelBoundary() {
  return <><Island when="load"><DocPanelBootstrap /></Island></>;
}

export const chromeBindings = defineChromeBindings({
  DesignTokenPanelBootstrap: DesignTokenPanelBoundary,
});
