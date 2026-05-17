/**
 * Root component for the Vite + React example.
 *
 * Mounts BrowserRouter with the full route tree.
 *
 * Router basename
 * ---------------
 * `import.meta.env.BASE_URL` is injected by Vite from the `base` field in
 * vite.config.ts (`/pj/zudo-design-token-panel/examples/vite-react/` in
 * production, `/` in dev). Passing it as BrowserRouter `basename` makes all
 * react-router-dom `<Link to="/">` paths relative to that prefix automatically.
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

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Forms } from './pages/Forms';
import { Status } from './pages/Status';
import { Widgets } from './pages/Widgets';
import { Data } from './pages/Data';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
    </BrowserRouter>
  );
}
