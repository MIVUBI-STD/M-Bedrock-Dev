import {
  mkdir,
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  atomicWriteText,
} from "../../../repair/src/index.js";
import type {
  ProjectWorkspaceLayout,
  WorkSessionCheckpoint,
  WorkSessionStage,
} from "../../../project-model/src/index.js";

const STAGES:
  readonly WorkSessionStage[] = [
  "new",
  "understood",
  "evidence-ready",
  "diagnosed",
  "repair-planned",
  "patched",
  "validated",
  "deliverable",
];

function pathFor(
  workspace:
    ProjectWorkspaceLayout,
): string {
  return join(
    workspace.state,
    "work-session.json",
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys =
    new Set(allowed);
  return Object.keys(value)
    .every((key) =>
      keys.has(key)
    );
}

function canonicalSetStrings(
  value: string[],
): string[] {
  return [...new Set(value)].sort();
}

function canonicalSequenceStrings(
  value: string[],
): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of value) {
    if (seen.has(item)) continue;
    seen.add(item);
    output.push(item);
  }

  return output;
}

function nonEmptyStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0,
    )
  );
}

function optionalNonEmptyString(
  value: unknown,
): value is string | undefined {
  return (
    value === undefined ||
    (
      typeof value === "string" &&
      value.trim().length > 0
    )
  );
}

export function parseWorkSessionCheckpoint(
  value: unknown,
): WorkSessionCheckpoint {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Work session checkpoint must be an object.",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;
  const artifact =
    record.artifact as
      | Record<string, unknown>
      | undefined;
  const references =
    record.references as
      | Record<string, unknown>
      | undefined;
  const audit =
    record.audit as
      | Record<string, unknown>
      | undefined;

  if (
    !hasOnlyKeys(
      record,
      [
        "schemaVersion",
        "sessionId",
        "goal",
        "artifact",
        "stage",
        "audit",
        "revision",
        "references",
        "nextActions",
        "blockers",
      ],
    ) ||
    record.schemaVersion !== 1 ||
    typeof record.sessionId !==
      "string" ||
    !record.sessionId.trim() ||
    typeof record.goal !==
      "string" ||
    !record.goal.trim() ||
    typeof record.stage !==
      "string" ||
    !STAGES.includes(
      record.stage as
        WorkSessionStage,
    ) ||
    (
      audit !== undefined &&
      (
        !hasOnlyKeys(
          audit,
          [
            "authority",
            "auditRevision",
            "currentStage",
            "allowedNextAction",
          ],
        ) ||
        audit.authority !== "selected-map-audit" ||
        typeof audit.auditRevision !== "string" ||
        !audit.auditRevision.trim() ||
        typeof audit.currentStage !== "string" ||
        ![
          "TARGET",
          "DISCOVERY",
          "UNDERSTAND",
          "MODEL",
          "STRESS",
          "PROVE",
          "REPORT",
          "COMPLETE",
        ].includes(audit.currentStage) ||
        typeof audit.allowedNextAction !== "string" ||
        ![
          "RESOLVE_BLOCKING_STAGE",
          "RESOLVE_DEFECTS",
          "PREPARE_REVIEW",
        ].includes(audit.allowedNextAction)
      )
    ) ||
    !Number.isInteger(
      record.revision,
    ) ||
    (record.revision as number) <
      1 ||
    !artifact ||
    !hasOnlyKeys(
      artifact,
      [
        "artifactId",
        "artifactFingerprint",
        "label",
        "version",
      ],
    ) ||
    typeof artifact.artifactId !==
      "string" ||
    !artifact.artifactId.trim() ||
    typeof artifact
      .artifactFingerprint !==
      "string" ||
    !artifact
      .artifactFingerprint
      .trim() ||
    !optionalNonEmptyString(
      artifact.label,
    ) ||
    !optionalNonEmptyString(
      artifact.version,
    ) ||
    !references ||
    !hasOnlyKeys(
      references,
      [
        "completedCapabilityIds",
        "evidenceIds",
        "semanticNodeIds",
        "proofClaimIds",
        "validationScenarioIds",
      ],
    ) ||
    !nonEmptyStringArray(
      references
        .completedCapabilityIds,
    ) ||
    !nonEmptyStringArray(
      references.evidenceIds,
    ) ||
    !nonEmptyStringArray(
      references.semanticNodeIds,
    ) ||
    !nonEmptyStringArray(
      references.proofClaimIds,
    ) ||
    !nonEmptyStringArray(
      references
        .validationScenarioIds,
    ) ||
    !nonEmptyStringArray(
      record.nextActions,
    ) ||
    !nonEmptyStringArray(
      record.blockers,
    )
  ) {
    throw new Error(
      "Work session checkpoint is structurally invalid.",
    );
  }

  return {
    schemaVersion: 1,
    sessionId:
      record.sessionId as string,
    goal:
      record.goal as string,
    artifact: {
      artifactId:
        artifact.artifactId as string,
      artifactFingerprint:
        artifact
          .artifactFingerprint as string,
      ...(artifact.label ===
      undefined
        ? {}
        : {
            label:
              artifact.label as string,
          }),
      ...(artifact.version ===
      undefined
        ? {}
        : {
            version:
              artifact.version as string,
          }),
    },
    stage:
      record.stage as
        WorkSessionStage,
    ...(audit === undefined
      ? {}
      : {
          audit: {
            authority: "selected-map-audit" as const,
            auditRevision:
              audit.auditRevision as string,
            currentStage:
              audit.currentStage as
                | "TARGET"
                | "DISCOVERY"
                | "UNDERSTAND"
                | "MODEL"
                | "STRESS"
                | "PROVE"
                | "REPORT"
                | "COMPLETE",
            allowedNextAction:
              audit.allowedNextAction as
                | "RESOLVE_BLOCKING_STAGE"
                | "RESOLVE_DEFECTS"
                | "PREPARE_REVIEW",
          },
        }),
    revision:
      record.revision as number,
    references: {
      completedCapabilityIds:
        canonicalSetStrings(
          references
            .completedCapabilityIds as
            string[],
        ),
      evidenceIds:
        canonicalSetStrings(
          references
            .evidenceIds as
            string[],
        ),
      semanticNodeIds:
        canonicalSetStrings(
          references
            .semanticNodeIds as
            string[],
        ),
      proofClaimIds:
        canonicalSetStrings(
          references
            .proofClaimIds as
            string[],
        ),
      validationScenarioIds:
        canonicalSetStrings(
          references
            .validationScenarioIds as
            string[],
        ),
    },
    nextActions:
      canonicalSequenceStrings(
        record.nextActions as
          string[],
      ),
    blockers:
      canonicalSetStrings(
        record.blockers as
          string[],
      ),
  };
}

