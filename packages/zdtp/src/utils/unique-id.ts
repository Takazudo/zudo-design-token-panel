let counter = 0;

/** Document-unique id suffix for ARIA wiring (the zudo-react stand-in for `useId`). */
export function uniqueId(): string {
  counter += 1;
  return `zr${counter}`;
}
