import { createHash } from "node:crypto";
import {
  assessKnowledgeRelations,
  type EffectiveKnowledgeProfile,
  type KnowledgeCatalog,
} from "../../../packages/knowledge/src/index.js";
import {
  groupRuntimeEvidenceByScope,
  type RuntimeEvidenceSnapshot,
} from "../../../packages/project-model/src/runtime-evidence.js";
import { mergeRuntimeEvidenceRecords } from "./runtime-evidence-merge.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

function sourceKey(source: {
  artifactId: string;
  relativePath: string;
  range?: {
    lineStart?: number;
    columnStart?: number;
  };
}): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

function idFor(scopeKey: string, relationId: string, status: string): string {
  return "diag_" + createHash("sha256")
    .update(`knowledge:${scopeKey}:${relationId}:${status}`)
    .digest("hex")
    .slice(0, 16);
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
    const {
      map,
      conflicts,
      sourceRefs,
      relatedNodeIds,
    } = mergeRuntimeEvidenceRecords(records);
    const presentPredicates = [...new Set(
      records
        .filter((record) => record.state === "present")
        .map((record) => record.predicate),
    )].sort();
    const runtimeScope = records.find(
      (record) => record.scope !== undefined,
    )?.scope;

    const predicateSourceKeys: Record<string, string[]> = {};
    const predicateObservations: Record<
      string,
      Array<{
        tick?: number;
        streamId?: string;
        sequence?: number;
        timestamp?: string;
      }>
    > = {};
    for (const record of records) {
      if (record.state !== "present") continue;
      if (record.observedAt) {
        predicateObservations[record.predicate] = [
          ...(predicateObservations[record.predicate] ?? []),
          record.observedAt,
        ];
      }
      const keys = record.sourceRefs?.map(sourceKey) ?? [];
      if (keys.length === 0) continue;
      predicateSourceKeys[record.predicate] = [
        ...new Set([
          ...(predicateSourceKeys[record.predicate] ?? []),
          ...keys,
        ]),
      ].sort();
    }

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
          ...(runtimeScope === undefined
            ? {}
            : { runtimeScope }),
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
        severity: assessment.status === "violation"
          ? (assessment.diagnosticSeverity ?? "medium")
          : "info",
        message: assessment.message,
        ...(sourceRefs[0] === undefined ? {} : { source: sourceRefs[0] }),
        ...(relatedNodeIds.length === 0 ? {} : { relatedNodeIds }),
        data: {
          scopeKey,
          ...(runtimeScope === undefined
            ? {}
            : { runtimeScope }),
          relationId: assessment.relationId,
          relationKind: assessment.kind,
          subject: assessment.subject,
          object: assessment.object,
          status: assessment.status,
          knowledgeSourceIds: assessment.knowledgeSourceIds,
          evidenceSourceIds: assessment.evidenceSourceIds,
          evidenceConflicts: conflicts,
          presentPredicates,
          ...(assessment.causalConsequences === undefined
            ? {}
            : { causalConsequences: assessment.causalConsequences }),
          ...(assessment.causalCorroborators === undefined
            ? {}
            : { causalCorroborators: assessment.causalCorroborators }),
          predicateSourceKeys,
          predicateObservations,
          ...(assessment.causalOutcomePredicates === undefined
            ? {}
            : { causalOutcomePredicates: assessment.causalOutcomePredicates }),
          ...(assessment.causalCorroborationMinSources === undefined
            ? {}
            : {
                causalCorroborationMinSources:
                  assessment.causalCorroborationMinSources,
              }),
        },
      });
    }
  }

  return findings.sort((a, b) =>
    a.code.localeCompare(b.code) ||
    a.id.localeCompare(b.id)
  );
}
