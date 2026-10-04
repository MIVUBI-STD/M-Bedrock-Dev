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
  it("accepts exact no-op saves without creating a Git revision", async () => {
    const encoded = Buffer.from(
      JSON.stringify(report()),
      "utf8",
    ).toString("base64");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          type: "file",
          path: "workspace/reports/a.json",
          sha: "abc",
          content: encoded,
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
        "workspace/reports/a.json",
        report(),
        "abc",
      ),
    ).resolves.toEqual({
      revision: "abc",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses to overwrite a changed report", async () => {
    const encoded = Buffer.from(
      JSON.stringify(report()),
      "utf8",
    ).toString("base64");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          type: "file",
          path: "workspace/reports/a.json",
          sha: "newer",
          content: encoded,
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
        "workspace/reports/a.json",
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
    ).rejects.toThrow("inside workspace/reports/");
  });
  it("rejects any canonical issue mutation through generic save", async () => {
    const current = report();
    const encoded = Buffer.from(
      JSON.stringify(current),
      "utf8",
    ).toString("base64");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          type: "file",
          path: "workspace/reports/a.json",
          sha: "abc",
          content: encoded,
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

    const changed = {
      ...current,
      bugs: current.bugs.map((bug) => ({
        ...bug,
        severity: "major" as const,
        issueType:
          "DESIGN_MISMATCH" as const,
      })),
    };

    await expect(
      store.saveReport(
        "workspace/reports/a.json",
        changed,
        "abc",
      ),
    ).rejects.toThrow(
      /cannot modify canonical issue facts/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects generic fixed-state changes and reserves them for closed repair completion", async () => {
    const current = report();
    const open = {
      ...current,
      bugs: current.bugs.map((bug) => ({
        ...bug,
        fixed: false,
      })),
    };
    const encoded = Buffer.from(
      JSON.stringify(open),
      "utf8",
    ).toString("base64");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          type: "file",
          path: "workspace/reports/a.json",
          sha: "abc",
          content: encoded,
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
        "workspace/reports/a.json",
        current,
        "abc",
      ),
    ).rejects.toThrow(
      /closed repair completion/i,
    );
  });

});
