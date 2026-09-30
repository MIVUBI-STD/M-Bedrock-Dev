export interface ArenaResourceBudgetInput {
  resource: string;
  totalCapacity?: number;
  reservedCapacity?: number;
  perArenaCost: number;
}

export interface ArenaResourceCapacity {
  resource: string;
  status: "bounded" | "unbounded-by-this-resource" | "unknown";
  supportedArenas?: number;
  usableCapacity?: number;
  reason?: string;
}

export interface ArenaCapacityInput {
  configuredArenaCount: number;
  requiredConcurrentArenas?: number;
  resources: readonly ArenaResourceBudgetInput[];
}

export interface ArenaCapacityResult {
  status: "sufficient" | "insufficient" | "unknown";
  configuredArenaCount: number;
  requiredConcurrentArenas?: number;
  supportedConcurrentArenas?: number;
  bottlenecks: readonly string[];
  resources: readonly ArenaResourceCapacity[];
}

function validNonNegative(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

export function solveArenaConcurrencyCapacity(
  input: ArenaCapacityInput,
): ArenaCapacityResult {
  const resources: ArenaResourceCapacity[] = input.resources.map((item) => {
    if (!Number.isFinite(item.perArenaCost) || item.perArenaCost < 0) {
      return {
        resource: item.resource,
        status: "unknown",
        reason: "perArenaCost must be a finite non-negative number.",
      };
    }
    if (item.perArenaCost === 0) {
      return {
        resource: item.resource,
        status: "unbounded-by-this-resource",
      };
    }
    if (!validNonNegative(item.totalCapacity)) {
      return {
        resource: item.resource,
        status: "unknown",
        reason: "total capacity is unavailable.",
      };
    }

    const reserved = validNonNegative(item.reservedCapacity)
      ? item.reservedCapacity
      : 0;
    const usableCapacity = Math.max(0, item.totalCapacity - reserved);
    return {
      resource: item.resource,
      status: "bounded",
      usableCapacity,
      supportedArenas: Math.floor(usableCapacity / item.perArenaCost),
    };
  });

  const bounded = resources.filter(
    (item): item is ArenaResourceCapacity & { supportedArenas: number } =>
      item.status === "bounded" && item.supportedArenas !== undefined,
  );
  const unknown = resources.some((item) => item.status === "unknown");
  const supportedConcurrentArenas =
    bounded.length > 0
      ? Math.min(...bounded.map((item) => item.supportedArenas))
      : undefined;
  const bottlenecks =
    supportedConcurrentArenas === undefined
      ? []
      : bounded
          .filter(
            (item) => item.supportedArenas === supportedConcurrentArenas,
          )
          .map((item) => item.resource)
          .sort();

  const target =
    input.requiredConcurrentArenas ?? input.configuredArenaCount;

  const status =
    supportedConcurrentArenas === undefined
      ? "unknown"
      : supportedConcurrentArenas < target
        ? "insufficient"
        : unknown
          ? "unknown"
          : "sufficient";

  return {
    status,
    configuredArenaCount: input.configuredArenaCount,
    ...(input.requiredConcurrentArenas === undefined
      ? {}
      : { requiredConcurrentArenas: input.requiredConcurrentArenas }),
    ...(supportedConcurrentArenas === undefined
      ? {}
      : { supportedConcurrentArenas }),
    bottlenecks,
    resources,
  };
}
