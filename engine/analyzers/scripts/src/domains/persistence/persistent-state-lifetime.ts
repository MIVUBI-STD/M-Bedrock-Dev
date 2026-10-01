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
  cleanup: readonly ScriptCleanupResourceEvidence[],
): PersistentStateLifetimeEvidence[] {
  const cleanupRegions = cleanup
    .filter((item) => item.action === "release")
    .map((item) => item.executionRegion.toLowerCase());

  return scopes.map((scope) => {
    const lifecycle = lifecycles.find(
      (item) => item.propertyKey === scope.propertyId,
    );
    const hasRoundCleanup = cleanupRegions.some((region) =>
      /round|resetlevel|cleanupround/.test(region)
    );
    const hasMatchCleanup = cleanupRegions.some((region) =>
      /match|game|arena|finish|cleanup/.test(region)
    );

    if (scope.scope === "player") {
      return {
        propertyId: scope.propertyId,
        lifetime: "player-session" as const,
        confidence: "bounded" as const,
        reasons: [
          "Property is player-scoped; no stronger shorter-lifetime proof was established.",
        ],
      };
    }

    if (
      lifecycle?.growth === "append-with-clear" &&
      hasRoundCleanup
    ) {
      return {
        propertyId: scope.propertyId,
        lifetime: "round" as const,
        confidence: "bounded" as const,
        reasons: [
          "Append/writeback state has visible cleanup in a round-oriented execution region.",
        ],
      };
    }

    if (
      lifecycle?.growth === "append-with-clear" &&
      hasMatchCleanup
    ) {
      return {
        propertyId: scope.propertyId,
        lifetime: "match" as const,
        confidence: "bounded" as const,
        reasons: [
          "Append/writeback state has visible cleanup in a match/game/arena-oriented execution region.",
        ],
      };
    }

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
