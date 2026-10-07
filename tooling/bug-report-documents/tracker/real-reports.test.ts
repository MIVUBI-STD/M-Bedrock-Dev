import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseBugReportV2Json,
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
} from "../../../engine/packages/bug-report/src/index.js";
import { projectClientDocumentToTracker, type DeveloperNoteRegistry, type ProjectRegistry } from "./project.js";
import { renderBugTrackerHtml } from "./render-html.js";
import { trackerIssueIds, validateBugTrackerDocument } from "./validate.js";

const reportPaths = [
  "workspace/reports/Attack-Challenge-v1.1.1-BugReport.json",
  "workspace/reports/Defense-Challenge-v1.1.1-BugReport.json",
  "workspace/reports/Composite-Challenge-v1.1.1-BugReport.json",
  "workspace/reports/The-Circuit-v1.0.2-BugReport.json",
] as const;

describe("Golden Tracker real approved-report parity", () => {
  for (const reportPath of reportPaths) {
    it(reportPath, async () => {
      const [source, registrySource, developerNotesSource] = await Promise.all([
        readFile(resolve(reportPath), "utf8"),
        readFile(resolve("workspace/project-registry.json"), "utf8"),
        readFile(resolve("workspace/developer-notes.json"), "utf8"),
      ]);
      const parsed = parseBugReportV2Json(source);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const client = projectBugReportClientDocument(parsed.report, {
        includeFixed: true,
        includeMinor: true,
      });
      expect(reviewBugReportClientDocument(client)).toEqual([]);

      const tracker = projectClientDocumentToTracker(
        client,
        JSON.parse(registrySource) as ProjectRegistry,
        JSON.parse(developerNotesSource) as DeveloperNoteRegistry,
      );
      validateBugTrackerDocument(tracker);
      const ids = trackerIssueIds(tracker);
      const html = renderBugTrackerHtml(tracker);

      expect(ids.length).toBe(client.issues.length + tracker.games.flatMap((game) => game.levels.flatMap((level) => level.devNotes)).length);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(html).toContain('data-issue-id="' + id + '"');
      }
      expect(html).toContain("Drive Folder ↗");
      expect(html).toContain("World File ↗");
      expect(html).not.toContain('<details class="map" open');

      const developerNoteCount = tracker.games.flatMap((game) =>
        game.levels.flatMap((level) => level.devNotes),
      ).length;

      if (reportPath === "workspace/reports/The-Circuit-v1.0.2-BugReport.json") {
        expect(developerNoteCount).toBe(2);
        expect(html).toContain("DEV-CIR-FORTIFY-WAVE-PREVIEW");
        expect(html).toContain("DEV-CIR-BLOCK-BREAK-FEEDBACK");
        expect(html).toContain("DEV NOTE");
        expect(html).toContain("REFERENCE");
        const noteStart = html.indexOf('data-issue-id="DEV-CIR-FORTIFY-WAVE-PREVIEW"');
        const noteEnd = html.indexOf("</article>", noteStart);
        expect(noteStart).toBeGreaterThanOrEqual(0);
        expect(noteEnd).toBeGreaterThan(noteStart);
        expect(html.slice(noteStart, noteEnd)).not.toContain("Mark fixed");
      }

      if (reportPath === "workspace/reports/Defense-Challenge-v1.1.1-BugReport.json") {
        expect(developerNoteCount).toBe(0);
        expect(html).toContain("DEV NOTES<span>0</span>");
      }
    });
  }
});
