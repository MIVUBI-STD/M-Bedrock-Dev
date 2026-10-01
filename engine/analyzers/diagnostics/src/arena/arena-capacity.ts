import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../../packages/diagnostics/src/index.js";
import type { SourceRef } from "../../../../packages/project-model/src/index.js";

export type CapacityBackend =
  | "fixed-pool"
  | "reported-capacity"
  | "unbounded";

export interface ArenaCapacityResource {
  id: string;
  backend: CapacityBackend;
  perArena: number;
  total?: number;
  reserved?: number;
  reportedAvailable?: number;
}

export interface ArenaCapacityResourceResult {
  id: string;
  backend: CapacityBackend;
  safeConcurrentArenas: number | null;
  limiting: boolean;
  reason: string;
}

export interface ArenaCapacityReport {
  requestedConcurrentArenas: number;
  safeConcurrentArenas: number | null;
  ok: boolean;
  limitingResourceIds: readonly string[];
  resources: readonly ArenaCapacityResourceResult[];
}

function capacityFor(resource: ArenaCapacityResource): number | null {
  if (!Number.isFinite(resource.perArena) || resource.perArena < 0) {
    throw new Error(`Invalid perArena capacity cost for ${resource.id}.`);
  }
  if (resource.perArena === 0 || resource.backend === "unbounded") return null;

  if (resource.backend === "fixed-pool") {
    if (!Number.isFinite(resource.total) || resource.total! < 0) {
      throw new Error(`Fixed-pool resource ${resource.id} requires a non-negative total.`);
    }
    const reserved = resource.reserved ?? 0;
    if (!Number.isFinite(reserved) || reserved < 0) {
      throw new Error(`Invalid reserved capacity for ${resource.id}.`);
    }
    return Math.max(0, Math.floor((resource.total! - reserved) / resource.perArena));
  }

  if (
    !Number.isFinite(resource.reportedAvailable) ||
    resource.reportedAvailable! < 0
  ) {
    throw new Error(
      `Reported-capacity resource ${resource.id} requires reportedAvailable evidence.`,
    );
  }
  return Math.max(
    0,
    Math.floor(resource.reportedAvailable! / resource.perArena),
  );
}

export function solveArenaConcurrencyCapacity(
  requestedConcurrentArenas: number,
  resources: readonly ArenaCapacityResource[],
): ArenaCapacityReport {
  if (
    !Number.isInteger(requestedConcurrentArenas) ||
    requestedConcurrentArenas < 1
  ) {
    throw new Error("requestedConcurrentArenas must be a positive integer.");
  }

  const raw = resources.map((resource) => ({
    resource,
    capacity: capacityFor(resource),
  }));
  const finite = raw
    .map((item) => item.capacity)
    .filter((value): value is number => value !== null);
  const safeConcurrentArenas =
    finite.length === 0 ? null : Math.min(...finite);

  const limitingResourceIds =
    safeConcurrentArenas === null
      ? []
      : raw
          .filter((item) => item.capacity === safeConcurrentArenas)
          .map((item) => item.resource.id)
          .sort();

  const results: ArenaCapacityResourceResult[] = raw.map(
    ({ resource, capacity }) => ({
      id: resource.id,
      backend: resource.backend,
      safeConcurrentArenas: capacity,
      limiting:
        capacity !== null &&
        capacity === safeConcurrentArenas,
      reason:
        capacity === null
          ? "Resource does not constrain arena concurrency."
          : `Resource supports ${capacity} concurrent arena(s) at the declared per-arena cost.`,
    }),
  );

  return {
    requestedConcurrentArenas,
    safeConcurrentArenas,
    ok:
      safeConcurrentArenas === null ||
      safeConcurrentArenas >= requestedConcurrentArenas,
    limitingResourceIds,
    resources: results,
  };
}

export function arenaCapacityDiagnostics(
  report: ArenaCapacityReport,
  source?: SourceRef,
): DiagnosticFinding[] {
  if (report.ok) return [];
  return [
    createDiagnostic({
      code: "ARENA_CONCURRENCY_CAPACITY_SHORTFALL",
      severity: "critical",
      message:
        `Requested ${report.requestedConcurrentArenas} concurrent arena(s), but declared resources safely support ` +
        `${report.safeConcurrentArenas ?? "an unknown number of"} arena(s).`,
      ...(source === undefined ? {} : { source }),
      data: {
        requestedConcurrentArenas: report.requestedConcurrentArenas,
        safeConcurrentArenas: report.safeConcurrentArenas,
        limitingResourceIds: report.limitingResourceIds,
      },
    }),
  ];
}
