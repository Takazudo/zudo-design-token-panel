/**
 * Root component for the Vite + React example.
 *
 * Mounts HashRouter with the full route tree.
 *
 * Why HashRouter (not BrowserRouter)
 * ----------------------------------
 * The production build is a vanilla static deploy under
 * `/pj/zudo-design-token-panel/examples/vite-react/` with no server-side
 * rewrite layer. Only `index.html` and `prose.html` exist on disk. If we
 * used BrowserRouter, opening or refreshing `/about`, `/forms`, etc. would
 * 404 because there is no matching HTML file. HashRouter encodes the route
 * in the URL fragment (`#/about`), which never reaches the server — the
 * existing index.html is always served. No basename is needed because the
 * hash is relative to whatever HTML page is loaded.
 *
 * AppShell + panel adapter
 * ------------------------
 * AppShell renders the topbar, sidenav, and an `<Outlet>` for page content.
 * It also mounts the panel adapter via a single `useEffect` so every route
 * in the tree gets the panel without each page repeating the boilerplate.
 * The StrictMode double-invocation is handled inside mountPanel via the
 * per-storagePrefix bind flag.
 *
 * Prose page
 * ----------
 * The prose demo lives in a separate MPA entry (prose.html / prose-main.tsx)
 * managed by the Vite multi-page build. It is NOT a React route. The sidenav
 * links to it via a plain anchor to `${import.meta.env.BASE_URL}prose.html`.
 */

import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Forms } from './pages/Forms';
import { Status } from './pages/Status';
import { Widgets } from './pages/Widgets';
import { Data } from './pages/Data';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="forms" element={<Forms />} />
          <Route path="status" element={<Status />} />
          <Route path="widgets" element={<Widgets />} />
          <Route path="data" element={<Data />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
