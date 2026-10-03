import { describe, expect, it } from "vitest";
import {
  deriveAuditObligations,
} from "../src/map-audit-obligations.js";
import {
  auditUserIntentAuthorityNote,
  deriveAuditUserIntentKnowledgeDemand,
  deriveAuditUserIntentSearchPressure,
  normalizeAuditUserIntent,
  validateAuditUserIntent,
  type AuditUserIntentEnvelope,
} from "../src/map-audit-user-intent.js";

function envelope(): AuditUserIntentEnvelope {
  return {
    schemaVersion: 1,
    policy:
      "user-input-is-search-guidance-not-gameplay-authority",
    items: [{
      kind: "SYMPTOM_REPORT",
      raw: " wave   suka stuck ",
      normalized:
        "possible progression stall during wave completion",
    }, {
      kind: "SUSPICION",
      raw: " kayak ticking area ",
      normalized:
        "suspected chunk/residency mechanism",
    }, {
      kind: "TEST_CONSTRAINT",
      raw: "jangan test semuanya",
      normalized:
        "prefer bounded static-first proof over broad trial-and-error",
    }, {
      kind: "SYMPTOM_REPORT",
      raw: "wave suka stuck",
      normalized:
        "possible progression stall during wave completion",
    }],
    priorityDomains: [
      "progression-wave-objective",
      "chunk-simulation",
      "progression-wave-objective",
    ],
    priorityPlayerFlows: [
      "PROGRESSION",
      "PROGRESSION",
    ],
    ambiguities: [
      "Root cause is not yet known.",
      " Root cause is not yet known. ",
    ],
    blockingAmbiguities: [],
  };
}

