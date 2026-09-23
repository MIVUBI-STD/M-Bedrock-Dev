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


export type StateObservedValue = string | number | boolean | null;

export interface StateValueObservation {
  surface: StateSurfaceRef;
  scopeKey: string;
  value: StateObservedValue;
  revision?: number;
  sourceRefs?: readonly SourceRef[];
}
