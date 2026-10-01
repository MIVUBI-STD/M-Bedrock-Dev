import { describe, expect, it } from "vitest";
import { assessKnowledgeFreshness, createKnowledgeChangeCandidate } from "../src/index.js";

describe("knowledge freshness", () => {
  const current = { sourceId: "official:update", url: "https://example.test", authority: "official" as const, contentFingerprint: "b", capturedAt: "2026-10-01T00:00:00Z" };
  it("quarantines changed source instead of promoting truth", () => {
    const baseline = { ...current, contentFingerprint: "a", capturedAt: "2026-09-01T00:00:00Z" };
    const assessment = assessKnowledgeFreshness(baseline, current, "2026-10-01T00:00:00Z", 30);
    expect(assessment.state).toBe("changed");
    expect(createKnowledgeChangeCandidate(baseline, current, assessment)?.state).toBe("quarantined");
  });
});
