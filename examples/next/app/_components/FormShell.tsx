'use client';

/*
 * FormShell — small client-side wrapper around <form> that swallows the
 * browser's default submit (Enter in a field, click on a submit button) so
 * the demo route doesn't navigate away. The actual form fields stay in the
 * surrounding server component so this wrapper carries no children-specific
 * state — it just provides the onSubmit handler.
 */

import type { CSSProperties, FormEvent, ReactNode } from 'react';

interface FormShellProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function FormShell({ children, className, style }: FormShellProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
