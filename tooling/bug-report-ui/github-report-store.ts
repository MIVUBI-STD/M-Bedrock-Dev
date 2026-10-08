import {
  completeBugReportFromClosedRepair,
  type PostRepairClosureReceipt,
} from "../../engine/packages/orchestrator/src/index.js";
import type {
  PreservationVerificationReceipt,
} from "../../engine/packages/preservation/src/index.js";
import {
  BUG_REPORT_WORKSPACE_DIRECTORY,
  bugReportV2Progress,
  parseBugReportV2Json,
  buildBugReportWorkspacePath,
  serializeBugReportV2,
  type BugReportSummary,
  type BugReportV2,
} from "../../engine/packages/bug-report/src/index.js";

export interface GitHubBugReportStoreOptions {
  readonly owner: string;
  readonly repository: string;
  readonly branch: string;
  readonly token: string;
  readonly apiBaseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export type GitHubBugReportSummary = BugReportSummary;

export interface LoadedGitHubBugReport {
  readonly report: BugReportV2;
  readonly revision: string;
}

export interface SavedGitHubBugReport {
  readonly revision: string;
}

export class GitHubBugReportConflictError extends Error {
  constructor(message = "GitHub bug report changed after it was opened.") {
    super(message);
    this.name = "GitHubBugReportConflictError";
  }
}

interface GitHubContentFile {
  readonly type: "file";
  readonly path: string;
  readonly sha: string;
  readonly content?: string;
  readonly encoding?: string;
}

interface GitHubContentDirectoryEntry {
  readonly type: "file" | "dir" | "symlink" | "submodule";
  readonly path: string;
  readonly name: string;
  readonly sha: string;
}

interface GitHubWriteResponse {
  readonly content?: {
    readonly sha?: string;
  };
}

function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) {
    throw new Error(label + " must be non-empty.");
  }
}

