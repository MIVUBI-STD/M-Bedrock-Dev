import type {
  MapCompatibilityFingerprint,
  MinecraftUpdateDelta,
  RegressionCase,
  ReliabilityDomain,
} from "../core/types.js";

export interface RegressionExecutionBinding {
  regressionId: string;
  scenarioId: string;
}

export type RegressionExecutionDisposition =
  | "runtime-ready"
  | "manual-required";

export interface RegressionExecutionQueueItem {
  regressionId: string;
  title: string;
  domain: ReliabilityDomain;
  priorityWeight: number;
  matchedCapabilityTags: readonly string[];
  domainMatched: boolean;
  updateOverlapIds: readonly string[];
  disposition: RegressionExecutionDisposition;
  scenarioId?: string;
  reasons: readonly string[];
}

export interface RegressionExecutionQueue {
  mapId: string;
  updateVersion: string;
  selectedRegressionIds: readonly string[];
  runtimeReady: readonly RegressionExecutionQueueItem[];
  manualRequired: readonly RegressionExecutionQueueItem[];
}

function updateOverlapIds(
  regression: RegressionCase,
  delta: MinecraftUpdateDelta,
): string[] {
  const capabilities = new Set(
    regression.capabilityTags,
  );
  return delta.entries
    .filter(
      (entry) =>
        entry.domain === regression.domain ||
        entry.capabilityTags.some((tag) =>
          capabilities.has(tag)
        ),
    )
    .map((entry) => entry.id)
    .sort();
}

function selectionWeight(input: {
  capabilityMatches: number;
  domainMatched: boolean;
  updateOverlaps: number;
}): number {
  return (
    input.capabilityMatches * 3 +
    (input.domainMatched ? 2 : 0) +
    input.updateOverlaps * 2
  );
}

export function buildRegressionExecutionQueue(
  fingerprint: MapCompatibilityFingerprint,
  delta: MinecraftUpdateDelta,
  regressions: readonly RegressionCase[],
  bindings: readonly RegressionExecutionBinding[] = [],
): RegressionExecutionQueue {
  const mapCapabilities = new Set(
    fingerprint.capabilityTags,
  );
  const mapDomains = new Set(
    fingerprint.domains,
  );
  const bindingByRegression = new Map(
    bindings.map((binding) => [
      binding.regressionId,
      binding,
    ]),
  );

  const selected: RegressionExecutionQueueItem[] = [];

  for (const regression of regressions) {
    const matchedCapabilityTags =
      regression.capabilityTags
        .filter((tag) =>
          mapCapabilities.has(tag)
        )
        .sort();
    const domainMatched =
      mapDomains.has(regression.domain);
    const overlaps = updateOverlapIds(
      regression,
      delta,
    );

    const relevant =
      matchedCapabilityTags.length > 0 ||
      domainMatched;

    if (!relevant) continue;

    const binding =
      bindingByRegression.get(regression.id);
    const priorityWeight = selectionWeight({
      capabilityMatches:
        matchedCapabilityTags.length,
      domainMatched,
      updateOverlaps: overlaps.length,
    });

    selected.push({
      regressionId: regression.id,
      title: regression.title,
      domain: regression.domain,
      priorityWeight,
      matchedCapabilityTags,
      domainMatched,
      updateOverlapIds: overlaps,
      disposition:
        binding === undefined
          ? "manual-required"
          : "runtime-ready",
      ...(binding === undefined
        ? {}
        : {
            scenarioId:
              binding.scenarioId,
          }),
      reasons: [
        ...(matchedCapabilityTags.length === 0
          ? []
          : [
              "Capability overlap: " +
                matchedCapabilityTags.join(", ") +
                ".",
            ]),
        ...(domainMatched
          ? [
              "Map domain matches historical regression domain: " +
                regression.domain +
                ".",
            ]
          : []),
        ...(overlaps.length === 0
          ? []
          : [
              "Minecraft update overlap: " +
                overlaps.join(", ") +
                ".",
            ]),
        ...(binding === undefined
          ? [
              "No explicit runtime scenario binding is registered; manual execution is required.",
            ]
          : [
              "Explicit runtime scenario binding is available: " +
                binding.scenarioId +
                ".",
            ]),
      ],
    });
  }

  selected.sort(
    (a, b) =>
      b.priorityWeight -
        a.priorityWeight ||
      a.regressionId.localeCompare(
        b.regressionId,
      ),
  );

  return {
    mapId: fingerprint.mapId,
    updateVersion: delta.toVersion,
    selectedRegressionIds:
      selected.map(
        (item) => item.regressionId,
      ),
    runtimeReady: selected.filter(
      (item) =>
        item.disposition ===
        "runtime-ready",
    ),
    manualRequired: selected.filter(
      (item) =>
        item.disposition ===
        "manual-required",
    ),
  };
}
