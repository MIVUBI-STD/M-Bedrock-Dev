import { describe, expect, it } from "vitest";
import {
  BUILTIN_REPAIR_REALIZERS,
  BUILTIN_REPAIR_STRATEGY_SOURCES,
  assessRepairRegistryCoverage,
  validateRepairStrategySourceRegistry,
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
