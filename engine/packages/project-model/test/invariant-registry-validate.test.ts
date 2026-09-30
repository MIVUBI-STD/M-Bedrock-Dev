import { describe, expect, it } from "vitest";
import {
  parseInvariantRegistrySnapshot,
  validateInvariantRegistrySnapshot,
} from "../src/invariant-registry-validate.js";

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "invariant:ready",
    source: {
      kind: "manual-policy",
      id: "policy",
      revision: "r1",
    },
    enforcement: "runtime-state",
    minimumRepairClaim: "proven-runtime",
    stateRequirements: [{
      id: "ready",
      predicate: "ready",
      expectedState: "present",
    }],
    temporalRequirements: [],
    revalidationLayers: [
      "static",
      "transitive",
      "runtime",
      "package",
    ],
    ...overrides,
  };
}

describe("invariant registry validation", () => {
  it("accepts a coherent executable registry", () => {
    const snapshot = {
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry()],
    };

    expect(parseInvariantRegistrySnapshot(snapshot))
      .toEqual(snapshot);
  });

  it("rejects duplicate invariant ids", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry(), entry()],
    });

    expect(errors.join(" ")).toMatch(/Duplicate invariant registry id/);
  });

  it("rejects runtime-state enforcement without state requirements", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        stateRequirements: [],
      })],
    });

    expect(errors.join(" ")).toMatch(/requires stateRequirements/);
  });

  it("rejects runtime-temporal enforcement without temporal requirements", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        enforcement: "runtime-temporal",
        stateRequirements: [],
        temporalRequirements: [],
      })],
    });

    expect(errors.join(" ")).toMatch(/requires temporalRequirements/);
  });

  it("rejects diagnostic-only runtime execution semantics", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        enforcement: "diagnostic-only",
        minimumRepairClaim: "hypothesis",
        stateRequirements: [],
        temporalRequirements: [],
        revalidationLayers: ["static", "runtime", "package"],
      })],
    });

    expect(errors.join(" ")).toMatch(/diagnostic-only/);
  });

  it("rejects duplicate revalidation layers", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        revalidationLayers: ["runtime", "runtime"],
      })],
    });

    expect(errors.join(" ")).toMatch(/duplicate revalidation layer/);
  });

  it("rejects malformed runtime requirement payloads", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        stateRequirements: [{
          id: "ready",
          predicate: "",
          expectedState: "unknown",
          scope: {
            arenaGeneration: -1,
            typoScopeField: "bad",
          },
        }],
      })],
    });

    const joined = errors.join(" ");
    expect(joined).toMatch(/predicate must be non-empty/);
    expect(joined).toMatch(/expectedState must be present or absent/);
    expect(joined).toMatch(/arenaGeneration/);
    expect(joined).toMatch(/unknown field typoScopeField/);
  });

  it("rejects duplicate runtime requirement ids", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        stateRequirements: [{
          id: "same",
          predicate: "a",
          expectedState: "present",
        }, {
          id: "same",
          predicate: "b",
          expectedState: "absent",
        }],
      })],
    });

    expect(errors.join(" "))
      .toMatch(/duplicate state requirement id same/);
  });

  it("rejects malformed temporal requirements", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        enforcement: "runtime-temporal",
        stateRequirements: [],
        temporalRequirements: [{
          id: "order",
          beforePredicate: "",
          afterPredicate: "after",
          maxTickDelta: -1,
          scope: {
            operationId: "",
          },
        }],
      })],
    });

    const joined = errors.join(" ");
    expect(joined).toMatch(/beforePredicate must be non-empty/);
    expect(joined).toMatch(/maxTickDelta/);
    expect(joined).toMatch(/operationId/);
  });

  it("rejects duplicate temporal requirement ids", () => {
    const errors = validateInvariantRegistrySnapshot({
      schemaVersion: 1,
      revision: "registry-r1",
      profileKey: "bedrock:1.26.40",
      entries: [entry({
        enforcement: "runtime-temporal",
        stateRequirements: [],
        temporalRequirements: [{
          id: "same",
          beforePredicate: "a",
          afterPredicate: "b",
        }, {
          id: "same",
          beforePredicate: "b",
          afterPredicate: "c",
        }],
      })],
    });

    expect(errors.join(" "))
      .toMatch(/duplicate temporal requirement id same/);
  });

});
