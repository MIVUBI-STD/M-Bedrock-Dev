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
          path: "bug-reports/a.json",
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
      path: "bug-reports/a.json",
      mapName: "A",
      mapVersion: "1.0.0",
      fixed: 1,
      total: 2,
      blockers: 1,
    }]);
  });

  it("loads report plus source revision", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        report,
        revision: "abc",
      }), { status: 200 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.loadReport("bug-reports/a.json"),
    ).resolves.toEqual({
      report,
      revision: "abc",
    });
  });

  it("saves using expected revision without browser credentials", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        revision: "def",
      }), { status: 200 }),
    );
    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.saveReport(
        "bug-reports/a.json",
        report,
        "abc",
      ),
    ).resolves.toEqual({
      revision: "def",
    });

    const call = fetchMock.mock.calls[0] as unknown as [
      unknown,
      RequestInit,
    ];
    const init = call[1];
    expect(JSON.parse(String(init.body))).toMatchObject({
      expectedRevision: "abc",
    });
    expect(JSON.stringify(init)).not.toContain("Bearer");
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
        "bug-reports/a.json",
        report,
      ),
    ).resolves.toEqual({
      revision: "new",
    });

    const call = fetchMock.mock.calls[0] as unknown as [
      unknown,
      RequestInit,
    ];
    expect(call[1].method).toBe("POST");
  });

  it("maps revision conflicts to a dedicated error", async () => {
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
      client.saveReport(
        "bug-reports/a.json",
        report,
        "abc",
      ),
    ).rejects.toBeInstanceOf(GitHubReportConflictError);
  });
});
