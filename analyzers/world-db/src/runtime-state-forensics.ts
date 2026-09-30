export type WorldRuntimeStateKind =
  | "ticking-area"
  | "chunk-loaded-request"
  | "pending-structure"
  | "command-block"
  | "scheduled-tick"
  | "dynamic-property"
  | "actor"
  | "unknown";

export interface WorldRuntimeStateRecord {
  kind: WorldRuntimeStateKind;
  key: string;
  arenaId?: string;
  persistent?: boolean;
  active?: boolean;
  source?: string;
}

export interface WorldRuntimeStatePolicy {
  allowedGlobalKeys?: readonly string[];
  arenaScopedKinds?: readonly WorldRuntimeStateKind[];
  transientKinds?: readonly WorldRuntimeStateKind[];
}

export interface WorldRuntimeStateFinding {
  kind:
    | "unexpected-global-state"
    | "unscoped-arena-state"
    | "persistent-transient-state";
  record: WorldRuntimeStateRecord;
  reason: string;
}

export interface WorldRuntimeStateForensicReport {
  records: number;
  findings: readonly WorldRuntimeStateFinding[];
  countsByKind: Readonly<Record<string, number>>;
}

export function analyzeWorldRuntimeState(
  records: readonly WorldRuntimeStateRecord[],
  policy: WorldRuntimeStatePolicy = {},
): WorldRuntimeStateForensicReport {
  const allowedGlobal = new Set(policy.allowedGlobalKeys ?? []);
  const arenaScoped = new Set(policy.arenaScopedKinds ?? [
    "ticking-area",
    "pending-structure",
    "command-block",
  ]);
  const transient = new Set(policy.transientKinds ?? [
    "chunk-loaded-request",
    "pending-structure",
    "scheduled-tick",
  ]);
  const countsByKind: Record<string, number> = {};
  const findings: WorldRuntimeStateFinding[] = [];

  for (const record of records) {
    countsByKind[record.kind] = (countsByKind[record.kind] ?? 0) + 1;

    if (
      arenaScoped.has(record.kind) &&
      !record.arenaId &&
      !allowedGlobal.has(record.key)
    ) {
      findings.push({
        kind: "unscoped-arena-state",
        record,
        reason:
          "State type is expected to be arena-scoped, but no arena ownership is present.",
      });
    }

    if (
      transient.has(record.kind) &&
      record.persistent === true
    ) {
      findings.push({
        kind: "persistent-transient-state",
        record,
        reason:
          "A transient runtime surface is persisted and may survive longer than the gameplay phase that created it.",
      });
    }

    if (
      !record.arenaId &&
      record.active === true &&
      !allowedGlobal.has(record.key) &&
      record.kind !== "dynamic-property" &&
      record.kind !== "actor"
    ) {
      findings.push({
        kind: "unexpected-global-state",
        record,
        reason:
          "Active world runtime state is global but not explicitly allow-listed.",
      });
    }
  }

  return {
    records: records.length,
    findings,
    countsByKind: Object.fromEntries(
      Object.entries(countsByKind).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}
