import {
  parseBugReportV2,
  type BugReportV2,
} from "../../../engine/packages/bug-report/src/index.js";
import type {
  ReportStore,
  ReportSummary,
} from "./report-source.js";

export interface GitHubReportClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export class GitHubReportClient
  implements ReportStore {
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

  async listReports(): Promise<readonly ReportSummary[]> {
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
        reports: ReportSummary[];
      }
    ).reports;
  }

  async loadReport(path: string): Promise<BugReportV2> {
    const body = await this.#json(
      "/api/bug-report?path=" +
        encodeURIComponent(path),
    );
    if (
      typeof body !== "object" ||
      body === null ||
      !("report" in body)
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
    return parsed.report;
  }

}
