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

function validationTraceInput(value: unknown): value is import(
  "../../engine/packages/validation/src/index.js"
).ValidationTraceReport {
  if (
    typeof value !== "object" ||
    value === null ||
    !("runs" in value) ||
    !Array.isArray((value as { runs?: unknown }).runs) ||
    !("invariants" in value) ||
    !Array.isArray((value as { invariants?: unknown }).invariants)
  ) {
    return false;
  }

  return (value as { runs: unknown[] }).runs.every((run) =>
    typeof run === "object" &&
    run !== null &&
    typeof (run as { runId?: unknown }).runId === "string" &&
    typeof (run as { ok?: unknown }).ok === "boolean" &&
    typeof (run as { current?: unknown }).current === "boolean" &&
    Array.isArray((run as { evidenceIds?: unknown }).evidenceIds) &&
    (run as { evidenceIds: unknown[] }).evidenceIds.every(
      (item) => typeof item === "string",
    )
  );
}

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
      request.method === "PATCH" &&
      url.pathname === "/api/bug-report/fixed"
    ) {
      const input = await request.json() as {
        path?: unknown;
        bugId?: unknown;
        validationRunIds?: unknown;
        validationTrace?: unknown;
        expectedRevision?: unknown;
      };
      if (
        typeof input.path !== "string" ||
        !input.path.trim() ||
        typeof input.bugId !== "string" ||
        !input.bugId.trim() ||
        !Array.isArray(input.validationRunIds) ||
        input.validationRunIds.some((item) => typeof item !== "string") ||
        typeof input.expectedRevision !== "string" ||
        !input.expectedRevision.trim() ||
        !validationTraceInput(input.validationTrace)
      ) {
        return json({ error: "Invalid verified repair completion request." }, 400);
      }

      return json(await store.completeVerifiedRepair(
        input.path,
        {
          bugId: input.bugId,
          validationRunIds: input.validationRunIds as string[],
        },
        input.validationTrace,
        input.expectedRevision,
      ));
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