describe("map audit user intent", () => {
  it("normalizes and deduplicates hint-only prompt intake", () => {
    const normalized =
      normalizeAuditUserIntent(envelope());

    expect(normalized.items).toHaveLength(3);
    expect(normalized.priorityDomains).toEqual([
      "chunk-simulation",
      "progression-wave-objective",
    ]);
    expect(normalized.priorityPlayerFlows)
      .toEqual(["PROGRESSION"]);
    expect(normalized.ambiguities).toEqual([
      "Root cause is not yet known.",
    ]);
    expect(normalized.blockingAmbiguities)
      .toEqual([]);
  });

  it("maps user priority into additive existing knowledge demand", () => {
    const demand =
      deriveAuditUserIntentKnowledgeDemand(
        envelope(),
      );

    expect(demand).toEqual([
      "chunk-simulation",
      "entity-behavior",
      "platform-constraints",
      "state-flow",
    ]);
  });

  it("keeps symptom and suspicion search pressure separate", () => {
    const pressure =
      deriveAuditUserIntentSearchPressure(
        envelope(),
      );

    expect(pressure.symptomHints).toEqual([
      "possible progression stall during wave completion",
    ]);
    expect(pressure.suspicionHints).toEqual([
      "suspected chunk/residency mechanism",
    ]);
    expect(pressure.domains["chunk-simulation"])
      .toBe(2);
    expect(
      pressure.domains[
        "progression-wave-objective"
      ],
    ).toBe(2);
  });

  it("rejects malformed envelope shape without crashing", () => {
    const malformed: any = {
      schemaVersion: 1,
      policy:
        "user-input-is-search-guidance-not-gameplay-authority",
      items: "not-an-array",
      priorityDomains: null,
      priorityPlayerFlows: {},
      ambiguities: 42,
      blockingAmbiguities: false,
    };

    const issues =
      validateAuditUserIntent(malformed);

    expect(issues).toContain(
      "User audit intent items must be an array.",
    );
    expect(issues).toContain(
      "User audit intent priorityDomains must be an array.",
    );
    expect(issues).toContain(
      "User audit intent priorityPlayerFlows must be an array.",
    );
  });

  it("rejects unsupported runtime values instead of trusting loose JSON", () => {
    const invalid: any = {
      ...envelope(),
      priorityDomains: ["made-up-domain"],
      priorityPlayerFlows: ["EVERYWHERE"],
      items: [{
        kind: "BUG_CONFIRMED",
        raw: "x",
        normalized: "x",
      }],
    };

    const issues =
      validateAuditUserIntent(invalid);

    expect(issues.some((item) =>
      item.includes("unsupported kind")
    )).toBe(true);
    expect(issues.some((item) =>
      item.includes("unsupported priority domain")
    )).toBe(true);
    expect(issues.some((item) =>
      item.includes("unsupported priority player flow")
    )).toBe(true);
  });

  it("preserves blocking ambiguity separately from ordinary uncertainty", () => {
    const input = envelope();
    const normalized =
      normalizeAuditUserIntent({
        ...input,
        blockingAmbiguities: [
          "Exact target map is ambiguous.",
        ],
      });

    expect(normalized.blockingAmbiguities)
      .toEqual([
        "Exact target map is ambiguous.",
      ]);
    expect(normalized.ambiguities)
      .toEqual([
        "Root cause is not yet known.",
      ]);
  });

  it("rejects a symptom intake that silently drops interpretation", () => {
    const incomplete: AuditUserIntentEnvelope = {
      schemaVersion: 1,
      policy:
        "user-input-is-search-guidance-not-gameplay-authority",
      items: [{
        kind: "SYMPTOM_REPORT",
        raw: "game kadang gak selesai",
        normalized:
          "possible game completion failure",
      }],
      priorityDomains: [],
      priorityPlayerFlows: [],
      ambiguities: [],
      blockingAmbiguities: [],
    };

    expect(
      validateAuditUserIntent(incomplete),
    ).toContain(
      "User-reported symptoms require at least one bounded priority domain/player-flow interpretation or an explicit ambiguity record.",
    );
  });

  it("keeps an unexplained user symptom visible as a non-bug obligation", () => {
    const userIntent: AuditUserIntentEnvelope = {
      schemaVersion: 1,
      policy:
        "user-input-is-search-guidance-not-gameplay-authority",
      items: [{
        kind: "SYMPTOM_REPORT",
        raw: "barang kadang ilang",
        normalized:
          "possible inventory item loss",
      }],
      priorityDomains: [
        "inventory-economy",
      ],
      priorityPlayerFlows: [
        "ACTIVE_GAMEPLAY",
      ],
      ambiguities: [],
      blockingAmbiguities: [],
    };

    const obligations =
      deriveAuditObligations({
        graph: {
          schemaVersion: 1,
          policy: "scenario-driven-causal-audit",
          scenarios: [],
          components: [],
          causalLinks: [],
          knowledgeRequirements: [],
          knowledgeReceipts: [],
          requiredInspectionGraph: {
            policy: "required-inspection-graph",
            nodes: [],
            receipts: [],
          },
        } as any,
        defectResolution: {
          status: "READY_FOR_PROPOSED_BUG_SET",
          contradictedCausalLinkIds: [],
          resolutions: [],
          confirmedDefectReadyIds: [],
          blockingCounterProofIds: [],
          runtimeProofRequiredIds: [],
          detectionGapIds: [],
          gameplayTranslationRequiredIds: [],
          counterProofSearchRequiredIds: [],
          issues: [],
        } as any,
        gameplayWorld: {
          surfaceDiscovery: {
            surfaceIds: [],
          },
          arenas: {
            detected: false,
          },
          platformKnowledge: {
            claims: [],
          },
        } as any,
        userIntent,
        gameplayClosure: {
          status: "CLOSED",
          surfaces: [],
          unaccountedSurfaceIds: [],
          blockingSurfaceIds: [],
          unknownSurfaceIds: [],
          stateModelComplete: true,
          boundariesExtracted: true,
          reasons: [],
        } as any,
        negativeSpace: [],
        temporalRisks: [],
        discoveryChallenges: [],
        sharedResourceSignals: [],
        compoundBoundaries: [],
        accumulationGrowth: [],
      });

    expect(
      obligations.some(
        (item) =>
          item.id ===
            "user-symptom-uncovered-domain:inventory-economy" &&
          item.source ===
            "user-reported-symptom",
      ),
    ).toBe(true);
  });

  it("states explicitly that prompt input cannot become proof", () => {
    expect(auditUserIntentAuthorityNote())
      .toContain("cannot establish Expected/Actual behavior");
    expect(auditUserIntentAuthorityNote())
      .toContain("issue type");
  });
});
