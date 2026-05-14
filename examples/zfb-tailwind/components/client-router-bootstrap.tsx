"use client";

/**
 * ClientRouterBootstrap — `"use client"` island that registers the zfb-runtime
 * SPA router click intercept in the browser.
 *
 * Why this island is necessary
 * ----------------------------
 * `<ClientRouter />` (from `@takazudo/zfb-runtime`) emits opt-in meta tags and
 * global CSS into `<head>` at SSR time. Its module-level side-effect calls
 * `init()` — but only when `typeof document !== "undefined"`. During SSR the
 * guard is false, so the click intercept is never registered server-side.
 *
 * This island's sole job is to import `@takazudo/zfb-runtime/client-router` on
 * the client. The subpath's module-level code re-runs the same `init()` call
 * (idempotent) inside a real browser context, wiring up the router.
 *
 * Mount with `when="load"` (not `"visible"`) so the intercept is registered as
 * soon as the islands runtime mounts the marker — before the user can click any
 * link. Using `"visible"` risks a race where the island is still deferred when
 * the first navigation fires.
 *
 * Returns null — renders nothing visually.
 */

// Load-bearing side-effect import: registers click + form-submit intercepts.
// Must run client-side only (gated by the "use client" marker above).
import "@takazudo/zfb-runtime/client-router";
import type { JSX } from "preact";

function ClientRouterBootstrap(): JSX.Element | null {
  return null;
}

// Stable display name for SSR/hydration marker matching.
ClientRouterBootstrap.displayName = "ClientRouterBootstrap";

export default ClientRouterBootstrap;
