import type {
  ArenaReplicaDiscovery,
} from "../../../../analyzers/topology/src/index.js";
import type {
  ScriptArenaLayout,
} from "../inspection/script-safe-config-analysis.js";

export type ArenaLayoutReconciliationStatus =
  | "unavailable"
  | "script-only"
  | "topology-only"
  | "consistent"
  | "conflict";

export interface ArenaLayoutReconciliation {
  status: ArenaLayoutReconciliationStatus;
  topologyArenaCount?: number;
  scriptArenaCount?: number;
  topologyOffsets: readonly {
    x: number;
    y: number;
    z: number;
  }[];
  scriptOffsets: readonly {
    x: number;
    y: number;
    z: number;
  }[];
  mismatchedOffsets: readonly string[];
}

function key(
  point: { x: number; y: number; z: number },
): string {
  return `${point.x},${point.y},${point.z}`;
}

function normalizedTopologyOffsets(
  discovery: ArenaReplicaDiscovery,
) {
  return [
    { x: 0, y: 0, z: 0 },
    ...discovery.offsets,
  ].sort((a, b) =>
    a.x - b.x ||
    a.y - b.y ||
    a.z - b.z
  );
}

function normalizedScriptOffsets(
  layout: ScriptArenaLayout,
) {
  return [...layout.offsets].sort((a, b) =>
    a.x - b.x ||
    a.y - b.y ||
    a.z - b.z
  );
}

export function reconcileArenaLayouts(
  discovery: ArenaReplicaDiscovery | undefined,
  scriptLayout: ScriptArenaLayout | undefined,
): ArenaLayoutReconciliation {
  if (!discovery && !scriptLayout) {
    return {
      status: "unavailable",
      topologyOffsets: [],
      scriptOffsets: [],
      mismatchedOffsets: [],
    };
  }

  const topologyOffsets =
    discovery === undefined
      ? []
      : normalizedTopologyOffsets(discovery);
  const scriptOffsets =
    scriptLayout === undefined
      ? []
      : normalizedScriptOffsets(scriptLayout);

  if (!discovery) {
    return {
      status: "script-only",
      scriptArenaCount: scriptLayout!.arenaCount,
      topologyOffsets,
      scriptOffsets,
      mismatchedOffsets: [],
    };
  }

  if (!scriptLayout) {
    return {
      status: "topology-only",
      topologyArenaCount:
        1 + discovery.replicas.length,
      topologyOffsets,
      scriptOffsets,
      mismatchedOffsets: [],
    };
  }

  const topologyKeys = new Set(
    topologyOffsets.map(key),
  );
  const scriptKeys = new Set(
    scriptOffsets.map(key),
  );
  const mismatchedOffsets = [
    ...new Set([
      ...[...topologyKeys].filter(
        (item) => !scriptKeys.has(item),
      ),
      ...[...scriptKeys].filter(
        (item) => !topologyKeys.has(item),
      ),
    ]),
  ].sort();

  return {
    status:
      mismatchedOffsets.length === 0 &&
      topologyOffsets.length ===
        scriptOffsets.length
        ? "consistent"
        : "conflict",
    topologyArenaCount:
      1 + discovery.replicas.length,
    scriptArenaCount:
      scriptLayout.arenaCount,
    topologyOffsets,
    scriptOffsets,
    mismatchedOffsets,
  };
}
