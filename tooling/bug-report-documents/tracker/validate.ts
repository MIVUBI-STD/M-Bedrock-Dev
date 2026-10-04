import type { BugTrackerDocument } from "./model.js";

const FORBIDDEN_VISIBLE_TERMS = [
  "system prompt",
  "chain of thought",
  "proof yield",
  "canonical projection",
  "candidate generated",
  "ai thinks",
] as const;

export function trackerIssueIds(document: BugTrackerDocument): string[] {
  return document.games.flatMap((game) =>
    game.levels.flatMap((level) => level.issues.map((issue) => issue.id)),
  );
}

export function validateBugTrackerDocument(document: BugTrackerDocument): void {
  const errors: string[] = [];
  const ids = trackerIssueIds(document);
  if (new Set(ids).size !== ids.length) errors.push("Duplicate issue ID.");

  for (const game of document.games) {
    if (!game.name.trim()) errors.push("Game name is required.");
    for (const level of game.levels) {
      const source = level.source;
      if (!source.driveFolder.trim()) errors.push(game.name + ": Drive Folder is required.");
      if (!source.worldFile.trim()) errors.push(game.name + ": World File is required.");
      if (!source.worldFilename.trim()) errors.push(game.name + ": world filename is required.");
      if (!source.artifactFingerprint.trim()) errors.push(game.name + ": artifact fingerprint is required.");
      for (const issue of level.issues) {
        if (!issue.id.trim() || !issue.title.trim() || !issue.issue.trim()) {
          errors.push(game.name + ": incomplete issue identity.");
        }
        if (issue.reproduction.length === 0) errors.push(issue.id + ": reproduction is required.");
        if (!issue.observed.trim() || !issue.expected.trim()) errors.push(issue.id + ": Observed and Expected are required.");
        const visible = [issue.title, issue.issue, ...issue.reproduction, issue.observed, issue.expected, issue.resolution ?? ""].join(" ").toLowerCase();
        for (const term of FORBIDDEN_VISIBLE_TERMS) {
          if (visible.includes(term)) errors.push(issue.id + ": forbidden internal UI term: " + term);
        }
      }
    }
  }

  if (errors.length > 0) throw new Error("Bug Tracker validation failed:\n- " + errors.join("\n- "));
}
