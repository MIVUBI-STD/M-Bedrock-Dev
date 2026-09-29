import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  GitHubReportClient,
} from "../src/github-report-client.js";

describe("GitHubReportClient", () => {
  it("lists reports through the app backend", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          reports: [{
            path: "bug-reports/a.json",
            mapName: "A",
            mapVersion: "1.0.0",
            fixed: 1,
            total: 2,
          }],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    );

    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.listReports()).resolves.toEqual([
      {
        path: "bug-reports/a.json",
        mapName: "A",
        mapVersion: "1.0.0",
        fixed: 1,
        total: 2,
      },
    ]);
  });

  it("saves without exposing GitHub credentials to the browser", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ saved: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    );

    const client = new GitHubReportClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.saveReport(
      "bug-reports/a.json",
      {
        schema: "m-bedrock-bug-report/v2",
        map: {
          name: "A",
          mapVersion: "1.0.0",
          baseVersion: "1.26.20",
          testedVersion: "1.26.20",
        },
        repairBy: "developer",
        bugs: [{
          id: "BUG-A-001",
          fixed: false,
          severity: "minor",
          category: "ui-feedback",
          foundBy: "tester",
          title: "A",
          problem: "A",
          expected: "A",
          observed: "A",
        }],
      },
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(JSON.stringify(init)).not.toContain("Bearer");
  });
});
