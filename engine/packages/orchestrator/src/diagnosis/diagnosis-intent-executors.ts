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
} from "../inspection/gameplay-intent-stage.js";
import {
  indexSelectedArtifactContractSources,
} from "../inspection/inspect-contract-source.js";
import type {
  InspectionSourceIndex,
} from "../inspection/inspect-source-index.js";

export const INTENT_GROUNDING_EXECUTOR_REVISION =
  "intent-grounding-executor:3";
export const CONTRACT_EVIDENCE_EXECUTOR_REVISION =
  "contract-evidence-executor:1";

export interface IntentGroundingDiagnosisPayload {
  id: string;
  sourceIndex: InspectionSourceIndex;
  artifactId?: string;
}

export interface ContractEvidenceDiagnosisPayload
  extends IntentGroundingDiagnosisPayload {
  root: string;
  artifactId: string;
  files: readonly FileInventoryEntry[];
  contractSourceRoots?: readonly string[];
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

function parseContractEvidencePayload(
  payload: unknown,
): ContractEvidenceDiagnosisPayload | undefined {
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
    record.contractSourceRoots !== undefined &&
    (
      !Array.isArray(record.contractSourceRoots) ||
      !record.contractSourceRoots.every(
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
    ...(record.contractSourceRoots === undefined
      ? {}
      : {
          contractSourceRoots:
            record.contractSourceRoots as readonly string[],
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

function contractEvidencePresent(
  model: ReturnType<
    typeof buildGameplayIntentModel
  >,
  contractScripts: readonly {
    parsed: {
      source: {
        relativePath: string;
      };
    };
  }[],
): boolean {
  const contractPaths = new Set(
    contractScripts.map(
      (item) => item.parsed.source.relativePath,
    ),
  );
  const contractEvidenceIds = new Set(
    model.evidence
      .filter(
        (item) =>
          item.scope === "selected-artifact" &&
          contractPaths.has(item.locator),
      )
      .map((item) => item.id),
  );

  const hasContractEvidence = (
    evidenceIds: readonly string[],
  ): boolean =>
    evidenceIds.some((id) =>
      contractEvidenceIds.has(id),
    );

  return (
    model.nodes.some(
      (item) =>
        item.status === "authored" &&
        hasContractEvidence(item.evidenceIds),
    ) ||
    model.edges.some(
      (item) =>
        item.status === "authored" &&
        hasContractEvidence(item.evidenceIds),
    ) ||
    model.invariants.some(
      (item) =>
        item.status === "authored" &&
        hasContractEvidence(item.evidenceIds),
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

export function createContractEvidenceDiagnosisExecutor():
  DiagnosisCapabilityExecutor {
  return {
    executorId:
      "diagnosis.contract-evidence",
    executorRevision:
      CONTRACT_EVIDENCE_EXECUTOR_REVISION,

    async execute(
      request: DiagnosisExecutorRequest,
    ) {
      if (
        request.capabilityId !==
        "diagnosis.contract-evidence"
      ) {
        return {
          status: "blocked",
          reasons: [
            "Contract-evidence executor received the wrong diagnosis capability id.",
          ],
        };
      }

      const payload =
        parseContractEvidencePayload(
          request.payload,
        );

      if (!payload) {
        return {
          status: "blocked",
          reasons: [
            "Contract-evidence diagnosis payload must contain root, artifactId, file inventory, id, and source-index output.",
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
            "Contract evidence grounding is blocked because source-index coverage is incomplete.",
          ],
        };
      }

      let contractScripts;
      try {
        contractScripts =
          await indexSelectedArtifactContractSources(
            payload.root,
            payload.artifactId,
            payload.files,
            payload.contractSourceRoots === undefined
              ? {}
              : {
                  contractSourceRoots:
                    payload.contractSourceRoots,
                },
          );
      } catch (error) {
        return {
          status: "blocked",
          reasons: [
            "Contract evidence source indexing failed.",
            error instanceof Error
              ? error.message
              : String(error),
          ],
        };
      }

      if (contractScripts.length === 0) {
        return {
          status: "blocked",
          reasons: [
            "No additional selected-artifact contract source files were found in recognized or configured source roots.",
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
          contractScripts,
        });

      if (!contractEvidencePresent(output, contractScripts)) {
        return {
          status: "blocked",
          output,
          reasons: [
            "Contract source files were present, but they did not add grounded selected-artifact Gameplay Contract evidence.",
          ],
        };
      }

      return {
        status: "completed",
        output,
        evidence: [{
          level: "semantic",
          quality: "usable",
          traits: ["contract-evidence"],
          evidenceIds: [
            intentEvidenceId(
              "contract-evidence",
              CONTRACT_EVIDENCE_EXECUTOR_REVISION,
              output,
            ),
          ],
        }],
        reasons: [
          "Additional Gameplay Contract evidence was reconstructed from source files contained in the selected artifact.",
        ],
      };
    },
  };
}
