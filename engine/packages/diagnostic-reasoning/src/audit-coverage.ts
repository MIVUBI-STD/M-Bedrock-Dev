import type {
  GameplayIntentModel,
  GameplayIntentNodeKind,
} from "../../gameplay-intent/src/index.js";

export const GAMEPLAY_AUDIT_SURFACE_KINDS = [
  "mechanic",
  "actor",
  "role",
  "objective",
  "phase",
  "state",
  "resource",
  "lifecycle",
  "spatial-region",
  "policy",
  "outcome",
] as const satisfies readonly GameplayIntentNodeKind[];

export type GameplayAuditSurfaceKind =
  (typeof GAMEPLAY_AUDIT_SURFACE_KINDS)[number];

export interface GameplayAuditSurface {
  readonly subjectId: string;
  readonly kind: GameplayAuditSurfaceKind;
  readonly label: string;
}

export type GameplayAuditCoverageStatus =
  | "checked"
  | "blocked"
  | "not-applicable";

export interface GameplayAuditCoverageRecord {
  readonly subjectId: string;
  readonly status: GameplayAuditCoverageStatus;
  readonly candidateIds?: readonly string[];
  readonly reason?: string;
}

export interface GameplayAuditCoverageResult {
  readonly disposition: "accounted" | "incomplete";
  readonly scope: "selected-artifact-discovery";
  readonly discoveryCompleteness: "complete" | "incomplete";
  readonly surfaces: readonly GameplayAuditSurface[];
  readonly records: readonly GameplayAuditCoverageRecord[];
  readonly missingSubjectIds: readonly string[];
  readonly unknownSubjectIds: readonly string[];
  readonly duplicateSubjectIds: readonly string[];
  readonly reasons: readonly string[];
}

export function buildGameplayAuditSurfaces(
  model: GameplayIntentModel,
): readonly GameplayAuditSurface[] {
  const allowed = new Set<GameplayIntentNodeKind>(
    GAMEPLAY_AUDIT_SURFACE_KINDS,
  );

  return model.nodes
    .filter(
      (node): node is typeof node & {
        kind: GameplayAuditSurfaceKind;
      } => allowed.has(node.kind),
    )
    .map((node) => ({
      subjectId: node.id,
      kind: node.kind,
      label: node.label,
    }))
    .sort((left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.subjectId.localeCompare(right.subjectId)
    );
}

export function evaluateGameplayAuditCoverage(
  model: GameplayIntentModel,
  records: readonly GameplayAuditCoverageRecord[],
  discoveryComplete = false,
): GameplayAuditCoverageResult {
  const surfaces = buildGameplayAuditSurfaces(model);
  const expected = new Set(
    surfaces.map((surface) => surface.subjectId),
  );

  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(
      record.subjectId,
      (counts.get(record.subjectId) ?? 0) + 1,
    );
  }

  const duplicateSubjectIds = [...counts]
    .filter(([, count]) => count > 1)
    .map(([subjectId]) => subjectId)
    .sort();

  const unknownSubjectIds = [...counts.keys()]
    .filter((subjectId) => !expected.has(subjectId))
    .sort();

  const covered = new Set(
    records
      .filter((record) => expected.has(record.subjectId))
      .map((record) => record.subjectId),
  );
  const missingSubjectIds = [...expected]
    .filter((subjectId) => !covered.has(subjectId))
    .sort();

  const invalidBlocked = records
    .filter(
      (record) =>
        record.status === "blocked" &&
        !record.reason?.trim(),
    )
    .map((record) => record.subjectId)
    .sort();

  const disposition =
    discoveryComplete &&
    duplicateSubjectIds.length === 0 &&
    unknownSubjectIds.length === 0 &&
    missingSubjectIds.length === 0 &&
    invalidBlocked.length === 0
      ? "accounted"
      : "incomplete";

  return {
    disposition,
    scope: "selected-artifact-discovery",
    discoveryCompleteness:
      discoveryComplete
        ? "complete"
        : "incomplete",
    surfaces,
    records: [...records],
    missingSubjectIds,
    unknownSubjectIds,
    duplicateSubjectIds,
    reasons: [
      ...(missingSubjectIds.length === 0
        ? []
        : [
            "Gameplay surfaces were skipped: " +
              missingSubjectIds.join(", ") +
              ".",
          ]),
      ...(unknownSubjectIds.length === 0
        ? []
        : [
            "Coverage records reference unknown gameplay surfaces: " +
              unknownSubjectIds.join(", ") +
              ".",
          ]),
      ...(duplicateSubjectIds.length === 0
        ? []
        : [
            "Gameplay surfaces were recorded more than once: " +
              duplicateSubjectIds.join(", ") +
              ".",
          ]),
      ...(invalidBlocked.length === 0
        ? []
        : [
            "Blocked gameplay surfaces require a concise reason: " +
              invalidBlocked.join(", ") +
              ".",
          ]),
      ...(!discoveryComplete
        ? [
            "Gameplay coverage cannot be accounted until selected-artifact Gameplay Discovery Closure is COMPLETE.",
          ]
        : []),
      ...(disposition === "accounted"
        ? [
            "Gameplay Discovery Closure is COMPLETE and every discovered gameplay surface has one explicit audit disposition.",
          ]
        : []),
    ],
  };
}
