import { createHash } from "node:crypto";
import type {
  FileInventoryEntry,
} from "../../../project-model/src/index.js";
import type {
  DiagnosisCapabilityExecutor,
  DiagnosisExecutorRequest,
} from "../../../diagnosis-pipeline/src/index.js";
import {
  buildGameplayIntentModel,
} from "../gameplay-intent-stage.js";
import {
  indexAuthoredIntentSources,
} from "../inspect-authored-intent-source.js";
import type {
  InspectionSourceIndex,
} from "../inspect-source-index.js";

export const INTENT_GROUNDING_EXECUTOR_REVISION =
  "intent-grounding-executor:3";
export const AUTHORED_INTENT_EXECUTOR_REVISION =
  "authored-intent-executor:4";

export interface IntentGroundingDiagnosisPayload {
  id: string;
  sourceIndex: InspectionSourceIndex;
  artifactId?: string;
}

export interface AuthoredIntentDiagnosisPayload
  extends IntentGroundingDiagnosisPayload {
  root: string;
  artifactId: string;
  files: readonly FileInventoryEntry[];
  authoredSourceRoots?: readonly string[];
}

function isSourceIndex(
  value: unknown,
): value is InspectionSourceIndex {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record =
    value as Record<string, unknown>;

  return (
    Array.isArray(record.parsedScripts) &&
    record.coverage !== undefined
  );
}

function parseIntentPayload(
  payload: unknown,
): IntentGroundingDiagnosisPayload | undefined {
  if (
    payload === null ||
    typeof payload !== "object"
  ) {
    return undefined;
  }

  const record =
    payload as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    !record.id.trim() ||
    !isSourceIndex(record.sourceIndex)
  ) {
    return undefined;
  }

  if (
    record.artifactId !== undefined &&
    typeof record.artifactId !== "string"
  ) {
    return undefined;
  }


  return {
    id: record.id,
    sourceIndex: record.sourceIndex,
    ...(record.artifactId === undefined
      ? {}
      : {
          artifactId:
            record.artifactId as string,
        }),
  };
}

function isFileInventoryEntry(
  value: unknown,
): value is FileInventoryEntry {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record =
    value as Record<string, unknown>;

  return (
    typeof record.relativePath === "string" &&
    typeof record.size === "number" &&
    typeof record.contentHash === "string"
  );
}

function parseAuthoredPayload(
  payload: unknown,
): AuthoredIntentDiagnosisPayload | undefined {
  const base = parseIntentPayload(payload);
  if (
    base === undefined ||
    payload === null ||
    typeof payload !== "object"
  ) {
    return undefined;
  }

  const record =
    payload as Record<string, unknown>;

  if (
    typeof record.root !== "string" ||
    !record.root.trim() ||
    typeof record.artifactId !== "string" ||
    !record.artifactId.trim() ||
    !Array.isArray(record.files) ||
    !record.files.every(isFileInventoryEntry)
  ) {
    return undefined;
  }

  if (
    record.authoredSourceRoots !== undefined &&
    (
      !Array.isArray(record.authoredSourceRoots) ||
      !record.authoredSourceRoots.every(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0,
      )
    )
  ) {
    return undefined;
  }


  return {
    ...base,
    root: record.root,
    artifactId: record.artifactId,
    files: record.files,
    ...(record.authoredSourceRoots === undefined
      ? {}
      : {
          authoredSourceRoots:
            record.authoredSourceRoots as readonly string[],
        }),
  };
}

function intentEvidenceId(
  prefix: string,
  executorRevision: string,
  value: unknown,
): string {
  return prefix +
    ":" +
    createHash("sha256")
      .update(
        JSON.stringify({
          executorRevision,
          value,
        }),
      )
      .digest("hex");
}

function authoredIntentPresent(
  model: ReturnType<
    typeof buildGameplayIntentModel
  >,
): boolean {
  return (
    model.nodes.some(
      (item) => item.status === "authored",
    ) ||
    model.edges.some(
      (item) => item.status === "authored",
    ) ||
    model.invariants.some(
      (item) => item.status === "authored",
    )
  );
}

