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
      const receiverKinds = items.map((item) => {
        const receiver = item.receiverHint?.trim().toLowerCase();
        if (!receiver) return undefined;
        if (/(?:^|\\.)player$/.test(receiver) ||
            receiver.includes("player.")) return "player" as const;
        if (/(?:^|\\.)entity$/.test(receiver) ||
            receiver.includes("entity.")) return "entity" as const;
        if (receiver === "world" || receiver.endsWith(".world")) {
          return "world" as const;
        }
        return undefined;
      });
      const known = [...new Set(receiverKinds.filter(
        (scope): scope is "player" | "entity" | "world" =>
          scope !== undefined,
      ))];

      // One property literal reused across player and world receivers is
      // NOT one shared state owner. Neither name nor first match wins.
      if (known.length > 1 ||
          (known.length > 0 && receiverKinds.some(kind => kind === undefined))) {
        return {
          propertyId,
          scope: "unknown" as const,
          confidence: "unknown" as const,
          reasons: [
            "The same property key is observed on conflicting or unresolved receivers; source evidence does not establish a unique state owner.",
          ],
        };
      }

      if (known.length === 1) {
        return {
          propertyId,
          scope: known[0]!,
          confidence: "exact-receiver" as const,
          reasons: [
            "All observed accesses use the same recognized receiver scope.",
          ],
        };
      }

      // Only use names when there is no exact receiver evidence.
      if (/arena/i.test(propertyId)) {
        return {
          propertyId,
          scope: "arena" as const,
          confidence: "name-pattern" as const,
          reasons: ["Property identifier contains an arena-scoped naming signal."],
        };
      }
      if (/(?:session|match|round)/i.test(propertyId)) {
        return {
          propertyId,
          scope: "session" as const,
          confidence: "name-pattern" as const,
          reasons: ["Property identifier contains a session/match/round naming signal."],
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
