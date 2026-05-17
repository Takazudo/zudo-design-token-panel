'use client';

/*
 * RerenderVerify — extracted from app/page.tsx so that page can become a
 * server component (required for AppShell import — server components cannot
 * be imported from 'use client' files).
 *
 * Purpose: confirm panel state (`:root` CSS-var overrides) persists across
 * React state changes and child-subtree mount/unmount cycles.
 */

import { useCallback, useState } from 'react';

export default function RerenderVerify() {
  const [count, setCount] = useState(0);
  const [showChild, setShowChild] = useState(true);

  const bump = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const toggleChild = useCallback(() => {
    setShowChild((v) => !v);
  }, []);

  return (
    <section id="rerender-verify">
      <div role="heading" aria-level={2} className="nx-section-title" style={{ marginBottom: 'var(--nx-vsp-md)' }}>
        Verify across rerender
      </div>
      <div className="nx-card">
        Click the button to trigger a React rerender. Tweak any panel slider,
        then click again — the tweaked value should still apply, because the
        page reads CSS custom properties from <code>:root</code> rather than
        from React props. Toggle the child subtree to confirm React mount
        churn does not disturb the panel either.
      </div>
      <p style={{ marginTop: 'var(--nx-vsp-md)' }}>
        <button type="button" className="nx-button" onClick={bump}>
          Rerender ({' '}
          <span className="nx-rerender-counter">{count}</span> )
        </button>{' '}
        <button type="button" className="nx-button" onClick={toggleChild}>
          Toggle child subtree
        </button>
      </p>
      {showChild && (
        <div className="nx-card" style={{ marginTop: 'var(--nx-vsp-md)' }}>
          <strong>Child subtree present.</strong> This block mounts and
          unmounts on every toggle. The panel's own DOM root is appended by
          the adapter outside the React tree, so React reconciliation can
          never touch it.
        </div>
      )}
    </section>
  );
}
