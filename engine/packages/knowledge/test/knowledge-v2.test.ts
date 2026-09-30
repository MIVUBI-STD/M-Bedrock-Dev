import { describe, expect, it } from "vitest";
import {
  evaluateKnowledgeApplicabilityV2,
  validateKnowledgeClaimV2,
  type KnowledgeClaimV2,
} from "../src/index.js";
import type {
  MinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";

const partialProfile: MinecraftRuntimeProfile = {
  schemaVersion: 2,
  product: {
    family: "bedrock-engine",
    edition: "education",
    version: "1.26.32",
  },
  host: "education-host",
  scriptModules: {},
  experiments: [],
  inventory: {
    scriptModules: "partial",
    experiments: "partial",
    worldSettings: "partial",
    packs: "partial",
  },
};

describe("knowledge v2 epistemic contracts", () => {
  it("returns unknown when required module absence is not proven", () => {
    expect(evaluateKnowledgeApplicabilityV2({
      editions: ["education"],
      scriptModules: {
        "@minecraft/server": {
          minVersion: "2.9.0",
        },
      },
    }, partialProfile)).toEqual({
      state: "unknown",
      reasons: [
        "Required Script API module is not observed, but module inventory is not complete.",
      ],
      missing: ["script-module:@minecraft/server"],
    });
  });

  it("returns does-not-apply only when a complete inventory proves absence", () => {
    expect(evaluateKnowledgeApplicabilityV2({
      scriptModules: {
        "@minecraft/server": {},
      },
    }, {
      ...partialProfile,
      inventory: {
        ...partialProfile.inventory,
        scriptModules: "complete",
      },
    }).state).toBe("does-not-apply");
  });

  it("requires provenance appropriate to the claim class", () => {
    const claim: KnowledgeClaimV2 = {
      schemaVersion: 2,
      id: "entity.event.example",
      subject: {
        kind: "event",
        id: "example",
      },
      predicate: "applies-effects-at",
      object: "entity-tick",
      classification: "documented-contract",
      applicability: {
        editions: ["bedrock-retail", "education"],
      },
      evidence: [],
      certainty: "established",
      lifecycle: "verified",
    };

    expect(validateKnowledgeClaimV2(claim)).toEqual([
      "Established knowledge claims require explicit evidence.",
      "Documented-contract claims require source-revision evidence.",
    ]);
  });
});