function encodedPath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function decodeBase64Utf8(value: string): string {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeBase64Utf8(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

export class GitHubBugReportStore {
  readonly #owner: string;
  readonly #repository: string;
  readonly #branch: string;
  readonly #token: string;
  readonly #apiBaseUrl: string;
  readonly #fetch: typeof fetch;

  constructor(options: GitHubBugReportStoreOptions) {
    assertNonEmpty(options.owner, "GitHub owner");
    assertNonEmpty(options.repository, "GitHub repository");
    assertNonEmpty(options.branch, "GitHub branch");
    assertNonEmpty(options.token, "GitHub token");

    this.#owner = options.owner;
    this.#repository = options.repository;
    this.#branch = options.branch;
    this.#token = options.token;
    this.#apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.#fetch = options.fetchImpl ?? fetch;
  }

  #assertReportPath(path: string): void {
    const parts = path.split("/");
    const base = BUG_REPORT_WORKSPACE_DIRECTORY.split("/");
    const project = parts[2];
    const validProject = typeof project === "string" &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project);
    const single = parts.length === 5 &&
      parts[3] === "report" && parts[4] === "bug-report.json";
    const multi = parts.length === 7 &&
      parts[3] === "levels" &&
      /^level-[1-9][0-9]*$/.test(parts[4] ?? "") &&
      parts[5] === "report" && parts[6] === "bug-report.json";
    if (parts[0] !== base[0] || parts[1] !== base[1] ||
        !validProject || (!single && !multi)) {
      throw new Error("Bug report path must be a canonical project/level report/bug-report.json.");
    }
  }

  async #request(
    path: string,
    init?: RequestInit,
    allowedStatuses: readonly number[] = [],
  ): Promise<Response> {
    const response = await this.#fetch(
      this.#apiBaseUrl + path,
      {
        ...init,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + this.#token,
          "X-GitHub-Api-Version": "2022-11-28",
          ...init?.headers,
        },
      },
    );

    if (!response.ok && !allowedStatuses.includes(response.status)) {
      const body = await response.text();
      throw new Error(
        "GitHub report store request failed (" +
          String(response.status) +
          "): " +
          body,
      );
    }

    return response;
  }

  #contentsPath(path: string): string {
    return (
      "/repos/" +
      encodeURIComponent(this.#owner) +
      "/" +
      encodeURIComponent(this.#repository) +
      "/contents/" +
      encodedPath(path)
    );
  }

  async #currentFile(path: string): Promise<GitHubContentFile | undefined> {
    const response = await this.#request(
      this.#contentsPath(path) +
        "?ref=" +
        encodeURIComponent(this.#branch),
      undefined,
      [404],
    );
    if (response.status === 404) return undefined;
    return await response.json() as GitHubContentFile;
  }

  async listReports(): Promise<readonly GitHubBugReportSummary[]> {
    const response = await this.#request(
      this.#contentsPath(BUG_REPORT_WORKSPACE_DIRECTORY) +
        "?ref=" + encodeURIComponent(this.#branch),
    );
    const entries = await response.json() as GitHubContentDirectoryEntry[];
    const projects = entries.filter((entry) =>
      entry.type === "dir" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name));

    const paths = (await Promise.all(projects.map(async (entry) => {
      const file = await this.#currentFile(entry.path + "/project.json");
      if (!file || file.encoding !== "base64" || typeof file.content !== "string") {
        throw new Error("Missing project identity: " + entry.path);
      }
      const project = JSON.parse(decodeBase64Utf8(file.content)) as {
        projectId?: unknown; levels?: unknown;
      };
      if (project.projectId !== entry.name) {
        throw new Error("Project identity mismatch: " + entry.path);
      }
      if (project.levels === undefined) {
        return [buildBugReportWorkspacePath(entry.name)];
      }
      if (!Array.isArray(project.levels) || project.levels.length === 0) {
        throw new Error("Invalid project levels: " + entry.path);
      }
      const seen = new Set<number>();
      return project.levels.map((level: unknown) => {
        if (typeof level !== "object" || level === null || !("level" in level) ||
            !Number.isSafeInteger(level.level) || (level.level as number) < 1 ||
            seen.has(level.level as number)) {
          throw new Error("Invalid or duplicate level: " + entry.path);
        }
        seen.add(level.level as number);
        return buildBugReportWorkspacePath(entry.name, "level-" + String(level.level));
      });
    }))).flat();

    const summaries = (await Promise.all(paths.map(async (path) => {
      const file = await this.#currentFile(path);
      if (!file) return undefined;
      const loaded = await this.loadReport(path);
      const progress = bugReportV2Progress(loaded.report);
      return {
        path,
        mapName: loaded.report.map.name,
        mapVersion: loaded.report.map.mapVersion,
        fixed: progress.fixed,
        total: progress.total,
        blockers: loaded.report.bugs.filter((bug) =>
          !bug.fixed && bug.severity === "blocker").length,
      };
    }))).filter((item): item is GitHubBugReportSummary => item !== undefined);
    return summaries.sort((left, right) =>
      Number(right.blockers > 0) - Number(left.blockers > 0) ||
      (right.total - right.fixed) - (left.total - left.fixed) ||
      left.mapName.localeCompare(right.mapName) ||
      left.mapVersion.localeCompare(right.mapVersion));
  }

  async loadReport(path: string): Promise<LoadedGitHubBugReport> {
    this.#assertReportPath(path);
    const file = await this.#currentFile(path);
    if (!file) {
      throw new Error("GitHub bug report does not exist.");
    }
    if (
      file.type !== "file" ||
      file.encoding !== "base64" ||
      typeof file.content !== "string"
    ) {
      throw new Error("GitHub bug report content is not a base64 file.");
    }

    const parsed = parseBugReportV2Json(
      decodeBase64Utf8(file.content),
    );
    if (!parsed.ok) {
      throw new Error(
        "GitHub bug report is not valid V2: " +
          parsed.issues
            .map((issue) => issue.path + ": " + issue.message)
            .join("; "),
      );
    }
    return {
      report: parsed.report,
      revision: file.sha,
    };
  }


  async #saveReport(
    path: string,
    report: BugReportV2,
    expectedRevision: string,
  ): Promise<SavedGitHubBugReport> {
    this.#assertReportPath(path);
    const serialized = serializeBugReportV2(report);
    if (!serialized.ok || !serialized.json) {
      throw new Error("Refusing to save invalid Bug Report V2.");
    }

    assertNonEmpty(expectedRevision, "Expected GitHub revision");
    const current = await this.#currentFile(path);
    if (!current || current.sha !== expectedRevision) {
      throw new GitHubBugReportConflictError();
    }

    const response = await this.#request(
      this.#contentsPath(path),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "chore(bug-report): update " + report.map.name,
          content: encodeBase64Utf8(serialized.json),
          branch: this.#branch,
          sha: expectedRevision,
        }),
      },
    );
    const result = await response.json() as GitHubWriteResponse;
    const revision = result.content?.sha;
    if (!revision) {
      throw new Error("GitHub did not return the saved report revision.");
    }
    return { revision };
  }
  async saveReport(
    path: string,
    report: BugReportV2,
    expectedRevision: string,
  ): Promise<SavedGitHubBugReport> {
    const current = await this.loadReport(path);
    if (current.revision !== expectedRevision) {
      throw new GitHubBugReportConflictError();
    }

    const currentSerialized =
      serializeBugReportV2(current.report);
    const incomingSerialized =
      serializeBugReportV2(report);
    if (
      !currentSerialized.ok ||
      !currentSerialized.json ||
      !incomingSerialized.ok ||
      !incomingSerialized.json
    ) {
      throw new Error(
        "Generic report save requires valid canonical Bug Report V2 state.",
      );
    }

    if (
      currentSerialized.json !==
      incomingSerialized.json
    ) {
      throw new Error(
        "Presentation UI cannot modify canonical issue facts or repair state; use the approved report workflow for issue changes or closed repair completion for Fixed state.",
      );
    }

    // Exact no-op saves are accepted without creating another Git revision.
    return {
      revision: current.revision,
    };
  }

  async completeClosedRepair(
    path: string,
    input: {
      readonly bugId: string;
      readonly repairBy: BugReportV2["repairBy"];
      readonly closure: PostRepairClosureReceipt;
      readonly preservation: PreservationVerificationReceipt;
    },
    expectedRevision: string,
  ): Promise<SavedGitHubBugReport> {
    const current = await this.loadReport(path);
    if (current.revision !== expectedRevision) {
      throw new GitHubBugReportConflictError();
    }

    const completed = completeBugReportFromClosedRepair({
      report: current.report,
      bugId: input.bugId,
      repairBy: input.repairBy,
      closure: input.closure,
      preservation: input.preservation,
    });

    return this.#saveReport(
      path,
      completed,
      expectedRevision,
    );
  }

}
