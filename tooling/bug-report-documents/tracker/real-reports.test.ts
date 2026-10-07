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

const cases = [
  { projectId: "attack-challenge", developerNotes: 0 },
  { projectId: "defense-challenge", developerNotes: 0 },
  { projectId: "composite-challenge", developerNotes: 0 },
  { projectId: "the-circuit", developerNotes: 2 },
] as const;

describe("Golden Tracker real approved-report parity", () => {
  for (const testCase of cases) {
    it(testCase.projectId, async () => {
      const projectRoot = resolve("workspace/projects", testCase.projectId);
      const [source, projectSource] = await Promise.all([
        readFile(resolve(projectRoot, "report/bug-report.json"), "utf8"),
        readFile(resolve(projectRoot, "project.json"), "utf8"),
      ]);
      let developerNotesSource = '{"schema":"m-bedrock-dev-notes/v1","notes":[]}';
      try {
        developerNotesSource = await readFile(
          resolve(projectRoot, "report/developer-notes.json"),
          "utf8",
        );
      } catch {}
      const localDeveloperNotes = JSON.parse(developerNotesSource) as {
        schema: "m-bedrock-dev-notes/v1";
        notes: readonly Omit<DeveloperNoteRegistry["notes"][number], "projectId">[];
      };
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
        { projects: [JSON.parse(projectSource)] } as ProjectRegistry,
        {
          schema: localDeveloperNotes.schema,
          notes: localDeveloperNotes.notes.map((note) => ({
            ...note,
            projectId: testCase.projectId,
          })),
        } as DeveloperNoteRegistry,
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

      expect(developerNoteCount).toBe(testCase.developerNotes);

      if (testCase.projectId === "the-circuit") {
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

      if (testCase.projectId === "defense-challenge") {
        expect(developerNoteCount).toBe(0);
        expect(html).toContain("DEV NOTES<span>0</span>");
      }
    });
  }
});
