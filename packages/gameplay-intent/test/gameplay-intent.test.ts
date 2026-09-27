import { describe, expect, it } from "vitest";
import {
  assessGameplayIntentGrounding,
  evaluateGameplayOutcomeAdmissibility,
  evaluateGameplayPolicyPredicate,
  validateGameplayIntentModel,
  type GameplayIntentModel,
} from "../src/index.js";

const model: GameplayIntentModel = {
  schemaVersion: 1,
  id: "builder-memory",
  evidence: [
    {
      id: "e:phase",
      origin: "source-code",
      locator: "scripts/game/countdown.js",
      summary: "Source defines observation before building.",
    },
    {
      id: "e:plot",
      origin: "source-code",
      locator: "scripts/game/geometry.js",
      summary: "Source defines an assigned build plot.",
    },
  ],
  nodes: [
    {
      id: "phase:observation",
      kind: "phase",
      label: "Observation",
      status: "authored",
      evidenceIds: ["e:phase"],
    },
    {
      id: "mechanic:plot-build",
      kind: "mechanic",
      label: "Build in assigned plot",
      status: "authored",
      evidenceIds: ["e:plot"],
    },
  ],
  edges: [
    {
      id: "edge:observation-before-build",
      from: "phase:observation",
      to: "mechanic:plot-build",
      kind: "requires",
      status: "authored",
      evidenceIds: ["e:phase"],
    },
  ],
  invariants: [
    {
      id: "inv:plot-only",
      statement: "Player building is scoped to the assigned plot.",
      strength: "must",
      status: "authored",
      subjectIds: ["mechanic:plot-build"],
      evidenceIds: ["e:plot"],
    },
  ],
  unknowns: [],
};

describe("gameplay intent", () => {
  it("validates evidence-grounded graph references", () => {
    expect(validateGameplayIntentModel(model)).toEqual([]);
  });

  it("reports grounded subjects when no open intent question blocks them", () => {
    expect(
      assessGameplayIntentGrounding(
        model,
        ["mechanic:plot-build"],
      ).disposition,
    ).toBe("grounded");
  });

  it("evaluates structured policy predicates deterministically", () => {
    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "truthy",
          operand: {
            kind: "path",
            path: "state.pendingCleanup",
          },
        },
        {
          state: {
            pendingCleanup: true,
            phase: "active",
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "comparison",
          operator: "eq",
          left: {
            kind: "path",
            path: "state.phase",
          },
          right: {
            kind: "literal",
            value: "active",
          },
        },
        {
          state: {
            phase: "countdown",
          },
        },
      ),
    ).toBe("violated");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "comparison",
          operator: "neq",
          left: {
            kind: "path",
            path: "record.generation",
          },
          right: {
            kind: "path",
            path: "session.generation",
          },
        },
        {
          record: {
            generation: 3,
          },
          session: {
            generation: 4,
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "in",
          operand: {
            kind: "path",
            path: "state.phase",
          },
          values: [
            "countdown",
            "preparing",
            "resetting",
            "cinematic",
          ],
        },
        {
          state: {
            phase: "preparing",
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "fallback",
          excludedPredicates: [
            {
              kind: "comparison",
              operator: "eq",
              left: {
                kind: "path",
                path: "state.phase",
              },
              right: {
                kind: "literal",
                value: "active",
              },
            },
            {
              kind: "in",
              operand: {
                kind: "path",
                path: "state.phase",
              },
              values: ["countdown", "preparing"],
            },
          ],
        },
        {
          state: {
            phase: "finishing",
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "truthy",
          operand: {
            kind: "path",
            path: "missing.value",
          },
        },
        {},
      ),
    ).toBe("unknown");
  });

  it("evaluates indexed policy operands from runtime state", () => {
    const predicate = {
      kind: "falsy" as const,
      operand: {
        kind: "index" as const,
        base: {
          kind: "path" as const,
          path: "session.roster",
        },
        key: {
          kind: "path" as const,
          path: "record.playerId",
        },
      },
    };

    expect(
      evaluateGameplayPolicyPredicate(
        predicate,
        {
          record: { playerId: "player-a" },
          session: {
            roster: {
              "player-a": true,
            },
          },
        },
      ),
    ).toBe("violated");

    expect(
      evaluateGameplayPolicyPredicate(
        predicate,
        {
          record: { playerId: "player-a" },
          session: {
            roster: {
              "player-a": false,
            },
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        predicate,
        {
          record: { playerId: "player-b" },
          session: {
            roster: {
              "player-a": true,
            },
          },
        },
      ),
    ).toBe("unknown");
  });

  it("evaluates outcome admissibility across authored policy guards", () => {
    const policyModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "reconnect-policy",
      evidence: [{
        id: "e:policy",
        origin: "source-code",
        locator: "src/recovery-policy.ts",
        summary: "Direct guarded cleanup outcome.",
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
              path: "state.pendingCleanup",
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
        id: "inv:cleanup-policy",
        statement: "Cleanup is admissible only under known guards.",
        strength: "must",
        status: "inferred",
        subjectIds: ["outcome:cleanup"],
        evidenceIds: ["e:policy"],
      }],
      unknowns: [],
    };

    expect(
      evaluateGameplayOutcomeAdmissibility(
        policyModel,
        "outcome:cleanup",
        { state: { pendingCleanup: true } },
      ).disposition,
    ).toBe("admissible");

    expect(
      evaluateGameplayOutcomeAdmissibility(
        policyModel,
        "outcome:cleanup",
        { state: { pendingCleanup: false } },
      ).disposition,
    ).toBe("inadmissible");

    expect(
      evaluateGameplayOutcomeAdmissibility(
        {
          ...policyModel,
          unknowns: [{
            id: "unknown:coverage",
            question: "Other cleanup branches are unresolved.",
            blockedSubjectIds: ["outcome:cleanup"],
          }],
        },
        "outcome:cleanup",
        { state: { pendingCleanup: false } },
      ).disposition,
    ).toBe("unknown");
  });

  it("blocks diagnosis when an open intent question affects the subject", () => {
    const ambiguous: GameplayIntentModel = {
      ...model,
      unknowns: [{
        id: "unknown:reconnect",
        question: "Should reconnect resume the same round?",
        blockedSubjectIds: ["mechanic:plot-build"],
      }],
    };

    expect(
      assessGameplayIntentGrounding(
        ambiguous,
        ["mechanic:plot-build"],
      ).disposition,
    ).toBe("ambiguous");
  });
});
