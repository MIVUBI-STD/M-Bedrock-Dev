import type {
  FileInventoryEntry,
} from "../../../project-model/src/index.js";
import type {
  DiagnosisCapabilityExecutor,
  DiagnosisExecutorRequest,
} from "../../../diagnosis-pipeline/src/index.js";
import {
  indexInspectionSources,
  type InspectionSourceIndex,
} from "../inspection/inspect-source-index.js";

export const SOURCE_INDEX_EXECUTOR_REVISION =
  "source-index-executor:2";

export interface SourceIndexDiagnosisPayload {
  root: string;
  artifactId: string;
  files: readonly FileInventoryEntry[];
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

function parsePayload(
  payload: unknown,
): SourceIndexDiagnosisPayload | undefined {
  if (
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

  return {
    root: record.root,
    artifactId: record.artifactId,
    files: record.files,
  };
}

function sourceEvidenceIds(
  payload: SourceIndexDiagnosisPayload,
  output: InspectionSourceIndex,
): string[] {
  const hashes = new Map(
    payload.files.map((file) => [
      file.relativePath,
      file.contentHash,
    ]),
  );

  const ids = output.nodes
    .map((node) => {
      const relativePath =
        node.source.relativePath;
      const hash = hashes.get(
        relativePath,
      );

      return hash === undefined
        ? undefined
        : "source-index:" +
            SOURCE_INDEX_EXECUTOR_REVISION +
            ":" +
            (node.parserVersion ??
              "parser-unknown") +
            ":" +
            payload.artifactId +
            ":" +
            hash +
            ":" +
            relativePath;
    })
    .filter(
      (value): value is string =>
        value !== undefined,
    );

  if (ids.length === 0) {
    ids.push(
      "source-index:" +
        SOURCE_INDEX_EXECUTOR_REVISION +
        ":" +
        payload.artifactId +
        ":recognized-source-empty",
    );
  }

  return [...new Set(ids)].sort();
}

export function createSourceIndexDiagnosisExecutor():
  DiagnosisCapabilityExecutor {
  return {
    executorId: "diagnosis.source-index",
    executorRevision:
      SOURCE_INDEX_EXECUTOR_REVISION,

    async execute(
      request: DiagnosisExecutorRequest,
    ) {
      if (
        request.capabilityId !==
        "diagnosis.source-index"
      ) {
        return {
          status: "blocked",
          reasons: [
            "Source-index executor received the wrong diagnosis capability id.",
          ],
        };
      }

      const payload =
        parsePayload(request.payload);

      if (!payload) {
        return {
          status: "blocked",
          reasons: [
            "Source-index diagnosis payload must provide root, artifactId, and a valid file inventory.",
          ],
        };
      }

      const output =
        await indexInspectionSources(
          payload.root,
          payload.artifactId,
          payload.files,
        );

      if (!output.coverage.complete) {
        return {
          status: "blocked",
          output,
          reasons: [
            "Source indexing coverage is incomplete; structural proof cannot be promoted.",
            ...output.coverage.parseFailures.map(
              (failure) =>
                failure.kind +
                " parse failure at " +
                failure.relativePath +
                ": " +
                failure.reason,
            ),
          ],
        };
      }

      return {
        status: "completed",
        output,
        evidence: [{
          level: "static",
          quality: "usable",
          traits: ["structural-proof"],
          evidenceIds:
            sourceEvidenceIds(
              payload,
              output,
            ),
        }],
        reasons: [
          "Recognized source files were indexed without parse coverage gaps.",
        ],
      };
    },
  };
}
