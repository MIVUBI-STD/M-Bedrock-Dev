import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BugTrackerDocument } from "./model.js";
import { trackerIssueIds, validateBugTrackerDocument } from "./validate.js";

export interface TrackerRenderer {
  (document: BugTrackerDocument): string;
}

export async function exportBugTracker(document: BugTrackerDocument, outDir: string, renderHtml: TrackerRenderer): Promise<void> {
  validateBugTrackerDocument(document);
  const json = JSON.stringify(document, null, 2) + "\n";
  const html = renderHtml(document);
  const ids = trackerIssueIds(document);
  const renderedIds = [...html.matchAll(/data-issue-id="([^"]+)"/g)].map((match) =>
    match[1]!
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&"),
  );
  const canonicalIds = new Set(ids);
  const renderedIdSet = new Set(renderedIds);
  if (
    renderedIds.length !== ids.length ||
    renderedIdSet.size !== renderedIds.length ||
    canonicalIds.size !== renderedIdSet.size ||
    ids.some((id) => !renderedIdSet.has(id))
  ) {
    throw new Error("HTML/JSON issue-ID parity failed.");
  }
  await writeFile(join(outDir, "bug-tracker.json"), json, "utf8");
  await writeFile(join(outDir, "bug-tracker.html"), html, "utf8");
}
