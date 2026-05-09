/*
 * App Router MDX component override hook.
 *
 * STATIC-EXPORT RULE: this file MUST be pure-JSX — no 'use client', no
 * useEffect, no hooks, no stateful behavior. Any client-only code here
 * would break `output: 'export'` because the exporter rejects dynamic /
 * runtime-mutable content in the MDX rendering path.
 *
 * The overrides below wire --nextexample-* prose tokens to MDX-generated
 * elements by assigning the .nextexample-prose container class on the
 * wrapper and relying on the CSS :where() rules in tokens.css for all
 * child element styling. This follows the MDX component-architecture
 * pattern (prose-token-contract.md: "Why MDX component overrides instead
 * of container-scoped CSS?").
 *
 * Reference: prose-token-contract.md, methodology/architecture/mdx-component-architecture.mdx
 */
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    // Wrap MDX page output in the prose container so tokens.css
    // .nextexample-prose :where(...) rules apply to all MDX elements.
    wrapper: ({ children }) => (
      <div className="nextexample-prose">{children}</div>
    ),
  };
}
