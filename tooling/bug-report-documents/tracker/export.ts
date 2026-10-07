import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BugTrackerDocument } from "./model.js";
import { trackerIssueIds, validateBugTrackerDocument } from "./validate.js";

export interface TrackerRenderer {
  (document: BugTrackerDocument): string;
}


function assertHtmlFunctionalContract(html: string): void {
  const required = [
    'id="saveButton"',
    'id="saveHtml"',
    'id="saveJson"',
    'id="importJson"',
    'id="resetData"',
    'id="workspace-snapshot"',
    'class="files"',
    'class="pics"',
    'data-result="SUCCESS"',
    'data-result="FAILED"',
    'Save as HTML',
    'Save JSON',
    'Load JSON',
    'Reset Tester Data',
  ];
  const missing = required.filter((token) => !html.includes(token));
  if (missing.length > 0) {
    throw new Error(
      "HTML functional contract failed; missing canonical renderer capabilities: " +
        missing.join(", "),
    );
  }
  const forbidden = [
    "Mark fixed",
    "Export HTML Snapshot",
    "Export JSON",
  ];
  const stale = forbidden.filter((token) => html.includes(token));
  if (stale.length > 0) {
    throw new Error(
      "HTML functional contract failed; stale presentation returned: " +
        stale.join(", "),
    );
  }
}

export async function exportBugTracker(document: BugTrackerDocument, outDir: string, renderHtml: TrackerRenderer): Promise<void> {
  validateBugTrackerDocument(document);
  const json = JSON.stringify(document, null, 2) + "\n";
  const html = renderHtml(document);
  assertHtmlFunctionalContract(html);
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
