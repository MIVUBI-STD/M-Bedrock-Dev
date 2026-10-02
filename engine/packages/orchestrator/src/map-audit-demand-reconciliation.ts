import type {
  AnalysisKnowledgeDomain,
} from "../../analysis-planner/src/index.js";
import type {
  InspectArtifactResult,
} from "./inspection/inspect-artifact.js";

export interface AuditDemandReconciliation {
  readonly policy: "monotonic-rig-demand-reconciliation";
  readonly analyzedDomains: readonly AnalysisKnowledgeDomain[];
  readonly requiredDomains: readonly AnalysisKnowledgeDomain[];
  readonly missingDomains: readonly AnalysisKnowledgeDomain[];
  readonly stable: boolean;
}

export function reconcileSelectedMapAuditDemand(
  inspection: InspectArtifactResult,
): AuditDemandReconciliation {
  const analyzed = new Set(
    inspection.gameplayWorld.analysisDemand ?? [],
  );
  const required = new Set<AnalysisKnowledgeDomain>(
    inspection.hiddenGameplayDefects
      .scenarioAudit.graph.knowledgeRequirements
      .map((item) => item.domain),
  );
  const missing = [...required]
    .filter((domain) => !analyzed.has(domain))
    .sort();

  return {
    policy: "monotonic-rig-demand-reconciliation",
    analyzedDomains: [...analyzed].sort(),
    requiredDomains: [...required].sort(),
    missingDomains: missing,
    stable: missing.length === 0,
  };
}
