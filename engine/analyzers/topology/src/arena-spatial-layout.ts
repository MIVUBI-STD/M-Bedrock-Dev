import type { ArenaVector3 } from "./arena-replica.js";
import type { Translation3 } from "./signature.js";
import type { ArenaReplicaDiscovery } from "./arena-discovery.js";

export interface ArenaSpatialLayout {
  basis: "topology" | "script-config" | "reconciled";
  canonical: {
    arenaId: string;
    anchor: ArenaVector3;
  };
  replicas: readonly {
    arenaId: string;
    anchor: ArenaVector3;
  }[];
  offsets: readonly Translation3[];
  confidence: "low" | "medium" | "high";
}

export type ArenaSpatialLayoutSource =
  | ArenaReplicaDiscovery
  | ArenaSpatialLayout;

export function spatialLayoutFromReplicaDiscovery(
  discovery: ArenaReplicaDiscovery,
  basis: ArenaSpatialLayout["basis"] = "topology",
): ArenaSpatialLayout {
  return {
    basis,
    canonical: {
      arenaId: discovery.canonical.arenaId,
      anchor: discovery.canonical.anchor,
    },
    replicas: discovery.replicas.map((replica) => ({
      arenaId: replica.arenaId,
      anchor: replica.anchor,
    })),
    offsets: discovery.offsets,
    confidence: discovery.confidence,
  };
}
