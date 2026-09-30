import { describe, expect, it } from "vitest";
import {
  semanticRevisionFromKnowledgeClaim,
  semanticRuntimeClassFromProfile,
} from "../src/index.js";
import type {
  KnowledgeClaimV2,
} from "../../knowledge/src/index.js";
import type {
  MinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";

const profile: MinecraftRuntimeProfile = {
  schemaVersion: 2,
  product: {
    family: "bedrock-engine",
    edition: "education",
    version: "1.26.32",
  },
  host: "education-host",
  scriptModules: {
    "@minecraft/server": {
      version: "2.9.0",
      track: "stable",
    },
  },
  experiments: [],
  inventory: {
    scriptModules: "complete",
    experiments: "complete",
    worldSettings: "partial",
    packs: "partial",
  },
};

const claim: KnowledgeClaimV2 = {
  schemaVersion: 2,
  id: "knowledge:edu:chunk",
  subject: {
    kind: "runtime-state",
    id: "chunk.loaded-for-script",
  },
  predicate: "is-supported-on",
  object: true,
  classification: "documented-contract",
  applicability: {
    editions: ["education"],
    hosts: ["education-host"],
    minProductVersion: "1.26.30",
    maxProductVersionInclusive: "1.26.40",
  },
  evidence: [{
    id: "e:official",
    kind: "source-revision",
    sourceRevisionId: "src:official",
    specificity: "version",
    reproducibility: "not-tested",
    targetMatch: "compatible",
  }],
  certainty: "established",
  lifecycle: "verified",
  description:
    "Education chunk loaded-for-script behavior is documented for this target range.",
};

describe("knowledge to semantic claim binding", () => {
  it("maps a compatible knowledge claim into the exact runtime semantic class", () => {
    expect(
      semanticRuntimeClassFromProfile(profile),
    ).toBe("education-host");

    const result =
      semanticRevisionFromKnowledgeClaim(
        claim,
        {
          knowledgeClaimId: claim.id,
          semanticClaimId:
            "chunk.loaded-for-script",
          disposition: "affirmed",
        },
        profile,
      );

    expect(result.applicability)
      .toBe("applies");
    expect(result.revision).toMatchObject({
      claimId: "chunk.loaded-for-script",
      runtimeClass: "education-host",
      minecraftVersion: "1.26.32",
      disposition: "affirmed",
      provenance: {
        kind: "official-knowledge",
        evidenceCeiling: "documented",
      },
    });
  });

  it("refuses to bind knowledge across incompatible runtime classes", () => {
    const bedrock: MinecraftRuntimeProfile = {
      ...profile,
      product: {
        ...profile.product,
        edition: "bedrock-retail",
      },
      host: "dedicated-server",
    };

    const result =
      semanticRevisionFromKnowledgeClaim(
        claim,
        {
          knowledgeClaimId: claim.id,
          semanticClaimId:
            "chunk.loaded-for-script",
          disposition: "affirmed",
        },
        bedrock,
      );

    expect(result.applicability)
      .toBe("does-not-apply");
    expect(result.revision)
      .toBeUndefined();
  });

  it("keeps conflicting knowledge claims unresolved", () => {
    const conflicting: KnowledgeClaimV2 = {
      ...claim,
      certainty: "conflicting",
      lifecycle: "contested",
    };

    const result =
      semanticRevisionFromKnowledgeClaim(
        conflicting,
        {
          knowledgeClaimId:
            conflicting.id,
          semanticClaimId:
            "chunk.loaded-for-script",
          disposition: "affirmed",
        },
        profile,
      );

    expect(result.applicability)
      .toBe("unknown");
    expect(result.revision)
      .toBeUndefined();
  });

  it("does not invent a semantic class for an unsupported edition-host combination", () => {
    const invalidRuntime: MinecraftRuntimeProfile = {
      ...profile,
      host: "client",
    };

    expect(
      semanticRuntimeClassFromProfile(
        invalidRuntime,
      ),
    ).toBeUndefined();
  });
});
