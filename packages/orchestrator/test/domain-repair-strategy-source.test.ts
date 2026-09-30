import { describe, expect, it } from "vitest";
import {
  BUILTIN_REPAIR_REALIZERS,
  BUILTIN_REPAIR_STRATEGY_SOURCES,
  assessRepairRegistryCoverage,
  assessRepairRealizerCoverage,
  enumerateRepairStrategySources,
  validateRepairStrategySourceRegistry,
} from "../src/index.js";
import type {
  RepairStrategyProviderRegistry,
} from "../src/index.js";

describe("domain repair strategy source safety", () => {
  it("keeps chunk and combat remediation proposal-only", () => {
    const byId = new Map(
      BUILTIN_REPAIR_STRATEGY_SOURCES.sources.map(
        (item) => [item.id, item],
      ),
    );

    expect(
      byId.get(
        "chunk-lifecycle-remediation",
      ),
    ).toMatchObject({
      deterministic: false,
      selectionMode: "proposal-only",
      supportedDiagnosticCodes: [
        "CHUNK_LIFECYCLE_RUNTIME_RISK",
      ],
    });

    expect(
      byId.get(
        "combat-revive-remediation",
      ),
    ).toMatchObject({
      deterministic: false,
      selectionMode: "proposal-only",
      supportedDiagnosticCodes: [
        "COMBAT_REVIVE_POLICY_VIOLATION",
      ],
    });
  });

  it("routes combat revive policy diagnostics to proposal-only remediation without requiring automatic realization", () => {
    const emptyProviders:
      RepairStrategyProviderRegistry = {
        schemaVersion: 1,
        providers: [],
      };
    const enumeration =
      enumerateRepairStrategySources(
        {
          incidentId: "incident-combat",
          candidateId: "cause-revive",
          sourceFingerprint: "source-a",
          chainIds: ["chain-combat"],
          relationIds: [],
          invariantIds: [],
          diagnosticIds: ["diag-combat"],
          diagnosticCodes: [
            "COMBAT_REVIVE_POLICY_VIOLATION",
          ],
          sourceRefs: [],
          exactSourceRefs: [],
          causalBinding: {},
          targetProfileFingerprints: [],
          automaticRealizationAllowed: false,
          reasons: [],
        },
        [{
          id: "diag-combat",
          code:
            "COMBAT_REVIVE_POLICY_VIOLATION",
          severity: "medium",
          message:
            "Observed revive transaction contradicts authored combat policy.",
        }],
        emptyProviders,
        BUILTIN_REPAIR_STRATEGY_SOURCES,
      );

    expect(
      enumeration.applicableSources.find(
        (item) =>
          item.sourceId ===
          "combat-revive-remediation",
      ),
    ).toMatchObject({
      selectionMode: "proposal-only",
      deterministic: false,
      automaticRealizationEligible: false,
    });

    expect(
      assessRepairRealizerCoverage(
        enumeration,
        BUILTIN_REPAIR_REALIZERS,
      ).items.find(
        (item) =>
          item.sourceId ===
          "combat-revive-remediation",
      ),
    ).toMatchObject({
      status: "realizer-not-required",
    });
  });

  it("keeps the builtin registry unique and all required realizers covered", () => {
    expect(
      validateRepairStrategySourceRegistry(
        BUILTIN_REPAIR_STRATEGY_SOURCES,
      ),
    ).toEqual([]);

    const report =
      assessRepairRegistryCoverage(
        BUILTIN_REPAIR_STRATEGY_SOURCES,
        BUILTIN_REPAIR_REALIZERS,
      );

    expect(report.complete).toBe(true);
    expect(
      report.missingRequiredRealizers,
    ).toBe(0);
    expect(
      report.incompatibleRealizers,
    ).toBe(0);
  });
});
