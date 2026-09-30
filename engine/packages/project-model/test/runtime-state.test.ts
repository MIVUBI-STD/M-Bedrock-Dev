import { describe, expect, it } from "vitest";
import {
  resolveRuntimeStateSnapshot,
  type RuntimeStateSnapshot,
} from "../src/index.js";

describe("runtime state snapshot", () => {
  it("resolves scalar observations into nested policy values", () => {
    const snapshot: RuntimeStateSnapshot = {
      schemaVersion: 1,
      observations: [
        {
          path: "session.phase",
          value: "active",
          confidence: "observed",
          origin: "runtime-probe",
          evidenceId: "e:phase",
        },
        {
          path: "record.pendingCleanup",
          value: false,
          confidence: "observed",
          origin: "runtime-probe",
          evidenceId: "e:cleanup",
        },
        {
          path: "session.generation",
          value: 4,
          confidence: "observed",
          origin: "runtime-probe",
          evidenceId: "e:generation",
        },
      ],
    };

    expect(resolveRuntimeStateSnapshot(snapshot)).toEqual({
      values: {
        session: {
          phase: "active",
          generation: 4,
        },
        record: {
          pendingCleanup: false,
        },
      },
      evidenceIds: [
        "e:cleanup",
        "e:generation",
        "e:phase",
      ],
      conflicts: [],
    });
  });

  it("selects the latest scoped observation without mixing arenas", () => {
    const result = resolveRuntimeStateSnapshot(
      {
        schemaVersion: 1,
        observations: [
          {
            path: "session.phase",
            value: "countdown",
            confidence: "observed",
            origin: "telemetry",
            scope: {
              arenaId: "arena-1",
              arenaGeneration: 4,
            },
            observedAt: { tick: 100 },
            evidenceId: "e:old",
          },
          {
            path: "session.phase",
            value: "active",
            confidence: "observed",
            origin: "runtime-probe",
            scope: {
              arenaId: "arena-1",
              arenaGeneration: 4,
            },
            observedAt: { tick: 120 },
            evidenceId: "e:new",
          },
          {
            path: "session.phase",
            value: "finishing",
            confidence: "observed",
            origin: "telemetry",
            scope: {
              arenaId: "arena-2",
              arenaGeneration: 1,
            },
            observedAt: { tick: 130 },
            evidenceId: "e:other",
          },
        ],
      },
      {
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 4,
        },
      },
    );

    expect(result.values).toEqual({
      session: {
        phase: "active",
      },
    });
    expect(result.evidenceIds).toEqual(["e:new"]);
    expect(result.conflicts).toEqual([]);
  });

  it("respects atOrBeforeTick when reconstructing historical state", () => {
    const result = resolveRuntimeStateSnapshot(
      {
        schemaVersion: 1,
        observations: [
          {
            path: "session.phase",
            value: "countdown",
            confidence: "observed",
            origin: "telemetry",
            observedAt: { tick: 100 },
            evidenceId: "e:100",
          },
          {
            path: "session.phase",
            value: "active",
            confidence: "observed",
            origin: "telemetry",
            observedAt: { tick: 120 },
            evidenceId: "e:120",
          },
        ],
      },
      { atOrBeforeTick: 110 },
    );

    expect(result.values).toEqual({
      session: {
        phase: "countdown",
      },
    });
    expect(result.evidenceIds).toEqual(["e:100"]);
  });

  it("fails closed on conflicting values for the same state path", () => {
    const result = resolveRuntimeStateSnapshot({
      schemaVersion: 1,
      observations: [
        {
          path: "session.phase",
          value: "active",
          confidence: "observed",
          origin: "runtime-probe",
          evidenceId: "e:a",
        },
        {
          path: "session.phase",
          value: "countdown",
          confidence: "observed",
          origin: "telemetry",
          evidenceId: "e:b",
        },
      ],
    });

    expect(result.values).toEqual({});
    expect(result.conflicts).toEqual([
      {
        path: "session.phase",
        values: ["active", "countdown"],
        evidenceIds: ["e:a", "e:b"],
      },
    ]);
  });
});
