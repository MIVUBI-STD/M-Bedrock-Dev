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
});
