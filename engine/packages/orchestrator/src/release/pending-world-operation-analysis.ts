export interface NativeWorldRecordObservation {
  key: string;
  value?: unknown;
  source?: string;
}

export interface PendingWorldOperation {
  kind: "chunk-loaded-request" | "structure-placement" | "deferred-world-mutation";
  key: string;
  source?: string;
  releaseBlocking: boolean;
  reason: string;
}

export interface PendingWorldOperationAnalysis {
  status: "clean" | "residue-detected";
  releaseBlocking: boolean;
  operations: readonly PendingWorldOperation[];
}

const PATTERNS: readonly {
  kind: PendingWorldOperation["kind"];
  pattern: RegExp;
  reason: string;
}[] = [
  {
    kind: "chunk-loaded-request",
    pattern: /chunk[_:-]?loaded[_:-]?request/i,
    reason: "Persisted chunk-loaded request can indicate deferred work that has not converged.",
  },
  {
    kind: "structure-placement",
    pattern: /(?:pending|queued)[_:-]?(?:structure|placement)|structure[_:-]?(?:pending|queue)/i,
    reason: "Persisted structure placement residue can leave world geometry dependent on later chunk activity.",
  },
  {
    kind: "deferred-world-mutation",
    pattern: /(?:pending|queued|deferred)[_:-]?(?:mutation|operation|world[_:-]?write)/i,
    reason: "Persisted deferred world mutation indicates unfinished authored work.",
  },
];

export function analyzePendingWorldOperations(
  records: readonly NativeWorldRecordObservation[],
): PendingWorldOperationAnalysis {
  const operations: PendingWorldOperation[] = [];

  for (const record of records) {
    for (const candidate of PATTERNS) {
      if (!candidate.pattern.test(record.key)) continue;
      operations.push({
        kind: candidate.kind,
        key: record.key,
        ...(record.source ? { source: record.source } : {}),
        releaseBlocking: true,
        reason: candidate.reason,
      });
      break;
    }
  }

  return {
    status: operations.length === 0 ? "clean" : "residue-detected",
    releaseBlocking: operations.length > 0,
    operations,
  };
}
