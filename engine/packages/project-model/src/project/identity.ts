import type { ComponentKind } from "./component.js";

export function semanticNodeId(
  kind: ComponentKind,
  scope: string,
  identifier: string,
): string {
  const cleanScope = scope.trim().toLowerCase();
  const cleanIdentifier = identifier.trim();

  if (!cleanScope || !cleanIdentifier) {
    throw new Error("Semantic node identity requires non-empty scope and identifier.");
  }

  return `${kind}:${cleanScope}:${cleanIdentifier}`;
}
