import type { RuntimeControlPlan } from "./runtime-control.js";
import type { RuntimeObservationSnapshot } from "./runtime-observation.js";

export interface RuntimeSessionRecording {
  schemaVersion: 1;
  scenarioId: string;
  targetProfileFingerprint?: string;
  controlPlan: RuntimeControlPlan;
  observations: readonly RuntimeObservationSnapshot[];
}

export interface RuntimeSessionReplayDivergence {
  index: number;
  expectedTick?: number;
  actualTick?: number;
  expectedFingerprint: string;
  actualFingerprint: string;
}

export interface RuntimeSessionReplayComparison {
  status: "equivalent" | "diverged" | "incomplete";
  comparedSnapshots: number;
  firstDivergence?: RuntimeSessionReplayDivergence;
  reasons: readonly string[];
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.entries(value as Record<string, unknown>)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,v]) => JSON.stringify(k) + ":" + stable(v))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function runtimeObservationFingerprint(
  snapshot: RuntimeObservationSnapshot,
): string {
  return fingerprint(stable(snapshot));
}

export function createRuntimeSessionRecording(
  controlPlan: RuntimeControlPlan,
  observations: readonly RuntimeObservationSnapshot[],
  targetProfileFingerprint?: string,
): RuntimeSessionRecording {
  if (!controlPlan.scenarioId.trim()) {
    throw new Error("Runtime session recording requires scenarioId.");
  }
  return {
    schemaVersion: 1,
    scenarioId: controlPlan.scenarioId,
    ...(targetProfileFingerprint ? { targetProfileFingerprint } : {}),
    controlPlan,
    observations: [...observations],
  };
}

export function compareRuntimeSessionRecordings(
  expected: RuntimeSessionRecording,
  actual: RuntimeSessionRecording,
): RuntimeSessionReplayComparison {
  const reasons: string[] = [];
  if (expected.scenarioId !== actual.scenarioId) {
    return { status: "incomplete", comparedSnapshots: 0, reasons: ["Scenario identity differs."] };
  }
  if (expected.targetProfileFingerprint !== actual.targetProfileFingerprint) {
    reasons.push("Runtime profile differs; replay equivalence cannot be claimed across profiles.");
  }
  const count = Math.min(expected.observations.length, actual.observations.length);
  for (let index = 0; index < count; index++) {
    const left = expected.observations[index]!;
    const right = actual.observations[index]!;
    const leftFp = runtimeObservationFingerprint(left);
    const rightFp = runtimeObservationFingerprint(right);
    if (leftFp !== rightFp) {
      return {
        status: "diverged",
        comparedSnapshots: index + 1,
        firstDivergence: {
          index,
          ...(left.tick === undefined ? {} : { expectedTick: left.tick }),
          ...(right.tick === undefined ? {} : { actualTick: right.tick }),
          expectedFingerprint: leftFp,
          actualFingerprint: rightFp,
        },
        reasons: [...reasons, "Observation fingerprint diverged."],
      };
    }
  }
  if (expected.observations.length !== actual.observations.length || reasons.length > 0) {
    return {
      status: "incomplete",
      comparedSnapshots: count,
      reasons: [
        ...reasons,
        ...(expected.observations.length === actual.observations.length ? [] : ["Observation counts differ."]),
      ],
    };
  }
  return { status: "equivalent", comparedSnapshots: count, reasons: ["All canonical observation fingerprints match."] };
}
