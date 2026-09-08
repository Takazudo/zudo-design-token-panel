import { TokenDashboard } from '@takazudo/zdtp/dashboard';
import { tokenTabs, previewOverrides, previewText } from './token-data.js';

export default function Page({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  return <html lang="en" data-theme={theme}>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>External dashboard consumer</title>
      <link rel="stylesheet" href="./host.css" />
      <link rel="stylesheet" href="./dashboard.css" />
    </head>
    <body><main>
      <h1>Declared token reference</h1>
      <TokenDashboard id="light" tabs={tokenTabs} previewOverrides={previewOverrides} previewText={previewText} />
      <TokenDashboard id="dark" mode="dark" tabs={tokenTabs} previewOverrides={previewOverrides} previewText={previewText} />
      <TokenDashboard id="host-light-inv" chrome="host" mode="light" tabs={tokenTabs} previewOverrides={previewOverrides} previewText={previewText} />
      <TokenDashboard id="host-dark-inv" chrome="host" mode="dark" tabs={tokenTabs} previewOverrides={previewOverrides} previewText={previewText} />
      <div class="compact"><TokenDashboard id="compact" tabs={tokenTabs} previewOverrides={previewOverrides} previewText={previewText} /></div>
    </main></body>
  </html>;
}
