import type {
  DynamicPropertyAccess,
} from "../../core/types.js";

export type PersistentStateScope =
  | "player"
  | "entity"
  | "arena"
  | "session"
  | "world"
  | "unknown";

export interface PersistentStateScopeEvidence {
  propertyId: string;
  scope: PersistentStateScope;
  confidence: "exact-receiver" | "name-pattern" | "unknown";
  reasons: readonly string[];
}

export function inferPersistentStateScopes(
  accesses: readonly DynamicPropertyAccess[],
): PersistentStateScopeEvidence[] {
  const byProperty = new Map<
    string,
    DynamicPropertyAccess[]
  >();

  for (const access of accesses) {
    if (!access.propertyId) continue;
    const bucket =
      byProperty.get(access.propertyId) ?? [];
    bucket.push(access);
    byProperty.set(access.propertyId, bucket);
  }

  return [...byProperty.entries()]
    .map(([propertyId, items]) => {
      const receivers = items
        .map((item) =>
          item.receiverHint?.trim().toLowerCase()
        )
        .filter(
          (value): value is string =>
            Boolean(value),
        );

      if (
        receivers.some((value) =>
          /(?:^|\.)player$/.test(value) ||
          value.includes("player.")
        )
      ) {
        return {
          propertyId,
          scope: "player" as const,
          confidence: "exact-receiver" as const,
          reasons: [
            "Dynamic property is accessed through a player receiver.",
          ],
        };
      }

      if (
        receivers.some((value) =>
          /(?:^|\.)entity$/.test(value) ||
          value.includes("entity.")
        )
      ) {
        return {
          propertyId,
          scope: "entity" as const,
          confidence: "exact-receiver" as const,
          reasons: [
            "Dynamic property is accessed through an entity receiver.",
          ],
        };
      }

      if (
        /arena/i.test(propertyId)
      ) {
        return {
          propertyId,
          scope: "arena" as const,
          confidence: "name-pattern" as const,
          reasons: [
            "Property identifier contains an arena-scoped naming signal.",
          ],
        };
      }

      if (
        /(?:session|match|round)/i.test(propertyId)
      ) {
        return {
          propertyId,
          scope: "session" as const,
          confidence: "name-pattern" as const,
          reasons: [
            "Property identifier contains a session/match/round naming signal.",
          ],
        };
      }

      if (
        receivers.some((value) =>
          value === "world" ||
          value.endsWith(".world")
        )
      ) {
        return {
          propertyId,
          scope: "world" as const,
          confidence: "exact-receiver" as const,
          reasons: [
            "Dynamic property is accessed through the world receiver.",
          ],
        };
      }

      return {
        propertyId,
        scope: "unknown" as const,
        confidence: "unknown" as const,
        reasons: [
          "Available source evidence does not establish ownership scope.",
        ],
      };
    })
    .sort((a, b) =>
      a.propertyId.localeCompare(b.propertyId)
    );
}
