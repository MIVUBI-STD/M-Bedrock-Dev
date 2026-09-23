import { createHash } from "node:crypto";
import {
  assessKnowledgeRelations,
  type EffectiveKnowledgeProfile,
  type KnowledgeCatalog,
  type KnowledgeEvidence,
  type KnowledgeEvidenceMap,
} from "../../../packages/knowledge/src/index.js";
import {
  groupRuntimeEvidenceByScope,
  type RuntimeEvidenceRecord,
  type RuntimeEvidenceSnapshot,
} from "../../../packages/project-model/src/runtime-evidence.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

function idFor(scopeKey: string, relationId: string, status: string): string {
  return "diag_" + createHash("sha256")
    .update(`knowledge:${scopeKey}:${relationId}:${status}`)
    .digest("hex")
    .slice(0, 16);
}

function mergeEvidence(
  records: readonly RuntimeEvidenceRecord[],
): {
  map: KnowledgeEvidenceMap;
  conflicts: readonly string[];
} {
  const map: Record<string, KnowledgeEvidence> = {};
  const conflicts: string[] = [];

  for (const record of records) {
    const current = map[record.predicate];
    const sourceIds = record.sourceRefs?.map((source) =>
      `${source.artifactId}:${source.relativePath}`
    ) ?? [];

    if (!current) {
      map[record.predicate] = {
        state: record.state,
        sourceIds,
        ...(record.note === undefined ? {} : { note: record.note }),
      };
      continue;
    }

    const mergedSourceIds = [...new Set([
      ...(current.sourceIds ?? []),
      ...sourceIds,
    ])];

    if (current.state !== record.state) {
      map[record.predicate] = {
        state: "unknown",
        sourceIds: mergedSourceIds,
        note: "Conflicting runtime evidence states.",
      };
      conflicts.push(record.predicate);
      continue;
    }

    map[record.predicate] = {
      ...current,
      sourceIds: mergedSourceIds,
    };
  }

  return { map, conflicts: [...new Set(conflicts)].sort() };
}

export interface KnowledgeRuntimeDiagnosticInput {
  catalog: KnowledgeCatalog;
  profile: EffectiveKnowledgeProfile;
  snapshot: RuntimeEvidenceSnapshot;
}

export function knowledgeRuntimeDiagnostics(
  input: KnowledgeRuntimeDiagnosticInput,
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const [scopeKey, records] of groupRuntimeEvidenceByScope(input.snapshot)) {
    const { map, conflicts } = mergeEvidence(records);
    const sourceRefs = records.flatMap((record) => record.sourceRefs ?? []);
    const relatedNodeIds = [...new Set(
      records.flatMap((record) => record.relatedNodeIds ?? []),
    )];

    for (const predicate of conflicts) {
      findings.push({
        id: idFor(scopeKey, `evidence-conflict:${predicate}`, "unknown"),
        code: "KNOWLEDGE_EVIDENCE_GAP",
        severity: "info",
        message: `Conflicting runtime evidence prevents a reliable conclusion for ${predicate}.`,
        ...(sourceRefs[0] === undefined ? {} : { source: sourceRefs[0] }),
        ...(relatedNodeIds.length === 0 ? {} : { relatedNodeIds }),
        data: {
          scopeKey,
          predicate,
          status: "unknown",
          evidenceConflict: true,
        },
      });
    }

    for (const assessment of assessKnowledgeRelations(
      input.catalog,
      input.profile,
      map,
    )) {
      if (assessment.status === "satisfied") continue;

      findings.push({
        id: idFor(scopeKey, assessment.relationId, assessment.status),
        code: assessment.status === "violation"
          ? "KNOWLEDGE_RELATION_VIOLATION"
          : "KNOWLEDGE_EVIDENCE_GAP",
        severity: assessment.status === "violation" ? "medium" : "info",
        message: assessment.message,
        ...(sourceRefs[0] === undefined ? {} : { source: sourceRefs[0] }),
        ...(relatedNodeIds.length === 0 ? {} : { relatedNodeIds }),
        data: {
          scopeKey,
          relationId: assessment.relationId,
          relationKind: assessment.kind,
          subject: assessment.subject,
          object: assessment.object,
          status: assessment.status,
          knowledgeSourceIds: assessment.knowledgeSourceIds,
          evidenceSourceIds: assessment.evidenceSourceIds,
          evidenceConflicts: conflicts,
        },
      });
    }
  }

  return findings.sort((a, b) =>
    a.code.localeCompare(b.code) ||
    a.id.localeCompare(b.id)
  );
}
