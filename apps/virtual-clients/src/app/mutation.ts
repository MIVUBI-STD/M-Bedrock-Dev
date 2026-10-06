export type OperationOutcome =
  | { ok: true }
  | { ok: false; error: unknown };

export interface MutationResult {
  operation: OperationOutcome;
  refresh: OperationOutcome;
}

/** Refresh backend truth even when an operation fails after a partial change. */
export async function settleMutation(
  operation: () => Promise<unknown>,
  refresh: () => Promise<unknown>,
): Promise<MutationResult> {
  let operationResult: OperationOutcome;
  try {
    await operation();
    operationResult = { ok: true };
  } catch (error) {
    operationResult = { ok: false, error };
  }

  let refreshResult: OperationOutcome;
  try {
    await refresh();
    refreshResult = { ok: true };
  } catch (error) {
    refreshResult = { ok: false, error };
  }
  return { operation: operationResult, refresh: refreshResult };
}
