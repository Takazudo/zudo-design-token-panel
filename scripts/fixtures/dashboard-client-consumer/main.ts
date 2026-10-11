import '@takazudo/zdtp/dashboard/styles.css';
import type { TokenDashboardHandle, TokenDashboardProps } from '@takazudo/zdtp/dashboard/client';

const host = document.querySelector<HTMLElement>('#dashboard-host')!;
const props: TokenDashboardProps = {
  tabs: [{ id: 'colors', label: 'Colors', tiers: [{
    id: 'palette', label: 'Palette', items: [{
      id: 'blue', label: 'Blue token', cssVar: '--blue', default: '#2563eb', type: { kind: 'color' },
    }],
  }] }],
};
let handle: TokenDashboardHandle | undefined;

declare global {
  interface Window {
    dashboardDemo: {
      mount(title?: string): Promise<void>;
      abandonImport(): Promise<void>;
      dispose(): void;
    };
  }
}

async function mount(title = 'Installed dashboard') {
  const { mountTokenDashboard } = await import('@takazudo/zdtp/dashboard/client');
  handle = mountTokenDashboard(host, { ...props, title });
}

async function abandonImport() {
  let active = true;
  const pending = import('@takazudo/zdtp/dashboard/client').then(({ mountTokenDashboard }) => {
    if (active) handle = mountTokenDashboard(host, props);
  });
  active = false;
  await pending;
}

Object.assign(window, {
  dashboardDemo: {
    mount,
    abandonImport,
    dispose: () => { handle?.dispose(); handle = undefined; },
  },
});
