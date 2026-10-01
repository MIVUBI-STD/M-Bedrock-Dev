import type { CoverageQualityDashboard } from "./coverage-quality-dashboard.js";

export interface GeneratedKnownLimit {
  id: string;
  source: "coverage-quality";
  subject: string;
  state: "runtime-required" | "weak-coverage" | "insufficient-data";
  reason: string;
}

export function generateKnownLimits(dashboard: CoverageQualityDashboard): GeneratedKnownLimit[] {
  return dashboard.rows.flatMap((row) => {
    if (row.status === "strong" || row.status === "partial") return [];
    const state: GeneratedKnownLimit["state"] = row.status === "runtime-only" ? "runtime-required" : row.status === "weak" ? "weak-coverage" : "insufficient-data";
    return [{ id: "known-limit:" + row.category + ":" + row.key, source: "coverage-quality" as const, subject: row.key, state, reason: row.reasons.join(" ") }];
  }).sort((a,b)=>a.id.localeCompare(b.id));
}

export function renderKnownLimitsMarkdown(limits: readonly GeneratedKnownLimit[]): string {
  const lines = ["# Generated Known Limits", "", "Generated from current capability/quality evidence. Do not hand-edit.", ""];
  if (limits.length === 0) return lines.concat(["No generated limits.", ""]).join("\n");
  for (const item of limits) {
    lines.push("## " + item.subject, "", "- State: " + item.state, "- Source: " + item.source, "- Reason: " + item.reason, "");
  }
  return lines.join("\n");
}
