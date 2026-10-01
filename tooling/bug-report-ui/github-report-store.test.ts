import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  GitHubBugReportConflictError,
  GitHubBugReportStore,
} from "./github-report-store.js";

function report() {
  return {
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
      fixed: true,
      severity: "minor" as const,
      category: "ui-feedback" as const,
      foundBy: "tester" as const,
      title: "Join feedback remains visible",
      problem: "The join prompt remains visible after the player leaves the join area.",
      expected: "The join prompt disappears after leaving the join area.",
      observed: "The join prompt remains visible outside the join area.",
      reproduction: [
        "Enter the join area until the prompt appears.",
        "Leave the join area.",
        "Confirm the join prompt remains visible outside the area.",
      ],
    }],
  };
}

describe("GitHubBugReportStore", () => {
  it("updates only the revision that was opened", async () => {
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
        JSON.stringify({
          content: { sha: "def" },
        }),
        { status: 200 },
      ));

    const store = new GitHubBugReportStore({
      owner: "MIVUBI-STD",
      repository: "M-Bedrock-Dev",
      branch: "Local",
      token: "secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      store.saveReport(
        "bug-reports/a.json",
        report(),
        "abc",
      ),
    ).resolves.toEqual({
      revision: "def",
    });

    const saveInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(saveInit.body))).toMatchObject({
      sha: "abc",
      branch: "Local",
    });
  });

  it("creates a report only when the path is unused", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ message: "Not Found" }),
        { status: 404 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          content: { sha: "created" },
        }),
        { status: 201 },
      ));

    const store = new GitHubBugReportStore({
      owner: "MIVUBI-STD",
      repository: "M-Bedrock-Dev",
      branch: "Local",
      token: "secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      store.createReport(
        "bug-reports/a.json",
        report(),
      ),
    ).resolves.toEqual({
      revision: "created",
    });
  });

  it("refuses to overwrite a changed report", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          type: "file",
          path: "bug-reports/a.json",
          sha: "newer",
          content: "",
          encoding: "base64",
        }),
        { status: 200 },
      ));

    const store = new GitHubBugReportStore({
      owner: "MIVUBI-STD",
      repository: "M-Bedrock-Dev",
      branch: "Local",
      token: "secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      store.saveReport(
        "bug-reports/a.json",
        report(),
        "older",
      ),
    ).rejects.toBeInstanceOf(
      GitHubBugReportConflictError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
      store.saveReport(
        "../outside.json",
        report(),
        "abc",
      ),
    ).rejects.toThrow(/inside bug-reports/);
  });
});
