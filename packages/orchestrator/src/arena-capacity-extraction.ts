import type {
  ArenaReplicaDiscovery,
  Translation3,
} from "../../../analyzers/topology/src/index.js";
import type {
  ArenaCapacityReport,
  ArenaCapacityResource,
} from "../../../analyzers/diagnostics/src/index.js";
import {
  solveArenaConcurrencyCapacity,
} from "../../../analyzers/diagnostics/src/index.js";
import type {
  TickingAreaSemantics,
} from "../../../analyzers/commands/src/index.js";

export interface ArenaCommandTickingAreaRecord {
  semantics: TickingAreaSemantics;
  functionId: string;
  line?: number;
}

export interface ArenaCapacityExtractionInput {
  discovery?: ArenaReplicaDiscovery;
  tickingAreas: readonly ArenaCommandTickingAreaRecord[];
}

export interface ArenaCapacityExtractionEvidence {
  requestedConcurrentArenas?: number;
  commandTickingAreaAdds: number;
  completeCommandTickingAreaFamilies: number;
  unmatchedCommandTickingAreaAdds: number;
  commandTickingAreaResourceResolved: boolean;
  reasons: readonly string[];
}

export interface ArenaCapacityExtractionResult {
  resources: readonly ArenaCapacityResource[];
  evidence: ArenaCapacityExtractionEvidence;
  report?: ArenaCapacityReport;
}

function absolutePoint(
  coordinate:
    | { x: { mode: string; value: number }; y: { mode: string; value: number }; z: { mode: string; value: number } }
    | undefined,
): { x: number; y: number; z: number } | undefined {
  if (!coordinate) return undefined;
  if (
    coordinate.x.mode !== "absolute" ||
    coordinate.y.mode !== "absolute" ||
    coordinate.z.mode !== "absolute"
  ) {
    return undefined;
  }
  return {
    x: coordinate.x.value,
    y: coordinate.y.value,
    z: coordinate.z.value,
  };
}

function anchorForTickingArea(
  semantics: TickingAreaSemantics,
): { x: number; y: number; z: number } | undefined {
  if (semantics.action === "add-circle") {
    return absolutePoint(semantics.center);
  }
  if (semantics.action === "add-rectangle") {
    const from = absolutePoint(semantics.from);
    const to = absolutePoint(semantics.to);
    if (!from || !to) return undefined;
    return {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      z: Math.min(from.z, to.z),
    };
  }
  return undefined;
}

function shapeKey(
  semantics: TickingAreaSemantics,
): string | undefined {
  if (semantics.action === "add-circle") {
    return [
      "circle",
      semantics.radius,
      semantics.preload ?? false,
    ].join(":");
  }
  if (semantics.action === "add-rectangle") {
    const from = absolutePoint(semantics.from);
    const to = absolutePoint(semantics.to);
    if (!from || !to) return undefined;
    return [
      "rectangle",
      Math.abs(to.x - from.x),
      Math.abs(to.y - from.y),
      Math.abs(to.z - from.z),
      semantics.preload ?? false,
    ].join(":");
  }
  return undefined;
}

function offsetKey(
  offset: Translation3,
): string {
  return `${offset.x},${offset.y},${offset.z}`;
}

function pointKey(
  point: { x: number; y: number; z: number },
): string {
  return `${point.x},${point.y},${point.z}`;
}

function subtract(
  point: { x: number; y: number; z: number },
  offset: Translation3,
) {
  return {
    x: point.x - offset.x,
    y: point.y - offset.y,
    z: point.z - offset.z,
  };
}

export function extractArenaConcurrencyCapacity(
  input: ArenaCapacityExtractionInput,
): ArenaCapacityExtractionResult {
  const reasons: string[] = [];
  const requestedConcurrentArenas =
    input.discovery === undefined
      ? undefined
      : 1 + input.discovery.replicas.length;

  const addRecords = input.tickingAreas.flatMap((record) => {
    const anchor = anchorForTickingArea(record.semantics);
    const shape = shapeKey(record.semantics);
    return anchor && shape
      ? [{ record, anchor, shape }]
      : [];
  });

  const resources: ArenaCapacityResource[] = [];
  let completeFamilies = 0;
  let unmatched = addRecords.length;
  let commandResourceResolved = false;

  if (
    requestedConcurrentArenas !== undefined &&
    requestedConcurrentArenas > 0 &&
    input.discovery !== undefined &&
    addRecords.length > 0
  ) {
    const arenaOffsets: Translation3[] = [
      { x: 0, y: 0, z: 0 },
      ...input.discovery.offsets,
    ];

    const recordsByShapeAndPoint = new Map<string, number>();
    for (const item of addRecords) {
      const key = item.shape + "|" + pointKey(item.anchor);
      recordsByShapeAndPoint.set(
        key,
        (recordsByShapeAndPoint.get(key) ?? 0) + 1,
      );
    }

    const familyKeys = new Set<string>();
    for (const item of addRecords) {
      for (const offset of arenaOffsets) {
        const base = subtract(item.anchor, offset);
        familyKeys.add(item.shape + "|" + pointKey(base));
      }
    }

    const completeFamilyKeys: string[] = [];
    for (const familyKey of familyKeys) {
      const separator = familyKey.indexOf("|");
      const shape = familyKey.slice(0, separator);
      const [xText, yText, zText] = familyKey
        .slice(separator + 1)
        .split(",");
      const base = {
        x: Number(xText),
        y: Number(yText),
        z: Number(zText),
      };

      const complete = arenaOffsets.every((offset) => {
        const key =
          shape +
          "|" +
          pointKey({
            x: base.x + offset.x,
            y: base.y + offset.y,
            z: base.z + offset.z,
          });
        return (recordsByShapeAndPoint.get(key) ?? 0) > 0;
      });
      if (complete) completeFamilyKeys.push(familyKey);
    }

    completeFamilies = completeFamilyKeys.length;
    const matchedRecords =
      completeFamilies * requestedConcurrentArenas;
    unmatched = Math.max(
      0,
      addRecords.length - matchedRecords,
    );

    if (
      completeFamilies > 0 &&
      unmatched === 0 &&
      matchedRecords === addRecords.length
    ) {
      commandResourceResolved = true;
      resources.push({
        id: "command-tickingarea-slots",
        backend: "fixed-pool",
        perArena: completeFamilies,
        total: 10,
      });
      reasons.push(
        `Detected ${completeFamilies} complete /tickingarea add family/families repeated across all ${requestedConcurrentArenas} arena(s).`,
      );
    } else {
      reasons.push(
        "Command ticking-area usage could not be reduced to complete translated families across every detected arena; capacity remains unresolved.",
      );
    }
  } else if (addRecords.length > 0) {
    reasons.push(
      "Command ticking-area adds exist, but arena discovery is unavailable, so per-arena cost cannot be proven.",
    );
  }

  if (addRecords.length === 0) {
    reasons.push(
      "No command /tickingarea add usage was detected; command ticking-area capacity does not constrain the extracted model.",
    );
  }

  const report =
    requestedConcurrentArenas === undefined
      ? undefined
      : solveArenaConcurrencyCapacity(
          requestedConcurrentArenas,
          resources,
        );

  return {
    resources,
    evidence: {
      ...(requestedConcurrentArenas === undefined
        ? {}
        : { requestedConcurrentArenas }),
      commandTickingAreaAdds: addRecords.length,
      completeCommandTickingAreaFamilies:
        completeFamilies,
      unmatchedCommandTickingAreaAdds: unmatched,
      commandTickingAreaResourceResolved:
        commandResourceResolved,
      reasons,
    },
    ...(report === undefined ? {} : { report }),
  };
}
