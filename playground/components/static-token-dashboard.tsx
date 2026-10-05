import { createElement } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { TokenDashboard, type TokenDashboardProps } from '@takazudo/zdtp/dashboard';

/** Keep the published Preact dashboard server-only across the zudo-react boundary. */
export function StaticTokenDashboard(props: TokenDashboardProps) {
  return <div style="display: contents" rawHtml={renderToString(createElement(TokenDashboard, props))} />;
}
