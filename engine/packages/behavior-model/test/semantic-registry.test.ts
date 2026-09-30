import { describe, expect, it } from "vitest";
import {
  resolveMinecraftSemanticClaimRevision,
  semanticClaimConflicts,
  validateMinecraftSemanticClaimRegistry,
  type MinecraftSemanticClaimRegistry,
} from "../src/index.js";

const registry: MinecraftSemanticClaimRegistry = {
  schemaVersion: 1,
  revision: "r1",
  entries: [{
    id: "claim:chunk:doc",
    claimId: "chunk.loaded-for-script",
    runtimeClass: "bedrock-dedicated-server",
    minecraftVersion: "1.26.40",
    revision: "1",
    statement: "Chunk is reported loaded for script.",
    disposition: "affirmed",
    provenance: {
      kind: "official-knowledge",
      evidenceCeiling: "documented",
      evidenceIds: ["doc:chunk-loaded"],
    },
  }, {
    id: "claim:chunk:obs",
    claimId: "chunk.loaded-for-script",
    runtimeClass: "bedrock-dedicated-server",
    minecraftVersion: "1.26.40",
    revision: "2",
    statement: "Observed target reports chunk not loaded for script.",
    disposition: "denied",
    provenance: {
      kind: "runtime-evidence",
      evidenceCeiling: "observed",
      evidenceIds: ["obs:chunk-loaded"],
    },
  }],
};

describe("versioned minecraft semantic claim registry", () => {
  it("detects documented-vs-observed contradiction instead of picking a winner", () => {
    expect(
      validateMinecraftSemanticClaimRegistry(registry),
    ).toEqual([]);

    const conflicts = semanticClaimConflicts(registry);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      claimId: "chunk.loaded-for-script",
      runtimeClass: "bedrock-dedicated-server",
      minecraftVersion: "1.26.40",
      dispositions: ["affirmed", "denied"],
    });
  });

  it("blocks automatic resolution while conflicting active revisions remain", () => {
    const result = resolveMinecraftSemanticClaimRevision(
      registry,
      {
        claimId: "chunk.loaded-for-script",
        runtimeClass: "bedrock-dedicated-server",
        minecraftVersion: "1.26.40",
      },
    );

    expect(result.resolved).toBeUndefined();
    expect(result.conflict).toBeDefined();
  });

  it("allows an explicit newer revision to supersede old conflicting revisions", () => {
    const reconciled: MinecraftSemanticClaimRegistry = {
      ...registry,
      revision: "r2",
      entries: [
        ...registry.entries,
        {
          id: "claim:chunk:reconciled",
          claimId: "chunk.loaded-for-script",
          runtimeClass: "bedrock-dedicated-server",
          minecraftVersion: "1.26.40",
          revision: "3",
          statement: "Reconciled target-scoped semantic claim.",
          disposition: "denied",
          provenance: {
            kind: "controlled-experiment",
            evidenceCeiling: "intervention-supported",
            evidenceIds: ["exp:chunk-loaded"],
          },
          supersedesRevisionIds: [
            "claim:chunk:doc",
            "claim:chunk:obs",
          ],
        },
      ],
    };

    expect(
      semanticClaimConflicts(reconciled),
    ).toEqual([]);

    const result = resolveMinecraftSemanticClaimRevision(
      reconciled,
      {
        claimId: "chunk.loaded-for-script",
        runtimeClass: "bedrock-dedicated-server",
        minecraftVersion: "1.26.40",
      },
    );

    expect(result.resolved?.id)
      .toBe("claim:chunk:reconciled");
    expect(result.resolved?.provenance.evidenceCeiling)
      .toBe("intervention-supported");
  });

  it("prefers exact-version claims over unversioned fallback claims", () => {
    const scoped: MinecraftSemanticClaimRegistry = {
      schemaVersion: 1,
      revision: "r1",
      entries: [{
        id: "fallback",
        claimId: "scheduler.ordering",
        runtimeClass: "education-host",
        revision: "1",
        statement: "Fallback semantic claim.",
        disposition: "unknown",
        provenance: {
          kind: "project-policy",
          evidenceCeiling: "designed",
          evidenceIds: ["policy:scheduler"],
        },
      }, {
        id: "exact",
        claimId: "scheduler.ordering",
        runtimeClass: "education-host",
        minecraftVersion: "1.26.32",
        revision: "2",
        statement: "Exact version semantic claim.",
        disposition: "affirmed",
        provenance: {
          kind: "runtime-evidence",
          evidenceCeiling: "observed",
          evidenceIds: ["obs:scheduler"],
        },
      }],
    };

    const result = resolveMinecraftSemanticClaimRevision(
      scoped,
      {
        claimId: "scheduler.ordering",
        runtimeClass: "education-host",
        minecraftVersion: "1.26.32",
      },
    );

    expect(result.resolved?.id).toBe("exact");
  });
});
