import { createHash } from "node:crypto";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";

export interface EntityKnowledgeDiagnosticInput {
  runtimeIdentifier?: string;
  findings: Array<{
    relationId: string;
    sourceIds: string[];
    subject: string;
    requirement: string;
    message: string;
    stateId: string;
    activeGroups: string[];
    viaEvent?: string;
  }>;
  staticAnalysisLimits: string[];
}

function idFor(source: SourceRef, suffix: string): string {
  return "diag_" + createHash("sha256")
    .update(`${source.artifactId}:${source.relativePath}:${suffix}`)
    .digest("hex")
    .slice(0, 16);
}

export function entityKnowledgeDiagnostics(
  analysis: EntityKnowledgeDiagnosticInput,
  source: SourceRef,
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = analysis.findings.map((finding) => ({
    id: idFor(source, `${finding.relationId}:${finding.stateId}`),
    code: "ENTITY_KNOWLEDGE_PREREQUISITE_GAP",
    severity: "medium",
    message: finding.message,
    source,
    data: {
      relationId: finding.relationId,
      sourceIds: finding.sourceIds,
      subject: finding.subject,
      requirement: finding.requirement,
      stateId: finding.stateId,
      activeGroups: finding.activeGroups,
      ...(finding.viaEvent ? { viaEvent: finding.viaEvent } : {}),
    },
  }));

  for (const [index, message] of analysis.staticAnalysisLimits.entries()) {
    findings.push({
      id: idFor(source, `runtime-limit:${index}`),
      code: "ENTITY_RUNTIME_BEHAVIOR_LIMIT",
      severity: "info",
      message,
      source,
      data: {
        runtimeIdentifier: analysis.runtimeIdentifier ?? null,
      },
    });
  }

  return findings;
}
