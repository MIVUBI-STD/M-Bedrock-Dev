import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  GitHubReportClient,
  GitHubReportConflictError,
} from "../src/github-report-client.js";

const report = {
  schema: "m-bedrock-bug-report/v2" as const,
  map: {
    name: "A",
    mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
    baseVersion: "1.26.20",
    testedVersion: "1.26.20",
  },
  repairBy: "developer" as const,
  bugs: [{
    id: "BUG-A-001",
    fixed: false,
    severity: "minor" as const,
    category: "ui-feedback" as const,
    foundBy: "tester" as const,
    title: "A",
    problem: "A",
    expected: "A",
    observed: "A",
  }],
};

describe("GitHubReportClient", () => {
  it("lists reports through the app backend", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        reports: [{
          path: "workspace/reports/a.json",
          mapName: "A",
          mapVersion: "1.0.0",
          fixed: 1,
          total: 2,
          blockers: 1,
        }],
      }), { status: 200 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.listReports()).resolves.toEqual([{
      path: "workspace/reports/a.json",
      mapName: "A",
      mapVersion: "1.0.0",
      fixed: 1,
      total: 2,
      blockers: 1,
    }]);
  });

  it("loads a schema-valid canonical report for audit reading", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        report,
        revision: "rev-1",
      }), { status: 200 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.loadReport("workspace/reports/a.json"),
    ).resolves.toEqual(report);
  });

  it("creates a GitHub report from an imported file", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        revision: "new",
      }), { status: 200 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.createReport(
        "workspace/reports/a.json",
        report,
      ),
    ).resolves.toBeUndefined();

    const call = fetchMock.mock.calls[0] as unknown as [
      unknown,
      RequestInit,
    ];
    expect(call[1].method).toBe("POST");
  });

  it("publishes a canonical report with optimistic revision", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        revision: "rev-1",
        googleDoc: {
          documentId: "doc-1",
          url: "https://docs.google.com/document/d/doc-1/edit",
          title: "A v1.0.0 - Bug Report",
        },
        pdf: {
          fileName: "A v1.0.0 - Bug Report.pdf",
          url: "https://drive.google.com/file/d/pdf-1/view",
        },
      }), { status: 200 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await client.publishReport(
      "workspace/reports/a.json",
      "rev-1",
    );

    expect(result.googleDoc.documentId).toBe("doc-1");
    const call = fetchMock.mock.calls[0] as unknown as [
      unknown,
      RequestInit,
    ];
    expect(call[1].method).toBe("POST");
    expect(String(call[0])).toContain(
      "/api/bug-report/publish",
    );
  });

  it("maps create conflicts to a dedicated error", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        code: "report-conflict",
        error: "changed",
      }), { status: 409 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.createReport(
        "workspace/reports/a.json",
        report,
      ),
    ).rejects.toBeInstanceOf(GitHubReportConflictError);
  });
});
