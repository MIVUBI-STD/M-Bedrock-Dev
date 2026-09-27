import { describe, expect, it } from "vitest";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  RuntimeExperimentDiagnosticBridge,
} from "../src/index.js";
import {
  reclassifyIntentDiagnosticFromRuntime,
} from "../src/index.js";

function intent(
  invariantStatus: "authored" | "inferred",
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "intent",
    evidence: [{
      id: "intent-evidence",
      origin: "source-code",
      locator: "scripts/main.ts",
      summary: "Authored lifecycle evidence.",
    }],
    nodes: [{
      id: "arena",
      kind: "state",
      label: "Arena state",
      status: invariantStatus,
      evidenceIds: ["intent-evidence"],
    }],
    edges: [],
    invariants: [{
      id: "arena-invariant",
      statement: "Arena active requires membership.",
      strength: "must",
      status: invariantStatus,
      subjectIds: ["arena"],
      evidenceIds: ["intent-evidence"],
    }],
    unknowns: [],
  };
}

function bridge(
  items: readonly {
    predicate: string;
    state: "present" | "absent" | "unknown";
    ceiling:
      | "unknown"
      | "observed"
      | "repeatable"
      | "intervention-supported";
  }[],
): RuntimeExperimentDiagnosticBridge {
  return {
    experimentId: "exp",
    qualificationState: "observed",
    predicates: items.map((item) => ({
      predicate: item.predicate,
      observation: {
        predicate: item.predicate,
        state: item.state,
        evidenceId: "obs:" + item.predicate,
      },
      ceiling: item.ceiling,
      sourceEvidenceIds: [
        "evidence:" + item.predicate,
      ],
    })),
    observations: items.map((item) => ({
      predicate: item.predicate,
      state: item.state,
      evidenceId: "obs:" + item.predicate,
    })),
  };
}

describe("runtime intent diagnostic reclassification", () => {
  it("confirms an authored-intent defect after runtime contradiction proof arrives", () => {
    const result =
      reclassifyIntentDiagnosticFromRuntime({
        intent: intent("authored"),
        subjectIds: ["arena"],
        bridge: bridge([
          {
            predicate: "membership-contradiction",
            state: "present",
            ceiling: "observed",
          },
          {
            predicate: "runtime-semantics-observed",
            state: "present",
            ceiling: "observed",
          },
        ]),
        bindings: {
          contradictionPredicates: [
            "membership-contradiction",
          ],
          runtimeProofPredicates: [
            "runtime-semantics-observed",
          ],
        },
        runtimeProofRequired: true,
        previousDisposition:
          "runtime-proof-required",
      });

    expect(result.disposition).toBe(
      "confirmed-defect",
    );
    expect(result.changed).toBe(true);
    expect(
      result.matchedPredicates.contradictions,
    ).toEqual(["membership-contradiction"]);
  });

  it("caps inferred intent contradictions at probable defect", () => {
    const result =
      reclassifyIntentDiagnosticFromRuntime({
        intent: intent("inferred"),
        subjectIds: ["arena"],
        bridge: bridge([{
          predicate: "membership-contradiction",
          state: "present",
          ceiling: "repeatable",
        }]),
        bindings: {
          contradictionPredicates: [
            "membership-contradiction",
          ],
        },
      });

    expect(result.disposition).toBe(
      "probable-defect",
    );
  });

  it("keeps runtime-proof-required when the required runtime predicate remains unknown", () => {
    const result =
      reclassifyIntentDiagnosticFromRuntime({
        intent: intent("authored"),
        subjectIds: ["arena"],
        bridge: bridge([{
          predicate: "runtime-semantics-observed",
          state: "unknown",
          ceiling: "observed",
        }]),
        bindings: {
          runtimeProofPredicates: [
            "runtime-semantics-observed",
          ],
        },
        runtimeProofRequired: true,
      });

    expect(result.disposition).toBe(
      "runtime-proof-required",
    );
  });

  it("classifies direct runtime design matches as designed behavior", () => {
    const result =
      reclassifyIntentDiagnosticFromRuntime({
        intent: intent("authored"),
        subjectIds: ["arena"],
        bridge: bridge([{
          predicate: "matches-design",
          state: "present",
          ceiling: "observed",
        }]),
        bindings: {
          designMatchPredicates: [
            "matches-design",
          ],
        },
      });

    expect(result.disposition).toBe(
      "designed-behavior",
    );
  });

  it("does not use conflicting runtime observations as contradiction evidence", () => {
    const result =
      reclassifyIntentDiagnosticFromRuntime({
        intent: intent("authored"),
        subjectIds: ["arena"],
        bridge: bridge([{
          predicate: "membership-contradiction",
          state: "unknown",
          ceiling: "repeatable",
        }]),
        bindings: {
          contradictionPredicates: [
            "membership-contradiction",
          ],
        },
      });

    expect(result.disposition).toBe(
      "insufficient-evidence",
    );
    expect(
      result.matchedPredicates.contradictions,
    ).toEqual([]);
  });
});
