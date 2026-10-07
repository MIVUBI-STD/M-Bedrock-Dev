import { describe, expect, it } from "vitest";
import type { BugTrackerDocument } from "./model.js";
import { renderBugTrackerHtml } from "./render-html.js";
import { validateBugTrackerDocument } from "./validate.js";

const fixture: BugTrackerDocument = {
  schema: "m-bedrock-bug-tracker/v1",
  title: "Bug Tracker Report",
  games: [{
    name: "Golden Fixture",
    levels: [{
      level: 1,
      version: "1.0.0",
      source: {
        projectId: "golden-fixture",
        artifactId: "drive:file",
        artifactFingerprint: "sha256:fixture",
        version: "1.0.0",
        driveFolder: "https://drive.google.com/drive/folders/folder",
        worldFile: "https://drive.google.com/file/d/file/view",
        worldFilename: "Golden Fixture v1.0.0.mcworld",
      },
      devNotes: [],
      issues: [{
        id: "BUG-GOLDEN-001",
        type: "BUG",
        severity: "MAJOR",
        verification: "NEEDS_VERIFY",
        title: "Fixture issue",
        issue: "The fixture demonstrates the locked issue-card hierarchy.",
        reproduction: ["Enter the fixture.", "Observe the wrong visible result."],
        observed: "The wrong result remains visible.",
        expected: "The expected result should be visible.",
        resolution: "Restore the expected fixture result.",
      }],
    }],
  }],
};

describe("Golden Bug Tracker renderer", () => {
  it("renders the locked hierarchy and mandatory source controls", () => {
    validateBugTrackerDocument(fixture);
    const html = renderBugTrackerHtml(fixture);
    expect(html).toContain("Bug Tracker Report");
    expect(html).toContain(">Maps<");
    expect(html).toContain("Needs Validation");
    expect(html).toContain("Expand Map ↓");
    expect(html).toContain("Collapse Map ↑");
    expect(html).toContain("LEVEL 1");
    expect(html).toContain("Drive Folder ↗");
    expect(html).toContain("World File ↗");
    expect(html).toContain("Test / Details ↓");
    expect(html).toContain("Collapse ↑");
    expect(html).toContain("NEEDS VALIDATION");
    expect(html).toContain("TEST IN-GAME");
    expect(html).toContain("EXPECTED");
    expect(html).toContain("Technical Details ↓");
    expect(html).toContain("Recommended Fix");
    expect(html).toContain("TEST RESULT");
    expect(html).toContain("✓ PASSED");
    expect(html).toContain("✕ FAILED");
    expect(html).toContain("Tester Notes");
    expect(html).toContain("Evidence · Optional");
    expect(html).toContain("Optional notes");
    expect(html.indexOf("TEST RESULT")).toBeLessThan(html.indexOf("Technical Details ↓"));
    expect(html).not.toContain("Mark fixed");
    expect(html).toContain('data-issue-id="BUG-GOLDEN-001"');
    expect(html).not.toContain("<details class=\"map\" open");
  });

  it("preserves unknown information as absent UI instead of inventing content", () => {
    const level = fixture.games[0]!.levels[0]!;
    const sparse: BugTrackerDocument = {
      ...fixture,
      games: [{
        ...fixture.games[0]!,
        levels: [{
          ...level,
          issues: [{
            ...level.issues[0]!,
            reproduction: [],
            observed: "",
            expected: "",
            resolution: undefined,
          }],
        }],
      }],
    };
    const html = renderBugTrackerHtml(sparse);
    expect(html).not.toContain("TEST IN-GAME");
    expect(html).not.toContain("EXPECTED");
    expect(html).not.toContain("Recommended Fix");
    expect(html).toContain("✓ PASSED");
    expect(html).toContain("✕ FAILED");
  });

  it("rejects duplicate issue IDs before rendering", () => {
    const duplicate: BugTrackerDocument = {
      ...fixture,
      games: [...fixture.games, fixture.games[0]!],
    };
    expect(() => validateBugTrackerDocument(duplicate)).toThrow(/Duplicate issue ID/);
  });

  it("rejects missing Drive bindings", () => {
    const level = fixture.games[0]!.levels[0]!;
    const broken: BugTrackerDocument = {
      ...fixture,
      games: [{
        ...fixture.games[0]!,
        levels: [{
          ...level,
          source: { ...level.source, driveFolder: "" },
        }],
      }],
    };
    expect(() => validateBugTrackerDocument(broken)).toThrow(/Drive Folder is required/);
  });
});
