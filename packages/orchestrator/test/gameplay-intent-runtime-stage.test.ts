import { describe, expect, it } from "vitest";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  analyzeGameplayIntentRuntime,
} from "../src/gameplay-intent-runtime-stage.js";

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "reconnect",
  evidence: [{
    id: "e:policy",
    origin: "source-code",
    locator: "src/recovery-policy.ts",
    summary: "Authored cleanup guard.",
  }],
  nodes: [
    {
      id: "outcome:cleanup",
      kind: "outcome",
      label: "Cleanup",
      status: "authored",
      evidenceIds: ["e:policy"],
    },
    {
      id: "policy:pending-cleanup",
      kind: "policy",
      label: "Pending Cleanup",
      status: "authored",
      evidenceIds: ["e:policy"],
      policyPredicate: {
        kind: "truthy",
        operand: {
          kind: "path",
          path: "record.pendingCleanup",
        },
      },
    },
  ],
  edges: [{
    id: "edge:cleanup-policy",
    from: "outcome:cleanup",
    to: "policy:pending-cleanup",
    kind: "requires",
    status: "authored",
    evidenceIds: ["e:policy"],
  }],
  invariants: [{
    id: "inv:admissible-policy:outcome:cleanup",
    statement: "Cleanup is observed only under modeled guards.",
    strength: "must",
    status: "inferred",
    subjectIds: ["outcome:cleanup"],
    evidenceIds: ["e:policy"],
  }],
  unknowns: [],
};

describe("gameplay intent runtime stage", () => {
  it("evaluates observed outcomes against scoped state at the outcome tick", () => {
    const result = analyzeGameplayIntentRuntime(
      intent,
      [
        {
          path: "record.pendingCleanup",
          value: false,
          confidence: "observed",
          origin: "telemetry",
          scope: {
            arenaId: "arena-1",
            arenaGeneration: 2,
          },
          observedAt: { tick: 100 },
          evidenceId: "e:state-old",
        },
        {
          path: "record.pendingCleanup",
          value: true,
          confidence: "observed",
          origin: "telemetry",
          scope: {
            arenaId: "arena-1",
            arenaGeneration: 2,
          },
          observedAt: { tick: 120 },
          evidenceId: "e:state-new",
        },
      ],
      [{
        outcomeId: "outcome:cleanup",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 2,
        },
        observedAt: { tick: 120 },
        evidenceId: "e:outcome",
      }],
    );

    expect(result.designedBehavior).toBe(1);
    expect(result.probableDefects).toBe(0);
    expect(result.assessments[0]?.result.disposition)
      .toBe("designed-behavior");
  });

  it("reports policy violation as probable defect, not confirmed defect", () => {
    const result = analyzeGameplayIntentRuntime(
      intent,
      [{
        path: "record.pendingCleanup",
        value: false,
        confidence: "observed",
        origin: "runtime-probe",
        observedAt: { tick: 40 },
        evidenceId: "e:state",
      }],
      [{
        outcomeId: "outcome:cleanup",
        observedAt: { tick: 40 },
        evidenceId: "e:outcome",
      }],
    );

    expect(result.probableDefects).toBe(1);
    expect(result.assessments[0]?.result.disposition)
      .toBe("probable-defect");
  });
});
