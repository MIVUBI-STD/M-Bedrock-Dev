import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { telemetryRuntimeEvidence } from "../src/telemetry-evidence.js";
import { knowledgeRuntimeDiagnostics } from "../../../analyzers/diagnostics/src/knowledge-runtime-findings.js";
import { synthesizeCausalChains } from "../src/causal-analysis.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "policy",
    title: "Policy",
    url: "project://knowledge/temporal-telemetry-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "route-needs-revalidation",
    domain: "entity-runtime",
    subject: "route-affecting-world-mutation",
    kind: "requires",
    object: "route-revalidation",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    causalConsequences: ["navigation-stall-risk"],
    causalOutcomePredicates: {
      "navigation-stall-risk": ["navigation-stall-observed"],
    },
  }],
};

function chainFor(stallTick: number) {
  const records = telemetryRuntimeEvidence([{
    schemaVersion: 1,
    eventId: "mutation-1",
    kind: "mutation-applied",
    producer: "instrumentation",
    scope: { operationId: "route-op" },
    tick: 100,
    sequence: 1,
    mutationKind: "fill",
    routeId: "bridge",
  }, {
    schemaVersion: 1,
    eventId: "stall-1",
    kind: "entity-stall",
    producer: "instrumentation",
    scope: { operationId: "route-op" },
    tick: stallTick,
    sequence: 2,
    entityKey: "demo:zombie",
    routeId: "bridge",
    stalledTicks: 40,
  }]);

  const diagnostics = knowledgeRuntimeDiagnostics({
    catalog,
    profile: { edition: "bedrock" },
    snapshot: { schemaVersion: 1, records },
  });

  return synthesizeCausalChains(diagnostics)[0]!;
}

describe("temporal telemetry causal reasoning", () => {
  it("counts a stall after mutation as temporally ordered support", () => {
    const chain = chainFor(120);
    expect(chain.confidence).toBe("medium");
    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strength: "direct-evidence",
        temporalStatus: "after-subject",
      }),
    ]));
  });

  it("does not use a stall before mutation as causal support", () => {
    const chain = chainFor(80);
    expect(chain.confidence).toBe("low");
    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strength: "direct-evidence",
        temporalStatus: "before-subject",
      }),
    ]));
  });

  it("uses sequence to order events within one tick in the same stream", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "mutation-1",
      kind: "mutation-applied",
      producer: "instrumentation",
      scope: { operationId: "route-op" },
      tick: 100,
      streamId: "runtime-main",
      sequence: 1,
      mutationKind: "fill",
      routeId: "bridge",
    }, {
      schemaVersion: 1,
      eventId: "stall-1",
      kind: "entity-stall",
      producer: "instrumentation",
      scope: { operationId: "route-op" },
      tick: 100,
      streamId: "runtime-main",
      sequence: 2,
      entityKey: "demo:zombie",
      routeId: "bridge",
    }]);

    const diagnostics = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: { schemaVersion: 1, records },
    });
    const chain = synthesizeCausalChains(diagnostics)[0]!;

    expect(chain.confidence).toBe("medium");
    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        temporalStatus: "after-subject",
      }),
    ]));
  });

  it("does not compare sequence across different streams", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "mutation-stream-a",
      kind: "mutation-applied",
      producer: "instrumentation",
      scope: { operationId: "route-op" },
      tick: 100,
      streamId: "stream-a",
      sequence: 10,
      mutationKind: "fill",
      routeId: "bridge",
    }, {
      schemaVersion: 1,
      eventId: "stall-stream-b",
      kind: "entity-stall",
      producer: "instrumentation",
      scope: { operationId: "route-op" },
      tick: 100,
      streamId: "stream-b",
      sequence: 20,
      entityKey: "demo:zombie",
      routeId: "bridge",
    }]);

    const diagnostics = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: { schemaVersion: 1, records },
    });
    const chain = synthesizeCausalChains(diagnostics)[0]!;

    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        temporalStatus: "same-moment",
      }),
    ]));
  });
  it("does not promote temporal support when continuity is incomplete", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "mutation-1",
      kind: "mutation-applied",
      producer: "instrumentation",
      scope: { operationId: "route-op" },
      tick: 100,
      streamId: "runtime-main",
      sequence: 1,
      mutationKind: "fill",
      routeId: "bridge",
    }, {
      schemaVersion: 1,
      eventId: "stall-1",
      kind: "entity-stall",
      producer: "instrumentation",
      scope: { operationId: "route-op" },
      tick: 120,
      streamId: "runtime-main",
      sequence: 3,
      entityKey: "demo:zombie",
      routeId: "bridge",
    }]);

    const diagnostics = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: { schemaVersion: 1, records },
    });
    const chain = synthesizeCausalChains(diagnostics, {
      temporalEvidenceReliable: false,
    })[0]!;

    expect(chain.confidence).toBe("low");
    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strength: "direct-evidence",
        temporalStatus: "after-subject",
        temporalIntegrity: "incomplete",
      }),
    ]));
    expect(chain.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "observed-state",
        label: "navigation-stall-observed",
      }),
    ]));
  });
  it("runtime-probe-only temporal support remains valid when unrelated telemetry is incomplete", () => {
    const records = [{
      predicate: "route-affecting-world-mutation",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "runtime-probe" as const,
      scope: { operationId: "route-op" },
      observedAt: { tick: 100 },
    }, {
      predicate: "navigation-stall-observed",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "runtime-probe" as const,
      scope: { operationId: "route-op" },
      observedAt: { tick: 120 },
    }];

    const diagnostics = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: { schemaVersion: 1, records },
    });
    const chain = synthesizeCausalChains(diagnostics, {
      telemetryTemporalReliable: false,
    })[0]!;

    expect(chain.confidence).toBe("medium");
    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strength: "direct-evidence",
        temporalStatus: "after-subject",
        temporalIntegrity: "complete",
      }),
    ]));
  });

  it("mixed telemetry and runtime-probe timing remains fail-closed when telemetry is incomplete", () => {
    const records = [{
      predicate: "route-affecting-world-mutation",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "telemetry" as const,
      scope: { operationId: "route-op" },
      observedAt: {
        tick: 100,
        streamId: "runtime-main",
        sequence: 1,
      },
    }, {
      predicate: "navigation-stall-observed",
      state: "present" as const,
      confidence: "observed" as const,
      origin: "runtime-probe" as const,
      scope: { operationId: "route-op" },
      observedAt: { tick: 120 },
    }];

    const diagnostics = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: { schemaVersion: 1, records },
    });
    const chain = synthesizeCausalChains(diagnostics, {
      telemetryTemporalReliable: false,
    })[0]!;

    expect(chain.confidence).toBe("low");
    expect(chain.links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strength: "direct-evidence",
        temporalStatus: "after-subject",
        temporalIntegrity: "incomplete",
      }),
    ]));
  });
});
