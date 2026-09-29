import {
  parseBugReportV2,
  type BugReportV2,
} from "../../../packages/bug-report/src/index.js";
import type {
  GitHubReportStore,
  GitHubReportSummary,
  LoadedGitHubReport,
  SavedGitHubReport,
} from "./report-source.js";

export class GitHubReportConflictError extends Error {
  constructor() {
    super("This GitHub report changed after you opened it.");
    this.name = "GitHubReportConflictError";
  }
}

export interface GitHubReportClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export class GitHubReportClient
  implements GitHubReportStore {
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;

  constructor(
    options: GitHubReportClientOptions = {},
  ) {
    this.#baseUrl =
      (options.baseUrl ?? "").replace(/\/$/, "");
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async #json(
    path: string,
    init?: RequestInit,
  ): Promise<unknown> {
    const response = await this.#fetch(
      this.#baseUrl + path,
      init,
    );
    const body = await response.json() as unknown;

    if (!response.ok) {
      if (
        response.status === 409 &&
        typeof body === "object" &&
        body !== null &&
        "code" in body &&
        (body as { code?: unknown }).code === "report-conflict"
      ) {
        throw new GitHubReportConflictError();
      }
      const error =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "GitHub report request failed.";
      throw new Error(error);
    }

    return body;
  }

  async listReports(): Promise<readonly GitHubReportSummary[]> {
    const body = await this.#json(
      "/api/bug-reports",
    );
    if (
      typeof body !== "object" ||
      body === null ||
      !("reports" in body) ||
      !Array.isArray(
        (body as { reports?: unknown }).reports,
      )
    ) {
      throw new Error(
        "GitHub report list response is invalid.",
      );
    }
    return (
      body as {
        reports: GitHubReportSummary[];
      }
    ).reports;
  }

  async loadReport(path: string): Promise<LoadedGitHubReport> {
    const body = await this.#json(
      "/api/bug-report?path=" +
        encodeURIComponent(path),
    );
    if (
      typeof body !== "object" ||
      body === null ||
      !("report" in body) ||
      !("revision" in body) ||
      typeof (body as { revision?: unknown }).revision !== "string"
    ) {
      throw new Error(
        "GitHub report response is invalid.",
      );
    }
    const parsed = parseBugReportV2(
      (body as { report: unknown }).report,
    );
    if (!parsed.ok) {
      throw new Error(
        "GitHub report response is not valid V2.",
      );
    }
    return {
      report: parsed.report,
      revision: (body as { revision: string }).revision,
    };
  }

  async createReport(
    path: string,
    report: BugReportV2,
  ): Promise<SavedGitHubReport> {
    const body = await this.#json(
      "/api/bug-report",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          report,
        }),
      },
    );
    if (
      typeof body !== "object" ||
      body === null ||
      !("revision" in body) ||
      typeof (body as { revision?: unknown }).revision !== "string"
    ) {
      throw new Error("GitHub create response is invalid.");
    }
    return {
      revision: (body as { revision: string }).revision,
    };
  }

  async saveReport(
    path: string,
    report: BugReportV2,
    expectedRevision: string,
  ): Promise<SavedGitHubReport> {
    const body = await this.#json(
      "/api/bug-report",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          report,
          expectedRevision,
        }),
      },
    );
    if (
      typeof body !== "object" ||
      body === null ||
      !("revision" in body) ||
      typeof (body as { revision?: unknown }).revision !== "string"
    ) {
      throw new Error("GitHub save response is invalid.");
    }
    return {
      revision: (body as { revision: string }).revision,
    };
  }
}
