import type { BugReportClientDocument } from "../../../engine/packages/bug-report/src/document/model.js";
import type { BugTrackerDocument, TrackerDeveloperNote, TrackerGame, TrackerIssue, TrackerSourceBinding } from "./model.js";

interface RegistryProject {
  readonly projectId: string;
  readonly projectName: string;
  readonly artifact: { readonly artifactId: string; readonly artifactFingerprint: string; readonly version: string };
  readonly knowledge?: { readonly bugReportPath?: string };
  readonly publication?: { readonly drive?: { readonly mapFolder?: { readonly folderId: string }; readonly currentWorld?: { readonly fileId: string; readonly fileName: string; readonly version: string; readonly artifactFingerprint?: string } } };
}

export interface ProjectRegistry { readonly projects: readonly RegistryProject[] }

export interface DeveloperNoteRegistry {
  readonly schema: "m-bedrock-dev-notes/v1";
  readonly notes: readonly TrackerDeveloperNoteSource[];
}

interface TrackerDeveloperNoteSource {
  readonly id: string;
  readonly projectId: string;
  readonly type: "DEV_NOTE";
  readonly title: string;
  readonly problem: string;
  readonly action: string;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly severity: null;
}

function driveUrl(id: string): string { return "https://drive.google.com/drive/folders/" + id; }
function fileUrl(id: string): string { return "https://drive.google.com/file/d/" + id + "/view"; }

export function validateDeveloperNoteRegistry(registry: DeveloperNoteRegistry): void {
  const errors: string[] = [];
  if (registry.schema !== "m-bedrock-dev-notes/v1") {
    errors.push("Invalid Developer Note registry schema.");
  }
  const ids = registry.notes.map((note) => note.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("Duplicate Developer Note ID.");
  }
  for (const note of registry.notes) {
    if (note.type !== "DEV_NOTE") errors.push(note.id + ": invalid Developer Note type.");
    if (note.severity !== null) errors.push(note.id + ": Developer Note severity must be null.");
    if (!note.id.trim() || !note.projectId.trim() || !note.title.trim() || !note.problem.trim() || !note.action.trim()) {
      errors.push((note.id || "<missing-id>") + ": incomplete Developer Note authority record.");
    }
    if (note.evidence === null || typeof note.evidence !== "object" || Array.isArray(note.evidence)) {
      errors.push(note.id + ": Developer Note evidence must be an object.");
    }
  }
  if (errors.length > 0) {
    throw new Error("Developer Note registry validation failed:\n- " + errors.join("\n- "));
  }
}

export function resolveSourceBinding(registry: ProjectRegistry, mapName: string, version: string): TrackerSourceBinding {
  const exact = registry.projects.filter((p) => p.projectName === mapName && p.artifact.version === version);
  if (exact.length !== 1) throw new Error("Expected exactly one project-registry binding for " + mapName + " v" + version + ".");
  const p = exact[0]!;
  const drive = p.publication?.drive;
  if (!drive?.mapFolder?.folderId || !drive.currentWorld?.fileId || !drive.currentWorld.fileName) {
    throw new Error("Incomplete Drive binding for " + mapName + " v" + version + ".");
  }
  if (drive.currentWorld.version !== p.artifact.version) {
    throw new Error("Project Registry version binding mismatch for " + mapName + ".");
  }
  if (p.artifact.artifactId !== "drive:" + drive.currentWorld.fileId) {
    throw new Error("Project Registry artifact binding mismatch for " + mapName + ".");
  }
  if (drive.currentWorld.artifactFingerprint && drive.currentWorld.artifactFingerprint !== p.artifact.artifactFingerprint) {
    throw new Error("Project Registry fingerprint binding mismatch for " + mapName + ".");
  }
  return {
    projectId: p.projectId,
    artifactId: p.artifact.artifactId,
    artifactFingerprint: p.artifact.artifactFingerprint,
    version: p.artifact.version,
    driveFolder: driveUrl(drive.mapFolder.folderId),
    worldFile: fileUrl(drive.currentWorld.fileId),
    worldFilename: drive.currentWorld.fileName,
    ...(p.knowledge?.bugReportPath ? { bugReportPath: p.knowledge.bugReportPath } : {}),
  };
}

function issueFromClient(issue: BugReportClientDocument["issues"][number]): TrackerIssue {
  return {
    id: issue.id,
    type: issue.issueType,
    severity: issue.severity.toUpperCase() as TrackerIssue["severity"],
    verification: "VERIFIED",
    title: issue.title,
    issue: issue.issue,
    reproduction: issue.reproduction,
    observed: issue.observed,
    expected: issue.expected,
    ...(issue.recommendedResolution ? { resolution: issue.recommendedResolution } : {}),
    ...(issue.technicalAnalysis ? { technicalAnalysis: issue.technicalAnalysis } : {}),
    ...(issue.relevantCode ? { relevantCode: issue.relevantCode } : {}),
    ...(issue.mustPreserve ? { mustPreserve: issue.mustPreserve } : {}),
  };
}

function developerNotesForProject(
  registry: DeveloperNoteRegistry,
  projectId: string,
): TrackerDeveloperNote[] {
  return registry.notes
    .filter((note) => note.projectId === projectId)
    .map((note) => ({
      id: note.id,
      type: note.type,
      title: note.title,
      problem: note.problem,
      action: note.action,
      evidence: note.evidence,
      severity: note.severity,
    }));
}

export function projectClientDocumentToTracker(
  document: BugReportClientDocument,
  registry: ProjectRegistry,
  developerNotes: DeveloperNoteRegistry,
): BugTrackerDocument {
  validateDeveloperNoteRegistry(developerNotes);
  const knownProjectIds = new Set(registry.projects.map((project) => project.projectId));
  const orphanNote = developerNotes.notes.find((note) => !knownProjectIds.has(note.projectId));
  if (orphanNote) {
    throw new Error("Developer Note references unknown Project Registry project: " + orphanNote.id + " -> " + orphanNote.projectId + ".");
  }
  const source = resolveSourceBinding(registry, document.map.name, document.map.mapVersion);
  const game: TrackerGame = {
    name: document.map.name,
    levels: [{ level: null, version: document.map.mapVersion, source, issues: document.issues.map(issueFromClient), devNotes: developerNotesForProject(developerNotes, source.projectId) }],
  };
  return { schema: "m-bedrock-bug-tracker/v1", title: "Bug Tracker Report", games: [game] };
}
