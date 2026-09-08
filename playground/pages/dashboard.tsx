import { TokenDashboard } from '@takazudo/zdtp/dashboard';
import { dashboardFixtureTabs, dashboardPreviewText } from '../config/dashboard-fixtures';
import { defaultTabs } from '../config/default-manifest';
import { buildProvenanceLabel } from '../config/build-provenance';

// A self-contained subset: this spacing tier has no references to other tiers.
const spacing = defaultTabs.find((tab) => tab.id === 'spacing')!;
const compactTabs = [{ ...spacing, tiers: spacing.tiers.slice(0, 1) }];

export default function DashboardPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Static token dashboard — zdtp playground</title>
        <meta name="description" content="A static Preact token inventory with light, dark, and compact examples using the same playground manifest." />
        <link rel="stylesheet" href="/_generated/zdtp-dashboard.css" />
        <link rel="stylesheet" href="/dashboard-page.css" />
      </head>
      <body class="dashboard-page">
        <header class="dashboard-page__header">
          <a class="dashboard-page__brand" href="/">zdtp playground</a>
          <span class="dashboard-page__provenance">{buildProvenanceLabel()}</span>
        </header>
        <main class="dashboard-page__main">
          <div class="dashboard-page__intro">
            <p class="dashboard-page__eyebrow">STATIC TOKEN REFERENCE</p>
            <h1 class="dashboard-page__title">Your tokens, on a plain page.</h1>
            <p>
              These inventories render the playground’s shared token definitions with{' '}
              <code>TokenDashboard</code>. Both modes are visible together; each preview keeps
              its own values inside the component.
            </p>
            <p>
              This is a snapshot of declared defaults at build time. Saved panel edits and
              selected presets do not change it. Expressions stay readable as CSS; samples
              use the browser’s available fonts and layout context.
            </p>
            <nav class="dashboard-page__nav" aria-label="Dashboard examples">
              <a href="#light-defaults">Light defaults</a>
              <a href="#dark-defaults">Dark defaults</a>
              <a href="#compact-defaults">Compact example</a>
              <a href="#layout-examples">Rulers, ramps, and reading</a>
              <a href="https://zdtp.zudolab.dev/docs/recipes/static-token-dashboard/">Integration recipe</a>
            </nav>
          </div>

          <div class="dashboard-page__intro">
            <h2>Rulers, ramps, and reading</h2>
            <p>
              Spacing keeps its actual size: scroll a ruler without shrinking the value.
              Color stops share their declared ramp. Typography gets a full reading passage.
              The examples below include an intentional missing variable and an unsupported
              ruler expression, so you can see how unavailable samples stay readable.
            </p>
            <p>
              The custom English/Japanese passage is supplied with <code>previewText</code>
              during the build. It is static text, not an editable control.
            </p>
          </div>
          <TokenDashboard tabs={dashboardFixtureTabs} previewText={dashboardPreviewText}
            title="Rulers, ramps, and reading" id="layout-examples" />

          <TokenDashboard tabs={defaultTabs} mode="light" title="Light defaults" id="light-defaults" />
          <TokenDashboard tabs={defaultTabs} mode="dark" title="Dark defaults" id="dark-defaults" />

          <div class="dashboard-page__embed">
            <div class="dashboard-page__embed-copy">
              <p class="dashboard-page__eyebrow">INSIDE AN EXISTING PAGE</p>
              <p>
                The same component also fits into a documentation card. This example passes
                only the horizontal spacing tier and gives it a narrow container. Include
                referenced tiers too when choosing a subset of an aliased token family.
              </p>
              <p>
                Render it as ordinary Preact TSX during your site build and include the
                separate dashboard stylesheet. This page needs no client island or panel setup.
              </p>
            </div>
            <div class="dashboard-page__compact">
              <TokenDashboard tabs={compactTabs} title="Compact spacing reference" id="compact-defaults" />
            </div>
          </div>
        </main>
        <footer class="dashboard-page__footer">
          <a href="/">Back to the interactive playground</a>
          <span>Workspace build · Preact dashboard · static HTML and CSS</span>
        </footer>
      </body>
    </html>
  );
}
