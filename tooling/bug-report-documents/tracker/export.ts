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
  for (const id of ids) {
    if (!html.includes('data-issue-id="' + id.replaceAll("&", "&amp;").replaceAll('"', "&quot;") + '"')) {
      throw new Error("HTML/JSON parity failed for issue " + id + ".");
    }
  }
  await writeFile(join(outDir, "Bug-Tracker-Report.json"), json, "utf8");
  await writeFile(join(outDir, "Bug-Tracker-Report.html"), html, "utf8");
}
