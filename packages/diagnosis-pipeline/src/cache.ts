import { createHash } from "node:crypto";
import type {
  AnalysisEvidenceSnapshot,
  AnalysisExecutionContext,
} from "../../analysis-planner/src/index.js";

export interface DiagnosisCacheKeyInput {
  capabilityId: string;
  executorId: string;
  capabilityRevision: string;
  context: AnalysisExecutionContext;
  payload: unknown;
}

export interface CachedDiagnosisExecution {
  schemaVersion: 1;
  cacheKey: string;
  capabilityId: string;
  executorId: string;
  capabilityRevision: string;
  context: AnalysisExecutionContext;
  evidence: readonly AnalysisEvidenceSnapshot[];
  output: unknown;
  reasons: readonly string[];
}

export interface DiagnosisResultCache {
  get(
    cacheKey: string,
  ): CachedDiagnosisExecution | undefined | Promise<CachedDiagnosisExecution | undefined>;
  put(
    entry: CachedDiagnosisExecution,
  ): void | Promise<void>;
}

function canonical(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return {
      $type: "bigint",
      value: value.toString(),
    };
  }

  if (value === undefined) {
    return {
      $type: "undefined",
    };
  }

  if (value instanceof Date) {
    return {
      $type: "date",
      value: value.toISOString(),
    };
  }

  if (Array.isArray(value)) {
    return value.map(canonical);
  }

  if (value instanceof Map) {
    return {
      $type: "map",
      entries: [...value.entries()]
        .map(([key, child]) => [
          canonical(key),
          canonical(child),
        ])
        .sort((a, b) =>
          JSON.stringify(a[0]).localeCompare(
            JSON.stringify(b[0]),
          )
        ),
    };
  }

  if (value instanceof Set) {
    return {
      $type: "set",
      values: [...value]
        .map(canonical)
        .sort((a, b) =>
          JSON.stringify(a).localeCompare(
            JSON.stringify(b),
          )
        ),
    };
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>,
      )
        .sort(([left], [right]) =>
          left.localeCompare(right)
        )
        .map(([key, child]) => [
          key,
          canonical(child),
        ]),
    );
  }

  throw new Error(
    "Diagnosis cache fingerprint cannot canonicalize value of type " +
      typeof value +
      ".",
  );
}

export function diagnosisExecutionCacheKey(
  input: DiagnosisCacheKeyInput,
): string {
  const payload = canonical({
    schemaVersion: 1,
    capabilityId: input.capabilityId,
    executorId: input.executorId,
    capabilityRevision:
      input.capabilityRevision,
    context: input.context,
    payload: input.payload,
  });

  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function createInMemoryDiagnosisResultCache():
  DiagnosisResultCache {
  const entries =
    new Map<string, CachedDiagnosisExecution>();

  return {
    get(cacheKey) {
      const entry = entries.get(cacheKey);
      return entry;
    },

    put(entry) {
      entries.set(
        entry.cacheKey,
        entry,
      );
    },
  };
}
