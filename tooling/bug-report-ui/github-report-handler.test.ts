import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  handleBugReportStoreRequest,
} from "./github-report-handler.js";
import type {
  GitHubBugReportStore,
} from "./github-report-store.js";

function report() {
  return {
    schema: "m-bedrock-bug-report/v2" as const,
    map: {
      name: "Golden",
      mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer" as const,
    bugs: [{
      id: "BUG-G-001",
      fixed: false,
      severity: "minor" as const,
      category: "ui-feedback" as const,
      foundBy: "tester" as const,
      title: "Join feedback remains visible",
      problem:
        "The join prompt remains visible after the player leaves the join area.",
      expected:
        "The join prompt disappears after leaving the join area.",
      observed:
        "The join prompt remains visible outside the join area.",
      reproduction: [
        "Enter the join area until the prompt appears.",
        "Leave the join area.",
        "Confirm the join prompt remains visible outside the area.",
      ],
    }],
  };
}

function storeStub() {
  return {
    listReports: vi.fn(async () => []),
    loadReport: vi.fn(),
    createReport: vi.fn(async () => ({
      revision: "created",
    })),
    saveReport: vi.fn(),
    completeVerifiedRepair: vi.fn(async () => ({ revision: "verified" })),
    completeClosedRepair: vi.fn(async () => ({ revision: "closed" })),
  } as unknown as GitHubBugReportStore;
}

describe("bug report handler", () => {
  it("creates a handoff-ready report through POST", async () => {
    const store = storeStub();
    const response = await handleBugReportStoreRequest(
      new Request("http://localhost/api/bug-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "workspace/reports/golden.json",
          report: report(),
        }),
      }),
      store,
    );

    expect(response.status).toBe(201);
    expect(store.createReport).toHaveBeenCalledTimes(1);
  });

  it("rejects schema-valid reports that are not handoff-ready", async () => {
    const store = storeStub();
    const value = report();
    const [bug] = value.bugs;
    if (!bug) throw new Error("Fixture bug is missing.");
    const {
      reproduction: _reproduction,
      ...withoutTrigger
    } = bug;

    const response = await handleBugReportStoreRequest(
      new Request("http://localhost/api/bug-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "workspace/reports/golden.json",
          report: {
            ...value,
            bugs: [withoutTrigger],
          },
        }),
      }),
      store,
    );

    expect(response.status).toBe(400);
    const body = await response.json() as {
      error?: string;
    };
    expect(body.error).toBe(
      "Bug Report V2 is not handoff-ready.",
    );
    expect(store.createReport).not.toHaveBeenCalled();
  });
  it("routes fixed completion through verified repair persistence", async () => {
    const store = storeStub();
    const response = await handleBugReportStoreRequest(
      new Request("http://localhost/api/bug-report/fixed", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "workspace/reports/golden.json",
          bugId: "BUG-G-001",
          validationRunIds: ["run:1"],
          validationTrace: {
            runs: [{
              runId: "run:1",
              scenarioId: "scenario:1",
              scenarioRevision: "rev-1",
              intentInvariantIds: ["intent:1"],
              ok: true,
              proofLevel: "LIVE GAME VERIFIED",
              proofSufficient: true,
              current: true,
              staleReasons: [],
              evidenceIds: ["evidence:1"],
            }],
            invariants: [],
          },
          expectedRevision: "abc",
        }),
      }),
      store,
    );

    expect(response.status).toBe(200);
    expect(store.completeVerifiedRepair).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed verification traces before persistence", async () => {
    const store = storeStub();
    const response = await handleBugReportStoreRequest(
      new Request("http://localhost/api/bug-report/fixed", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "workspace/reports/golden.json",
          bugId: "BUG-G-001",
          validationRunIds: ["run:1"],
          validationTrace: {
            runs: [{
              runId: "run:1",
              ok: true,
              current: true,
              evidenceIds: ["evidence:1"],
            }],
            invariants: [],
          },
          expectedRevision: "abc",
        }),
      }),
      store,
    );

    expect(response.status).toBe(400);
    expect(store.completeVerifiedRepair).not.toHaveBeenCalled();
  });

  it("routes full lifecycle closure through closed repair persistence", async () => {
    const store = storeStub();
    const response = await handleBugReportStoreRequest(
      new Request("http://localhost/api/bug-report/closed", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "workspace/reports/golden.json",
          bugId: "BUG-G-001",
          repairBy: "developer",
          closure: {
            schemaVersion: 1,
            transactionId: "tx:1",
            scenarioId: "scenario:1",
            disposition: "fixed",
            proofLayerEvidence: {
              transitive: ["e:t"],
              runtime: ["e:r"],
              preservation: ["e:p"],
              package: ["e:pkg"],
            },
            regressionEvidenceIds: ["e:reg"],
            evidenceIds: ["e:t", "e:r", "e:p", "e:pkg", "e:reg"],
          },
          preservation: {
            contractId: "contract:1",
            transactionId: "tx:1",
            passed: true,
            verifiedMustChangeInvariantIds: ["intent:change"],
            verifiedMustPreserveInvariantIds: ["intent:preserve"],
            evidenceIds: ["e:p"],
          },
          expectedRevision: "abc",
        }),
      }),
      store,
    );

    expect(response.status).toBe(200);
    expect(store.completeClosedRepair).toHaveBeenCalledTimes(1);
  });

});
