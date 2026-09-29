import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  GitHubBugReportStore,
} from "./github-report-store.js";

function report() {
  return {
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
      fixed: true,
      severity: "minor" as const,
      category: "ui-feedback" as const,
      foundBy: "tester" as const,
      title: "A",
      problem: "A",
      expected: "A",
      observed: "A",
    }],
  };
}

describe("GitHubBugReportStore", () => {
  it("updates an existing canonical report using its current GitHub sha", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          type: "file",
          path: "bug-reports/a.json",
          sha: "abc",
          content: "",
          encoding: "base64",
        }),
        { status: 200 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ content: { sha: "def" } }),
        { status: 200 },
      ));

    const store = new GitHubBugReportStore({
      owner: "MIVUBI-STD",
      repository: "M-Bedrock-Dev",
      branch: "Local",
      token: "secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await store.saveReport("bug-reports/a.json", report());

    const saveInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const body = JSON.parse(String(saveInit.body)) as {
      sha?: string;
      branch: string;
      content: string;
    };

    expect(body.sha).toBe("abc");
    expect(body.branch).toBe("Local");
    expect(body.content.length).toBeGreaterThan(0);
  });

  it("creates a new report when the GitHub path does not exist", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ message: "Not Found" }),
        { status: 404 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ content: { sha: "new" } }),
        { status: 201 },
      ));

    const store = new GitHubBugReportStore({
      owner: "MIVUBI-STD",
      repository: "M-Bedrock-Dev",
      branch: "Local",
      token: "secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await store.saveReport("bug-reports/a.json", report());

    const saveInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const body = JSON.parse(String(saveInit.body)) as {
      sha?: string;
    };
    expect(body.sha).toBeUndefined();
  });

  it("rejects paths outside the report directory", async () => {
    const store = new GitHubBugReportStore({
      owner: "MIVUBI-STD",
      repository: "M-Bedrock-Dev",
      branch: "Local",
      token: "secret",
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    await expect(
      store.saveReport("../outside.json", report()),
    ).rejects.toThrow(/inside bug-reports/);
  });
});
