import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BugTrackerDocument } from "./model.js";
import { exportBugTracker } from "./export.js";
import { renderBugTrackerHtml } from "./render-html.js";

const fixture: BugTrackerDocument = {
  schema: "m-bedrock-bug-tracker/v1",
  title: "Bug Tracker Report",
  games: [{
    name: "Export Fixture",
    levels: [{
      level: null,
      version: "1.0.0",
      source: {
        projectId: "export-fixture",
        artifactId: "drive:fixture",
        artifactFingerprint: "sha256:fixture",
        version: "1.0.0",
        driveFolder: "https://drive.google.com/drive/folders/folder",
        worldFile: "https://drive.google.com/file/d/fixture/view",
        worldFilename: "Export Fixture v1.0.0.mcworld",
      },
      issues: [{
        id: "BUG-EXPORT-001",
        type: "BUG",
        severity: "MAJOR",
        verification: "VERIFIED",
        title: "Export issue",
        issue: "The export fixture has one gameplay issue.",
        reproduction: ["Trigger the export fixture."],
        observed: "The wrong result appears.",
        expected: "The expected result appears.",
      }],
      devNotes: [{
        id: "DEV-EXPORT-001",
        type: "DEV_NOTE",
        title: "Export developer note",
        problem: "A concrete release condition needs attention.",
        action: "Correct the existing release owner.",
        evidence: { source: "fixture" },
        severity: null,
      }],
    }],
  }],
};

describe("Bug Tracker export boundary", () => {
  it("writes JSON and HTML with exactly the same canonical IDs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await exportBugTracker(fixture, dir, renderBugTrackerHtml);
      const [json, html] = await Promise.all([
        readFile(join(dir, "bug-tracker.json"), "utf8"),
        readFile(join(dir, "bug-tracker.html"), "utf8"),
      ]);
      expect(json).toContain('"BUG-EXPORT-001"');
      expect(json).toContain('"DEV-EXPORT-001"');
      expect(html).toContain('data-issue-id="BUG-EXPORT-001"');
      expect(html).toContain('data-issue-id="DEV-EXPORT-001"');
      expect(html).toContain('id="saveHtml"');
      expect(html).toContain('id="saveJson"');
      expect(html).toContain('id="importJson"');
      expect(html).toContain('id="resetData"');
      expect(html).toContain('id="workspace-snapshot"');
      expect(html).toContain('class="files"');
      expect(html).toContain('class="pics"');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a renderer that drops a canonical UI capability", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await expect(
        exportBugTracker(
          fixture,
          dir,
          (document) => renderBugTrackerHtml(document).replace('id="saveHtml"', 'id="missingSaveHtml"'),
        ),
      ).rejects.toThrow(/functional contract/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a renderer that drops a canonical ID", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await expect(
        exportBugTracker(
          fixture,
          dir,
          (document) => renderBugTrackerHtml(document).replace(
            'data-issue-id="DEV-EXPORT-001"',
            'data-dropped-id="DEV-EXPORT-001"',
          ),
        ),
      ).rejects.toThrow(/issue-ID parity/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a renderer that invents an extra ID", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await expect(
        exportBugTracker(
          fixture,
          dir,
          (document) => renderBugTrackerHtml(document) + '<div data-issue-id="INVENTED"></div>',
        ),
      ).rejects.toThrow(/issue-ID parity/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
