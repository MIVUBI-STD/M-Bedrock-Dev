import type {
  PersistentDataLifecycleEvidence,
} from "./persistent-data-lifecycle.js";
import type {
  PersistentStateScopeEvidence,
} from "./persistent-state-scope.js";
import type {
  ScriptCleanupResourceEvidence,
} from "../cleanup/cleanup-resource-evidence.js";

export type PersistentStateLifetime =
  | "round"
  | "match"
  | "player-session"
  | "world"
  | "unknown";

export interface PersistentStateLifetimeEvidence {
  propertyId: string;
  lifetime: PersistentStateLifetime;
  confidence: "bounded" | "unknown";
  reasons: readonly string[];
}

export function inferPersistentStateLifetimes(
  lifecycles: readonly PersistentDataLifecycleEvidence[],
  scopes: readonly PersistentStateScopeEvidence[],
  _cleanup: readonly ScriptCleanupResourceEvidence[],
): PersistentStateLifetimeEvidence[] {
  // Resource release regions name game/round cleanup, but do not prove an
  // exact dynamic-property reset or its lifetime. Preserve this input for
  // existing callers without treating unrelated resource cleanup as proof.
  return scopes.map((scope) => {
    const lifecycle = lifecycles.find(
      (item) => item.propertyKey === scope.propertyId,
    );
    if (scope.scope === "player") {
      return {
        propertyId: scope.propertyId,
        // Dynamic properties remain persisted across reconnect; a player
        // receiver does not establish connection-session lifetime or cleanup.
        lifetime: "unknown" as const,
        confidence: "unknown" as const,
        reasons: [
          "Player receiver establishes ownership scope, not connection-session lifetime. Explicit reset or reconciliation evidence is required.",
        ],
      };
    }

    // append-with-clear proves a clear was observed somewhere in source,
    // not that every round/match exit clears this persisted property.
    // No exact lifecycle-generation / property reset binding is established.
    if (
      scope.scope === "world" &&
      lifecycle?.growth === "append-without-clear"
    ) {
      return {
        propertyId: scope.propertyId,
        lifetime: "world" as const,
        confidence: "bounded" as const,
        reasons: [
          "World-scoped persisted state grows without visible cleanup.",
        ],
      };
    }

    return {
      propertyId: scope.propertyId,
      lifetime: "unknown" as const,
      confidence: "unknown" as const,
      reasons: [
        "Current source evidence does not establish a bounded persistence lifetime.",
      ],
    };
  });
}