export function createIntentGroundingDiagnosisExecutor():
  DiagnosisCapabilityExecutor {
  return {
    executorId:
      "diagnosis.intent-grounding",
    executorRevision:
      INTENT_GROUNDING_EXECUTOR_REVISION,

    async execute(
      request: DiagnosisExecutorRequest,
    ) {
      if (
        request.capabilityId !==
        "diagnosis.intent-grounding"
      ) {
        return {
          status: "blocked",
          reasons: [
            "Intent-grounding executor received the wrong diagnosis capability id.",
          ],
        };
      }

      const payload =
        parseIntentPayload(
          request.payload,
        );

      if (!payload) {
        return {
          status: "blocked",
          reasons: [
            "Intent-grounding diagnosis payload must contain id and a valid source-index output.",
          ],
        };
      }

      if (
        !payload.sourceIndex.coverage.complete
      ) {
        return {
          status: "blocked",
          output: payload.sourceIndex,
          reasons: [
            "Intent grounding is blocked because source-index coverage is incomplete.",
          ],
        };
      }

      const output =
        buildGameplayIntentModel({
          id: payload.id,
          ...(payload.artifactId === undefined
            ? {}
            : {
                artifactId:
                  payload.artifactId,
              }),
          parsedScripts:
            payload.sourceIndex
              .parsedScripts,
        });

      if (
        output.nodes.length === 0 ||
        output.evidence.length === 0
      ) {
        return {
          status: "blocked",
          output,
          reasons: [
            "No gameplay intent could be grounded from the available indexed scripts.",
          ],
        };
      }

      return {
        status: "completed",
        output,
        evidence: [{
          level: "semantic",
          quality: "usable",
          traits: ["intent-grounded"],
          evidenceIds: [
            intentEvidenceId(
              "gameplay-intent",
              INTENT_GROUNDING_EXECUTOR_REVISION,
              output,
            ),
          ],
        }],
        reasons: [
          "Gameplay intent was reconstructed only from the selected artifact source index.",
        ],
      };
    },
  };
}

export function createAuthoredIntentDiagnosisExecutor():
  DiagnosisCapabilityExecutor {
  return {
    executorId:
      "diagnosis.authored-intent",
    executorRevision:
      AUTHORED_INTENT_EXECUTOR_REVISION,

    async execute(
      request: DiagnosisExecutorRequest,
    ) {
      if (
        request.capabilityId !==
        "diagnosis.authored-intent"
      ) {
        return {
          status: "blocked",
          reasons: [
            "Authored-intent executor received the wrong diagnosis capability id.",
          ],
        };
      }

      const payload =
        parseAuthoredPayload(
          request.payload,
        );

      if (!payload) {
        return {
          status: "blocked",
          reasons: [
            "Authored-intent diagnosis payload must contain root, artifactId, file inventory, id, and source-index output.",
          ],
        };
      }

      if (
        !payload.sourceIndex.coverage.complete
      ) {
        return {
          status: "blocked",
          output: payload.sourceIndex,
          reasons: [
            "Authored intent grounding is blocked because source-index coverage is incomplete.",
          ],
        };
      }

      let authoredScripts;
      try {
        authoredScripts =
          await indexAuthoredIntentSources(
            payload.root,
            payload.artifactId,
            payload.files,
            payload.authoredSourceRoots === undefined
              ? {}
              : {
                  authoredSourceRoots:
                    payload.authoredSourceRoots,
                },
          );
      } catch (error) {
        return {
          status: "blocked",
          reasons: [
            "Authored intent source indexing failed.",
            error instanceof Error
              ? error.message
              : String(error),
          ],
        };
      }

      if (authoredScripts.length === 0) {
        return {
          status: "blocked",
          reasons: [
            "No explicit authored intent source files were found in recognized or configured authored source roots.",
          ],
        };
      }

      const output =
        buildGameplayIntentModel({
          id: payload.id,
          artifactId:
            payload.artifactId,
          parsedScripts:
            payload.sourceIndex
              .parsedScripts,
          authoredScripts,
        });

      if (!authoredIntentPresent(output)) {
        return {
          status: "blocked",
          output,
          reasons: [
            "Authored source files were present, but no gameplay-intent evidence was classified as authored.",
          ],
        };
      }

      return {
        status: "completed",
        output,
        evidence: [{
          level: "semantic",
          quality: "usable",
          traits: ["authored-intent"],
          evidenceIds: [
            intentEvidenceId(
              "authored-intent",
              AUTHORED_INTENT_EXECUTOR_REVISION,
              output,
            ),
          ],
        }],
        reasons: [
          "Gameplay intent was reconstructed from authored source files contained in the selected artifact.",
        ],
      };
    },
  };
}
