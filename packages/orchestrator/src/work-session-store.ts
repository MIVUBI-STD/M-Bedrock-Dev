import {
  mkdir,
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  atomicWriteText,
} from "../../repair/src/index.js";
import type {
  ProjectWorkspaceLayout,
  WorkSessionCheckpoint,
  WorkSessionStage,
} from "../../project-model/src/index.js";

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
  "blocked",
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

  if (
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
    !Number.isInteger(
      record.revision,
    ) ||
    (record.revision as number) <
      1 ||
    !artifact ||
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

  return record as unknown as
    WorkSessionCheckpoint;
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

  await mkdir(
    workspace.state,
    { recursive: true },
  );
  await atomicWriteText(
    pathFor(workspace),
    JSON.stringify(
      parsed,
      null,
      2,
    ) + "\n",
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
