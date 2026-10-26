import { createContext } from 'preact';
import type { HighlightContextValue } from './highlight-context';

export type { HighlightContextValue } from './highlight-context';

export const HighlightContext = createContext<HighlightContextValue | null>(null);
