import type {
  BugReportV2,
} from "../../engine/packages/bug-report/src/index.js";
import {
  parseBugReportV2,
  reviewBugReportCopy,
  reviewBugReportReadiness,
} from "../../engine/packages/bug-report/src/index.js";
import {
  GitHubBugReportConflictError,
  type GitHubBugReportStore,
} from "./github-report-store.js";

function json(
  value: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(value),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export async function handleBugReportStoreRequest(
  request: Request,
  store: GitHubBugReportStore,
): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (
      request.method === "GET" &&
      url.pathname === "/api/bug-reports"
    ) {
      return json({
        reports: await store.listReports(),
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/bug-report"
    ) {
      const path = url.searchParams.get("path");
      if (!path) {
        return json({ error: "Missing path." }, 400);
      }
      return json(await store.loadReport(path));
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/bug-report"
    ) {
      const input = await request.json() as {
        path?: unknown;
        report?: unknown;
      };
      if (typeof input.path !== "string" || !input.path.trim()) {
        return json({ error: "Missing path." }, 400);
      }

      const parsed = parseBugReportV2(input.report);
      if (!parsed.ok) {
        return json({
          error: "Invalid Bug Report V2.",
          issues: parsed.issues,
        }, 400);
      }

      const issues = [
        ...reviewBugReportReadiness(parsed.report.bugs),
        ...reviewBugReportCopy(parsed.report.bugs),
      ];
      if (issues.length > 0) {
        return json({
          error: "Bug Report V2 is not handoff-ready.",
          issues,
        }, 400);
      }

      return json(
        await store.createReport(
          input.path,
          parsed.report as BugReportV2,
        ),
        201,
      );
    }

    if (
      request.method === "PUT" &&
      url.pathname === "/api/bug-report"
    ) {
      const input = await request.json() as {
        path?: unknown;
        report?: unknown;
        expectedRevision?: unknown;
      };
      if (typeof input.path !== "string" || !input.path.trim()) {
        return json({ error: "Missing path." }, 400);
      }

      if (
        typeof input.expectedRevision !== "string" ||
        !input.expectedRevision.trim()
      ) {
        return json({ error: "Missing expectedRevision." }, 400);
      }

      const parsed = parseBugReportV2(input.report);
      if (!parsed.ok) {
        return json({
          error: "Invalid Bug Report V2.",
          issues: parsed.issues,
        }, 400);
      }

      return json(await store.saveReport(
        input.path,
        parsed.report as BugReportV2,
        input.expectedRevision,
      ));
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    if (error instanceof GitHubBugReportConflictError) {
      return json({
        error: error.message,
        code: "report-conflict",
      }, 409);
    }
    return json({
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }, 500);
  }
}
