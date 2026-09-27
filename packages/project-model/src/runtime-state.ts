import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export type RuntimeStateScalar =
  | string
  | number
  | boolean
  | null;

export interface RuntimeStateObservation {
  path: string;
  value: RuntimeStateScalar;
  confidence: "observed" | "derived";
  origin:
    | "telemetry"
    | "runtime-probe"
    | "controlled-experiment"
    | "external";
  scope?: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}

export interface RuntimeStateSnapshot {
  schemaVersion: 1;
  observations: readonly RuntimeStateObservation[];
}

export interface RuntimeStateResolution {
  values: Readonly<Record<string, unknown>>;
  evidenceIds: readonly string[];
  conflicts: readonly {
    path: string;
    values: readonly RuntimeStateScalar[];
    evidenceIds: readonly string[];
  }[];
}

function assignPath(
  root: Record<string, unknown>,
  path: string,
  value: RuntimeStateScalar,
): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;

  let current = root;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (
      typeof existing !== "object" ||
      existing === null ||
      Array.isArray(existing)
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const leaf = parts.at(-1);
  if (leaf) current[leaf] = value;
}

export function resolveRuntimeStateSnapshot(
  snapshot: RuntimeStateSnapshot,
): RuntimeStateResolution {
  const byPath = new Map<
    string,
    RuntimeStateObservation[]
  >();

  for (const observation of snapshot.observations) {
    const list = byPath.get(observation.path) ?? [];
    list.push(observation);
    byPath.set(observation.path, list);
  }

  const values: Record<string, unknown> = {};
  const evidenceIds = new Set<string>();
  const conflicts: RuntimeStateResolution["conflicts"][number][] = [];

  for (const [path, observations] of byPath) {
    const uniqueValues = [
      ...new Set(observations.map((item) =>
        JSON.stringify(item.value)
      )),
    ];

    for (const observation of observations) {
      evidenceIds.add(observation.evidenceId);
    }

    if (uniqueValues.length !== 1) {
      conflicts.push({
        path,
        values: uniqueValues.map((item) =>
          JSON.parse(item) as RuntimeStateScalar
        ),
        evidenceIds: observations.map(
          (item) => item.evidenceId,
        ),
      });
      continue;
    }

    assignPath(
      values,
      path,
      observations[observations.length - 1]!.value,
    );
  }

  return {
    values,
    evidenceIds: [...evidenceIds].sort(),
    conflicts,
  };
}
