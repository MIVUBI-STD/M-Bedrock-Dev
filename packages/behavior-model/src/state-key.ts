export function behaviorStateKey(
  variableId: string,
  scopeKey?: string,
): string {
  if (!variableId.trim()) {
    throw new Error(
      "Behavior variable id must be non-empty.",
    );
  }
  if (scopeKey === undefined) return variableId;
  if (!scopeKey.trim()) {
    throw new Error(
      "Behavior scopeKey must be non-empty when provided.",
    );
  }

  return variableId + "@[" +
    JSON.stringify(scopeKey) +
    "]";
}
