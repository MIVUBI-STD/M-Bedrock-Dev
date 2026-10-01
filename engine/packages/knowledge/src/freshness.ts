import type { KnowledgeAuthority } from "./types.js";

export interface KnowledgeSourceSnapshot {
  sourceId: string;
  url: string;
  authority: KnowledgeAuthority;
  contentFingerprint: string;
  capturedAt: string;
}

export interface KnowledgeFreshnessAssessment {
  sourceId: string;
  state: "fresh" | "stale" | "changed" | "missing-baseline";
  changed: boolean;
  ageDays?: number;
  reason: string;
}

export interface KnowledgeChangeCandidate {
  schemaVersion: 1;
  sourceId: string;
  url: string;
  authority: KnowledgeAuthority;
  state: "quarantined";
  reason: "content-changed" | "source-stale" | "new-source";
  baselineFingerprint?: string;
  currentFingerprint: string;
  capturedAt: string;
}

function dateMs(value: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error("Invalid ISO date: " + value);
  return ms;
}

export function assessKnowledgeFreshness(
  baseline: KnowledgeSourceSnapshot | undefined,
  current: KnowledgeSourceSnapshot,
  nowIso: string,
  maxAgeDays: number,
): KnowledgeFreshnessAssessment {
  if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) {
    throw new Error("maxAgeDays must be a non-negative number.");
  }
  if (!current.sourceId.trim() || !current.contentFingerprint.trim()) {
    throw new Error("Knowledge source snapshot requires sourceId and contentFingerprint.");
  }
  const ageDays = Math.max(0, (dateMs(nowIso) - dateMs(current.capturedAt)) / 86400000);
  if (!baseline) {
    return { sourceId: current.sourceId, state: "missing-baseline", changed: false, ageDays, reason: "No reviewed baseline snapshot exists." };
  }
  const changed = baseline.contentFingerprint !== current.contentFingerprint;
  if (changed) {
    return { sourceId: current.sourceId, state: "changed", changed: true, ageDays, reason: "Current source fingerprint differs from the reviewed baseline." };
  }
  if (ageDays > maxAgeDays) {
    return { sourceId: current.sourceId, state: "stale", changed: false, ageDays, reason: "Source snapshot exceeds the configured freshness window." };
  }
  return { sourceId: current.sourceId, state: "fresh", changed: false, ageDays, reason: "Source fingerprint is stable and within freshness window." };
}

export function createKnowledgeChangeCandidate(
  baseline: KnowledgeSourceSnapshot | undefined,
  current: KnowledgeSourceSnapshot,
  assessment: KnowledgeFreshnessAssessment,
): KnowledgeChangeCandidate | undefined {
  if (assessment.state === "fresh") return undefined;
  const reason =
    assessment.state === "changed" ? "content-changed" :
    assessment.state === "stale" ? "source-stale" : "new-source";
  return {
    schemaVersion: 1,
    sourceId: current.sourceId,
    url: current.url,
    authority: current.authority,
    state: "quarantined",
    reason,
    ...(baseline ? { baselineFingerprint: baseline.contentFingerprint } : {}),
    currentFingerprint: current.contentFingerprint,
    capturedAt: current.capturedAt,
  };
}
