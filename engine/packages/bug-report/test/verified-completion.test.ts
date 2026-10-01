import { describe, expect, it } from "vitest";
import {
  applyVerifiedBugRetest,
  type BugReportV2,
} from "../src/index.js";

function report(fixed = false, mustPreserve?: readonly string[]): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Attack Challenge",
      mapVersion: "1.1.1",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: [{
      id: "BUG-AC-AAAAAAA",
      fixed,
      severity: "major",
      category: "game-flow",
      foundBy: "tester",
      title: "Level cannot continue",
      problem: "The level cannot continue.",
      expected: "The next phase starts.",
      observed: "The level remains stuck.",
      reproduction: [
        "Start the level.",
        "Complete the objective.",
        "Confirm the next phase does not start.",
      ],
      ...(mustPreserve === undefined ? {} : { mustPreserve }),
    }],
  };
}

const validationTrace = {
  runs: [{
    runId: "run-1",
    scenarioId: "scenario-1",
    scenarioRevision: "1",
    intentInvariantIds: ["inv:progression"],
    ok: true,
    proofLevel: "LOCAL GAME VERIFIED" as const,
    proofSufficient: true,
    current: true,
    staleReasons: [],
    evidenceIds: ["evidence:retest"],
  }],
  invariants: [{
    invariantId: "inv:progression",
    scenarioIds: ["scenario-1"],
    runIds: ["run-1"],
    currentPassingRunIds: ["run-1"],
    current: true,
  }],
};

describe("verified bug completion", () => {
  it("closes a bug only with current sufficient validation evidence", () => {
    const result = applyVerifiedBugRetest({
      report: report(),
      bugId: "BUG-AC-AAAAAAA",
      mapName: "Attack Challenge",
      mapVersion: "1.1.1",
      testedVersion: "1.26.32",
      outcome: "passed",
      evidenceIds: ["evidence:retest"],
      requiredInvariantIds: ["inv:progression"],
      validationTrace,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs[0]?.fixed).toBe(true);
  });

  it("rejects stale or missing proof", () => {
    const result = applyVerifiedBugRetest({
      report: report(),
      bugId: "BUG-AC-AAAAAAA",
      mapName: "Attack Challenge",
      mapVersion: "1.1.1",
      testedVersion: "1.26.32",
      outcome: "passed",
      evidenceIds: ["evidence:retest"],
      requiredInvariantIds: ["inv:progression"],
      validationTrace: {
        runs: [],
        invariants: [{
          invariantId: "inv:progression",
          scenarioIds: ["scenario-1"],
          runIds: ["run-old"],
          currentPassingRunIds: [],
          current: false,
        }],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code))
      .toContain("validation-not-current");
  });

  it("requires preservation proof when Must Preserve exists", () => {
    const result = applyVerifiedBugRetest({
      report: report(false, ["Keep player inventory cleanup intact."]),
      bugId: "BUG-AC-AAAAAAA",
      mapName: "Attack Challenge",
      mapVersion: "1.1.1",
      testedVersion: "1.26.32",
      outcome: "passed",
      evidenceIds: ["evidence:retest"],
      requiredInvariantIds: ["inv:progression"],
      validationTrace,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code))
      .toContain("missing-preservation-proof");
  });

  it("accepts passing preservation verification", () => {
    const result = applyVerifiedBugRetest({
      report: report(false, ["Keep player inventory cleanup intact."]),
      bugId: "BUG-AC-AAAAAAA",
      mapName: "Attack Challenge",
      mapVersion: "1.1.1",
      testedVersion: "1.26.32",
      outcome: "passed",
      evidenceIds: ["evidence:retest"],
      requiredInvariantIds: ["inv:progression"],
      validationTrace,
      preservationInvariantIds: ["inv:inventory-cleanup"],
      preservationReceipt: {
        contractId: "contract-1",
        transactionId: "tx-1",
        passed: true,
        verifiedMustChangeInvariantIds: ["inv:progression"],
        verifiedMustPreserveInvariantIds: ["inv:inventory-cleanup"],
        evidenceIds: ["evidence:preservation"],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs[0]?.fixed).toBe(true);
  });

  it("reopens a previously fixed bug when retest still fails", () => {
    const result = applyVerifiedBugRetest({
      report: report(true),
      bugId: "BUG-AC-AAAAAAA",
      mapName: "Attack Challenge",
      mapVersion: "1.1.1",
      testedVersion: "1.26.32",
      outcome: "failed",
      evidenceIds: ["evidence:failure"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs[0]?.fixed).toBe(false);
  });

  it("rejects retest evidence from another version", () => {
    const result = applyVerifiedBugRetest({
      report: report(),
      bugId: "BUG-AC-AAAAAAA",
      mapName: "Attack Challenge",
      mapVersion: "1.1.2",
      testedVersion: "1.26.32",
      outcome: "failed",
      evidenceIds: ["evidence:failure"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code))
      .toContain("map-version-mismatch");
  });
});
