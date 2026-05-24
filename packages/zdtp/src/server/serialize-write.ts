const inflight = new Map<string, Promise<unknown>>();

/**
 * Serialize file writes per absolute path. Concurrent calls for the same path
 * are chained so the next read-modify-write only starts after the previous
 * one settles (success or error). Calls for different paths run in parallel.
 */
export async function serializeFileWrite<T>(absPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = inflight.get(absPath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const swallowed = next.then(
    () => undefined,
    () => undefined,
  );
  inflight.set(absPath, swallowed);
  try {
    return await next;
  } finally {
    if (inflight.get(absPath) === swallowed) inflight.delete(absPath);
  }
}
