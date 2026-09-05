import { Island, type IslandProps } from '@takazudo/zfb';
import type { ComponentChildren } from 'preact';
import PlaygroundControls from './playground-controls';
import '../styles/global.css';

interface AppShellProps {
  title: string;
  activePath: string;
  lang?: string;
  children: ComponentChildren;
}

const navItems = [
  ['Home', '/'],
  ['English prose', '/prose/en/'],
  ['日本語の文章', '/prose/ja-sample/'],
];

export function AppShell({ title, activePath, lang = 'en', children }: AppShellProps) {
  return (
    <html lang={lang} data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('zfb-playground-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}",
          }}
        />
      </head>
      <body>
        <header class="zfb-topbar">
          <a class="zfb-brand" href="/">zdtp playground</a>
          <Island when="load" ssrFallback={<span aria-hidden="true" />}>
            {(<PlaygroundControls />) as unknown as IslandProps['children']}
          </Island>
        </header>
        <div class="zfb-layout">
          <nav class="zfb-nav" aria-label="Playground pages">
            {navItems.map(([label, href]) => (
              <a class={activePath === href ? 'zfb-nav__link is-active' : 'zfb-nav__link'} href={href}>
                {label}
              </a>
            ))}
            <div class="zfb-nav__manifest">
              <span class="zfb-eyebrow">MANIFEST</span>
              <a class="zfb-nav__link" href={`${activePath}?manifest=zudo-doc`}>
                Try the zudo-doc manifest
              </a>
              <p class="zfb-nav__note">
                Switch from the compact playground tour to the real vendored zudo-doc configuration.
              </p>
            </div>
          </nav>
          <main class="zfb-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
