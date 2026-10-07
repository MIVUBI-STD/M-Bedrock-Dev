import { describe, expect, it } from "vitest";
import type { BugReportClientDocument } from "../../../engine/packages/bug-report/src/document/model.js";
import { projectClientDocumentToTracker, resolveSourceBinding, validateDeveloperNoteRegistry, type DeveloperNoteRegistry, type ProjectRegistry } from "./project.js";
import { renderBugTrackerHtml } from "./render-html.js";
import { trackerIssueIds, validateBugTrackerDocument } from "./validate.js";

const registry: ProjectRegistry = { projects: [{
  projectId: "fixture-map",
  projectName: "Fixture Map",
  artifact: { artifactId: "drive:fixture-world", artifactFingerprint: "sha256:fixture", version: "1.0.0" },
  knowledge: { bugReportPath: "workspace/reports/Fixture-Map-v1.0.0-BugReport.json" },
  publication: { drive: { mapFolder: { folderId: "fixture-folder" }, currentWorld: { fileId: "fixture-world", fileName: "Fixture Map v1.0.0.mcworld", version: "1.0.0" } } },
}] };

const developerNotes: DeveloperNoteRegistry = {
  schema: "m-bedrock-dev-notes/v1",
  notes: [{
    id: "DEV-FIXTURE-001",
    projectId: "fixture-map",
    type: "DEV_NOTE",
    title: "Fixture Developer Note",
    problem: "A concrete release condition needs developer attention.",
    action: "Correct the existing release owner.",
    evidence: { source: "fixture" },
    severity: null,
  }],
};

const client: BugReportClientDocument = {
  schema: "m-bedrock-bug-report-client-document/v1",
  title: "Fixture Map — Bug Report",
  subtitle: "fixture",
  map: { name: "Fixture Map", mapVersion: "1.0.0", testedVersion: "fixture" },
  summary: { visibleIssues: 1, openIssues: 1, fixedIssues: 0, blocker: 0, major: 1, minor: 0, statement: "fixture" },
  severityLegend: [],
  issues: [{
    number: 1, id: "BUG-FIXTURE-001", issueType: "BUG", severity: "major", status: "open", category: "player-state",
    title: "Fixture issue", issue: "A visible player-state failure occurs.",
    reproduction: ["Enter the fixture.", "Confirm the wrong result."],
    observed: "The wrong result is visible.", expected: "The expected result is visible.",
    recommendedResolution: "Restore the expected state.",
  }],
};

describe("Bug Tracker integration", () => {
  it("binds report facts to Project Registry source authority", () => {
    const source = resolveSourceBinding(registry, "Fixture Map", "1.0.0");
    expect(source.worldFilename).toBe("Fixture Map v1.0.0.mcworld");
    expect(source.bugReportPath).toContain("Fixture-Map");
  });
  it("projects and renders the same unique issue IDs", () => {
    const tracker = projectClientDocumentToTracker(client, registry, developerNotes);
    validateBugTrackerDocument(tracker);
    expect(trackerIssueIds(tracker)).toEqual(["BUG-FIXTURE-001", "DEV-FIXTURE-001"]);
    expect(renderBugTrackerHtml(tracker)).toContain('data-issue-id="BUG-FIXTURE-001"');
    expect(renderBugTrackerHtml(tracker)).toContain('data-issue-id="DEV-FIXTURE-001"');
    expect(renderBugTrackerHtml(tracker)).toContain("DEV NOTES");
  });
  it("fails closed when registry identity is ambiguous", () => {
    const ambiguous: ProjectRegistry = { projects: [...registry.projects, registry.projects[0]!] };
    expect(() => resolveSourceBinding(ambiguous, "Fixture Map", "1.0.0")).toThrow(/exactly one/);
  });

  it("fails closed when Project Registry current-world version disagrees with artifact authority", () => {
    const broken: ProjectRegistry = {
      projects: [{
        ...registry.projects[0]!,
        publication: {
          drive: {
            mapFolder: { folderId: "fixture-folder" },
            currentWorld: { fileId: "fixture-world", fileName: "Fixture Map v0.9.0.mcworld", version: "0.9.0" },
          },
        },
      }],
    };
    expect(() => resolveSourceBinding(broken, "Fixture Map", "1.0.0")).toThrow(/version binding mismatch/);
  });

  it("fails closed when Project Registry current-world file disagrees with artifact authority", () => {
    const broken: ProjectRegistry = {
      projects: [{
        ...registry.projects[0]!,
        publication: {
          drive: {
            mapFolder: { folderId: "fixture-folder" },
            currentWorld: { fileId: "other-world", fileName: "Fixture Map v1.0.0.mcworld", version: "1.0.0" },
          },
        },
      }],
    };
    expect(() => resolveSourceBinding(broken, "Fixture Map", "1.0.0")).toThrow(/artifact binding mismatch/);
  });

  it("rejects malformed Developer Note authority before projection", () => {
    const duplicate: DeveloperNoteRegistry = {
      ...developerNotes,
      notes: [...developerNotes.notes, developerNotes.notes[0]!],
    };
    expect(() => validateDeveloperNoteRegistry(duplicate)).toThrow(/Duplicate Developer Note ID/);

    const wrongSeverity = {
      ...developerNotes,
      notes: [{ ...developerNotes.notes[0]!, severity: "major" }],
    } as unknown as DeveloperNoteRegistry;
    expect(() => validateDeveloperNoteRegistry(wrongSeverity)).toThrow(/severity must be null/);
  });

  it("rejects Developer Notes bound to an unknown project", () => {
    const orphan: DeveloperNoteRegistry = {
      ...developerNotes,
      notes: [{ ...developerNotes.notes[0]!, projectId: "missing-project" }],
    };
    expect(() => projectClientDocumentToTracker(client, registry, orphan)).toThrow(/unknown Project Registry project/);
  });
});
