import { describe, expect, it } from "vitest";
import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";
import {
  assessRuntimeTemporalRequirement,
} from "../src/runtime-temporal-analysis.js";

function record(
  predicate: string,
  sequence: number,
): RuntimeEvidenceRecord {
  return {
    predicate,
    state: "present",
    confidence: "observed",
    scope: { arenaId: "arena-1", arenaGeneration: 2 },
    observedAt: {
      streamId: "stream-1",
      sequence,
      tick: sequence,
    },
  };
}

const requirement = {
  id: "mutation-before-dependent",
  beforePredicate: "mutation-verification-passed",
  afterPredicate: "dependent-action-observed",
  scope: { arenaId: "arena-1", arenaGeneration: 2 },
};

describe("runtime temporal analysis", () => {
  it("proves order when comparable observations satisfy the requirement", () => {
    expect(assessRuntimeTemporalRequirement(
      [
        record("mutation-verification-passed", 10),
        record("dependent-action-observed", 11),
      ],
      requirement,
      true,
    ).status).toBe("satisfied");
  });

  it("enforces minimum tick separation when the temporal contract requires a later tick", () => {
    const strict = {
      ...requirement,
      minTickDelta: 1,
    };

    expect(assessRuntimeTemporalRequirement(
      [
        {
          ...record("mutation-verification-passed", 10),
          observedAt: {
            streamId: "stream-1",
            sequence: 10,
            tick: 20,
          },
        },
        {
          ...record("dependent-action-observed", 11),
          observedAt: {
            streamId: "stream-1",
            sequence: 11,
            tick: 20,
          },
        },
      ],
      strict,
      true,
    ).status).not.toBe("satisfied");

    expect(assessRuntimeTemporalRequirement(
      [
        {
          ...record("mutation-verification-passed", 10),
          observedAt: {
            streamId: "stream-1",
            sequence: 10,
            tick: 20,
          },
        },
        {
          ...record("dependent-action-observed", 11),
          observedAt: {
            streamId: "stream-1",
            sequence: 11,
            tick: 21,
          },
        },
      ],
      strict,
      true,
    ).status).toBe("satisfied");
  });

  it("detects reversed ordering on a complete stream", () => {
    expect(assessRuntimeTemporalRequirement(
      [
        record("dependent-action-observed", 10),
        record("mutation-verification-passed", 11),
      ],
      requirement,
      true,
    ).status).toBe("violated-order");
  });

  it("does not convert missing evidence into a violation on incomplete telemetry", () => {
    expect(assessRuntimeTemporalRequirement(
      [record("dependent-action-observed", 10)],
      requirement,
      false,
    ).status).toBe("evidence-incomplete");
  });

  it("can prove missing prerequisite only when continuity is complete", () => {
    expect(assessRuntimeTemporalRequirement(
      [record("dependent-action-observed", 10)],
      requirement,
      true,
    ).status).toBe("missing-before");
  });

  it("keeps cross-stream ordering unresolved without a shared tick", () => {
    const before = record("mutation-verification-passed", 10);
    const after = record("dependent-action-observed", 11);
    before.observedAt = { streamId: "stream-a", sequence: 10 };
    after.observedAt = { streamId: "stream-b", sequence: 11 };

    expect(assessRuntimeTemporalRequirement(
      [before, after],
      requirement,
      true,
    ).status).toBe("unresolved-order");
  });
});
