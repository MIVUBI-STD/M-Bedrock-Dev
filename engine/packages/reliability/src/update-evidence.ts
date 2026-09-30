import type {
  MinecraftUpdateDelta,
  ReliabilityDomain,
  UpdateChangeKind,
  UpdateDeltaEntry,
} from "./types.js";

export interface UpdateEvidenceSource {
  title: string;
  url: string;
  publishedDate?: string;
  authority: "official" | "curated" | "observed";
}

export interface UpdateEvidenceItem {
  id: string;
  domain: ReliabilityDomain;
  changeKind: UpdateChangeKind;
  capabilityTags: readonly string[];
  affectedIdentifiers: readonly string[];
  summary: string;
  source: UpdateEvidenceSource;
  confidence: "documented" | "observed" | "inferred";
}

export interface CuratedUpdateEvidence {
  schemaVersion: 1;
  fromVersion?: string;
  toVersion: string;
  sources: readonly UpdateEvidenceSource[];
  items: readonly UpdateEvidenceItem[];
}

export function normalizeUpdateEvidence(
  evidence: CuratedUpdateEvidence,
): MinecraftUpdateDelta {
  const entries: UpdateDeltaEntry[] = evidence.items.map((item) => ({
    id: item.id,
    kind: item.changeKind,
    domain: item.domain,
    capabilityTags: [...new Set(item.capabilityTags)].sort(),
    affectedIdentifiers: [...new Set(item.affectedIdentifiers)].sort(),
    summary: item.summary,
    source: item.source.url,
    confidence: item.confidence,
  }));

  return {
    ...(evidence.fromVersion ? { fromVersion: evidence.fromVersion } : {}),
    toVersion: evidence.toVersion,
    entries: entries.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function validateUpdateEvidence(
  evidence: CuratedUpdateEvidence,
): string[] {
  const errors: string[] = [];
  if (evidence.schemaVersion !== 1) errors.push("Update evidence schemaVersion must be 1.");
  if (!evidence.toVersion.trim()) errors.push("Update evidence toVersion is required.");
  if (evidence.sources.length === 0) errors.push("Update evidence requires at least one source.");

  const sourceUrls = new Set(evidence.sources.map((source) => source.url));
  const ids = new Set<string>();

  for (const source of evidence.sources) {
    if (!source.title.trim()) errors.push("Update evidence source title is required.");
    if (!source.url.trim()) errors.push("Update evidence source URL is required.");
  }

  for (const item of evidence.items) {
    if (!item.id.trim()) errors.push("Update evidence item id is required.");
    if (ids.has(item.id)) errors.push(`Duplicate update evidence item id: ${item.id}`);
    ids.add(item.id);
    if (!item.summary.trim()) errors.push(`Update evidence item ${item.id} requires a summary.`);
    if (!sourceUrls.has(item.source.url)) {
      errors.push(`Update evidence item ${item.id} references an undeclared source.`);
    }
  }

  return errors;
}
