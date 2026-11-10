import { Island } from '@takazudo/zfb';
import type { Child } from '@takazudo/zfb/zudo-react';
import DemoControls from './demo-controls';
import shell from './shell.module.css';

interface AppShellProps {
  title: string;
  activePath: string;
  children: Child;
}

const navItems = [
  ['Home', '/'],
  ['Notes', '/notes/'],
];

export function AppShell({ title, activePath, children }: AppShellProps) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <script
          rawHtml={"try{var t=localStorage.getItem('zdtp-demo-cssmodules-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}"}
        />
      </head>
      <body>
        <header class={shell.topbar}>
          <a class={shell.brand} href="/">zdtp css modules</a>
          <Island when="load" ssrFallback={<span aria-hidden="true" />}>
            <DemoControls />
          </Island>
        </header>
        <div class={shell.layout}>
          <nav class={shell.nav} aria-label="Demo pages">
            {navItems.map(([label, href]) => (
              <a class={`${shell.link} ${activePath === href ? shell.active : ''}`} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <main class={shell.main}>
            <div class={shell.stack}>{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
