import type { SourceRef } from "./source-ref.js";

export type StateSurfaceKind =
  | "scoreboard"
  | "tag"
  | "dynamic-property"
  | "entity-property"
  | "inventory"
  | "script-memory";

export interface StateSurfaceRef {
  kind: StateSurfaceKind;
  key: string;
}

export interface StateAuthorityContract {
  id: string;
  authority: StateSurfaceRef;
  mirrors: readonly StateSurfaceRef[];
  scope?: "player" | "entity" | "arena" | "round" | "world";
  sourceRefs?: readonly SourceRef[];
  purpose?: string;
}

export function stateSurfaceKey(surface: StateSurfaceRef): string {
  return surface.kind + ":" + surface.key;
}
