import { describe, expect, it } from "vitest";
import {
  retrieveDocumentSections,
  type DocumentSection,
} from "../src/section-retrieval.js";

const sections: readonly DocumentSection[] = [
  {
    id: "document.analysis.mandatory-audit-procedure#prove",
    documentId: "document.analysis.mandatory-audit-procedure",
    path: "docs/analysis/mandatory-audit-procedure.md",
    heading: "PROVE",
    level: 2,
    anchor: "prove",
    startLine: 100,
    endLine: 180,
  },
  {
    id: "document.analysis.mandatory-audit-procedure#report",
    documentId: "document.analysis.mandatory-audit-procedure",
    path: "docs/analysis/mandatory-audit-procedure.md",
    heading: "REPORT",
    level: 2,
    anchor: "report",
    startLine: 181,
    endLine: 240,
  },
  {
    id: "document.analysis.player-lifecycle#reconnect",
    documentId: "document.analysis.player-lifecycle",
    path: "docs/analysis/player-lifecycle.md",
    heading: "Reconnect",
    level: 3,
    anchor: "reconnect",
    startLine: 80,
    endLine: 120,
  },
];

describe("retrieveDocumentSections", () => {
  it("restricts search to selected documents", () => {
    const results = retrieveDocumentSections(sections, {
      text: "prove",
      documentIds: [
        "document.analysis.mandatory-audit-procedure",
      ],
    });

    expect(results.map((item) => item.section.anchor)).toEqual([
      "prove",
    ]);
    expect(results[0]?.reasons).toContain("document-scope");
  });

  it("can use optional semantic ranking without making it authority", () => {
    const results = retrieveDocumentSections(sections, {
      text: "session recovery",
      semanticScores: {
        "document.analysis.player-lifecycle#reconnect": 0.9,
      },
    });

    expect(results[0]?.section.anchor).toBe("reconnect");
    expect(results[0]?.reasons).toContain("semantic-rank");
  });
});
