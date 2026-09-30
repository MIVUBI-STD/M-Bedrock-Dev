import type {
  ParsedScriptFile,
  ScriptChunkLifecycleEvidence,
} from "../../../analyzers/scripts/src/index.js";

export interface ChunkLeaseAssessment {
  scriptId: string;
  leaseKey?: string;
  acquireRegions: readonly string[];
  releaseRegions: readonly string[];
  capacityCheckRegions: readonly string[];
  status:
    | "paired"
    | "acquire-without-release"
    | "release-without-acquire"
    | "dynamic-key"
    | "capacity-unchecked";
}

export interface ChunkLifecycleAnalysis {
  worldLoadObservers: number;
  entityLoadObservers: number;
  entityRemoveObservers: number;
  shutdownObservers: number;
  readinessProbes: number;
  tickingAreaAcquires: number;
  tickingAreaReleases: number;
  capacityChecks: number;
  pairedLeases: number;
  acquireWithoutRelease: number;
  releaseWithoutAcquire: number;
  dynamicLeaseKeys: number;
  capacityUncheckedLeases: number;
  shutdownOnlyCleanupRisk: number;
  entityResidencyObservability: "complete" | "partial" | "absent";
  leases: readonly ChunkLeaseAssessment[];
}

function evidenceFor(
  script: ParsedScriptFile,
): readonly ScriptChunkLifecycleEvidence[] {
  return script.chunkLifecycleEvidence ?? [];
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function analyzeScriptLeases(
  script: ParsedScriptFile,
): ChunkLeaseAssessment[] {
  const evidence = evidenceFor(script);
  const acquires = evidence.filter(
    (item) => item.kind === "ticking-area-acquire",
  );
  const releases = evidence.filter(
    (item) => item.kind === "ticking-area-release",
  );
  const capacity = evidence.filter(
    (item) =>
      item.kind === "ticking-area-capacity-check",
  );

  const keys = new Set<string | undefined>([
    ...acquires.map((item) => item.leaseKey),
    ...releases.map((item) => item.leaseKey),
  ]);

  return [...keys]
    .map((leaseKey): ChunkLeaseAssessment => {
      const keyAcquires = acquires.filter(
        (item) => item.leaseKey === leaseKey,
      );
      const keyReleases = releases.filter(
        (item) => item.leaseKey === leaseKey,
      );
      const hasCapacity = capacity.length > 0;

      let status: ChunkLeaseAssessment["status"];
      if (leaseKey === undefined) {
        status = "dynamic-key";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length === 0
      ) {
        status = "acquire-without-release";
      } else if (
        keyAcquires.length === 0 &&
        keyReleases.length > 0
      ) {
        status = "release-without-acquire";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length > 0 &&
        !hasCapacity
      ) {
        status = "capacity-unchecked";
      } else {
        status = "paired";
      }

      return {
        scriptId: script.identifier,
        ...(leaseKey === undefined
          ? {}
          : { leaseKey }),
        acquireRegions: uniqueSorted(
          keyAcquires.map(
            (item) => item.executionRegion,
          ),
        ),
        releaseRegions: uniqueSorted(
          keyReleases.map(
            (item) => item.executionRegion,
          ),
        ),
        capacityCheckRegions: uniqueSorted(
          capacity.map(
            (item) => item.executionRegion,
          ),
        ),
        status,
      };
    })
    .sort((a, b) =>
      (a.leaseKey ?? "").localeCompare(
        b.leaseKey ?? "",
      ),
    );
}

export function analyzeChunkLifecycle(
  scripts: readonly ParsedScriptFile[],
): ChunkLifecycleAnalysis {
  const all = scripts.flatMap(
    (script) => evidenceFor(script),
  );
  const leases = scripts
    .flatMap(analyzeScriptLeases)
    .sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      (a.leaseKey ?? "").localeCompare(
        b.leaseKey ?? "",
      ),
    );

  const worldLoadObservers = all.filter(
    (item) =>
      item.kind ===
      "world-load-subscription",
  ).length;
  const entityLoadObservers = all.filter(
    (item) =>
      item.kind ===
      "entity-load-subscription",
  ).length;
  const entityRemoveObservers = all.filter(
    (item) =>
      item.kind ===
      "entity-remove-subscription",
  ).length;
  const shutdownObservers = all.filter(
    (item) =>
      item.kind ===
      "shutdown-subscription",
  ).length;
  const readinessProbes = all.filter(
    (item) =>
      item.kind ===
      "chunk-readiness-probe",
  ).length;
  const tickingAreaAcquires = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-acquire",
  ).length;
  const tickingAreaReleases = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-release",
  ).length;
  const capacityChecks = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-capacity-check",
  ).length;

  const shutdownRegions = new Set(
    all
      .filter(
        (item) =>
          item.kind ===
          "shutdown-subscription",
      )
      .map((item) => item.executionRegion),
  );
  const nonShutdownRelease = all.some(
    (item) =>
      item.kind ===
        "ticking-area-release" &&
      !shutdownRegions.has(
        item.executionRegion,
      ),
  );

  const entityResidencyObservability =
    entityLoadObservers > 0 &&
    entityRemoveObservers > 0
      ? "complete"
      : entityLoadObservers > 0 ||
          entityRemoveObservers > 0
        ? "partial"
        : "absent";

  return {
    worldLoadObservers,
    entityLoadObservers,
    entityRemoveObservers,
    shutdownObservers,
    readinessProbes,
    tickingAreaAcquires,
    tickingAreaReleases,
    capacityChecks,
    pairedLeases: leases.filter(
      (item) => item.status === "paired",
    ).length,
    acquireWithoutRelease: leases.filter(
      (item) =>
        item.status ===
        "acquire-without-release",
    ).length,
    releaseWithoutAcquire: leases.filter(
      (item) =>
        item.status ===
        "release-without-acquire",
    ).length,
    dynamicLeaseKeys: leases.filter(
      (item) =>
        item.status === "dynamic-key",
    ).length,
    capacityUncheckedLeases: leases.filter(
      (item) =>
        item.status ===
        "capacity-unchecked",
    ).length,
    shutdownOnlyCleanupRisk:
      tickingAreaAcquires > 0 &&
      tickingAreaReleases > 0 &&
      shutdownObservers > 0 &&
      !nonShutdownRelease
        ? tickingAreaAcquires
        : 0,
    entityResidencyObservability,
    leases,
  };
}