export async function saveWorkSessionCheckpoint(
  workspace:
    ProjectWorkspaceLayout,
  checkpoint:
    WorkSessionCheckpoint,
): Promise<void> {
  const parsed =
    parseWorkSessionCheckpoint(
      checkpoint,
    );
  const existing =
    await loadWorkSessionCheckpoint(
      workspace,
    );

  if (
    existing !== undefined &&
    existing.sessionId !==
      parsed.sessionId
  ) {
    throw new Error(
      "Refusing to overwrite active work session " +
        existing.sessionId +
        " with different session " +
        parsed.sessionId +
        ".",
    );
  }

  if (
    existing !== undefined &&
    (
      existing.artifact.artifactId !==
        parsed.artifact.artifactId ||
      existing.artifact
        .artifactFingerprint !==
        parsed.artifact
          .artifactFingerprint
    )
  ) {
    throw new Error(
      "Refusing to rebind an existing work session to a different artifact identity or fingerprint.",
    );
  }

  if (existing !== undefined) {
    if (parsed.revision < existing.revision) {
      throw new Error(
        "Refusing stale work-session revision.",
      );
    }
    if (parsed.revision === existing.revision) {
      if (
        JSON.stringify(parsed) ===
        JSON.stringify(existing)
      ) {
        return;
      }
      throw new Error(
        "Refusing conflicting work-session content at the same revision.",
      );
    }
    if (
      parsed.revision !==
      existing.revision + 1
    ) {
      throw new Error(
        "Work-session revision must advance exactly one step.",
      );
    }
  }

  const serialized =
    JSON.stringify(
      parsed,
      null,
      2,
    ) + "\n";


  await mkdir(
    workspace.state,
    { recursive: true },
  );
  await atomicWriteText(
    pathFor(workspace),
    serialized,
  );
}

export async function loadWorkSessionCheckpoint(
  workspace:
    ProjectWorkspaceLayout,
): Promise<
  WorkSessionCheckpoint | undefined
> {
  try {
    const text =
      await readFile(
        pathFor(workspace),
        "utf8",
      );
    return parseWorkSessionCheckpoint(
      JSON.parse(text),
    );
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(
            (
              error as {
                code?: unknown;
              }
            ).code,
          )
        : undefined;

    if (code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}
