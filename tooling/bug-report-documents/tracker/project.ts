import type { BugReportClientDocument } from "../../../engine/packages/bug-report/src/document/model.js";
import type { BugTrackerDocument, TrackerDeveloperNote, TrackerGame, TrackerIssue, TrackerSourceBinding } from "./model.js";

interface RegistryProject {
  readonly projectId: string;
  readonly projectName: string;
  readonly artifact: { readonly artifactId: string; readonly artifactFingerprint: string; readonly version: string };
  readonly knowledge?: { readonly bugReportPath?: string };
  readonly publication?: { readonly drive?: { readonly mapFolder?: { readonly folderId: string }; readonly currentWorld?: { readonly fileId: string; readonly fileName: string; readonly version: string } } };
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

export function resolveSourceBinding(registry: ProjectRegistry, mapName: string, version: string): TrackerSourceBinding {
  const exact = registry.projects.filter((p) => p.projectName === mapName && p.artifact.version === version);
  if (exact.length !== 1) throw new Error("Expected exactly one project-registry binding for " + mapName + " v" + version + ".");
  const p = exact[0]!;
  const drive = p.publication?.drive;
  if (!drive?.mapFolder?.folderId || !drive.currentWorld?.fileId || !drive.currentWorld.fileName) {
    throw new Error("Incomplete Drive binding for " + mapName + " v" + version + ".");
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
  const source = resolveSourceBinding(registry, document.map.name, document.map.mapVersion);
  const game: TrackerGame = {
    name: document.map.name,
    levels: [{ level: null, version: document.map.mapVersion, source, issues: document.issues.map(issueFromClient), devNotes: developerNotesForProject(developerNotes, source.projectId) }],
  };
  return { schema: "m-bedrock-bug-tracker/v1", title: "Bug Tracker Report", games: [game] };
}
