import type {
  DecisionBasisRevision,
  DecisionLedgerEntry,
  DecisionLedgerKind,
  DecisionLedgerSnapshot,
} from "../../../project-model/src/index.js";
import type {
  ValidationRunTrace,
  ValidationTraceReport,
} from "../../../validation/src/index.js";
import { invalidateStaleDecisionLedger } from "./decision-ledger.js";

export type EngineeringReviewInvalidationCategory =
  | "source-changed"
  | "semantic-graph-changed"
  | "semantic-model-changed"
  | "contract-changed"
  | "knowledge-changed"
  | "invariant-registry-changed"
  | "repair-capability-changed"
  | "target-runtime-changed"
  | "probe-bindings-changed"
  | "runtime-evidence-changed"
  | "runtime-experiment-changed"
  | "preservation-changed"
  | "upstream-invalidated"
  | "superseded"
  | "validation-scenario-changed"
  | "validation-artifact-changed"
  | "validation-intent-changed"
  | "validation-runtime-changed"
  | "unknown";

export type EngineeringReviewInvalidationAction =
  | "reinspect-artifact"
  | "rebuild-analysis"
  | "revalidate-contract"
  | "refresh-knowledge"
  | "rerun-diagnosis"
  | "reassess-repair"
  | "rerun-runtime-proof"
  | "rerun-preservation-proof"
  | "rerun-validation"
  | "follow-replacement"
  | "inspect-upstream"
  | "review-reason";

export interface EngineeringReviewInvalidationItem {
  id: string;
  source: "decision-ledger" | "validation";
  category: EngineeringReviewInvalidationCategory;
  summary: string;
  reason: string;
  nextAction: EngineeringReviewInvalidationAction;
  blocking: boolean;
  decisionKind?: DecisionLedgerKind;
  decisionId?: string;
  validationRunId?: string;
}

export interface EngineeringReviewInvalidationProjection {
  items: readonly EngineeringReviewInvalidationItem[];
  invalidatedDecisionCount: number;
  supersededDecisionCount: number;
  staleValidationRunCount: number;
  blockingCount: number;
}

interface ClassifiedReason {
  category: EngineeringReviewInvalidationCategory;
  summary: string;
  nextAction: EngineeringReviewInvalidationAction;
}

function classifyDecisionReason(
  reason: string,
): ClassifiedReason {
  if (/sourceFingerprint changed/.test(reason)) {
    return {
      category: "source-changed",
      summary: "Artifact source changed after this decision.",
      nextAction: "reinspect-artifact",
    };
  }
  if (/graphFingerprint changed/.test(reason)) {
    return {
      category: "semantic-graph-changed",
      summary: "Semantic graph changed after this decision.",
      nextAction: "rebuild-analysis",
    };
  }
  if (/semanticIrRevision changed/.test(reason)) {
    return {
      category: "semantic-model-changed",
      summary: "Semantic execution/state model changed after this decision.",
      nextAction: "rebuild-analysis",
    };
  }
  if (/contractRegistryRevision changed/.test(reason)) {
    return {
      category: "contract-changed",
      summary: "A canonical contract used by this decision changed.",
      nextAction: "revalidate-contract",
    };
  }
  if (/knowledgeRevision changed/.test(reason)) {
    return {
      category: "knowledge-changed",
      summary: "Minecraft knowledge used by this decision changed.",
      nextAction: "refresh-knowledge",
    };
  }
  if (/invariantRegistryRevision changed/.test(reason)) {
    return {
      category: "invariant-registry-changed",
      summary: "The invariant registry changed after this decision.",
      nextAction: "rerun-diagnosis",
    };
  }
  if (
    /repairProviderRegistryRevision changed/.test(reason) ||
    /repairStrategySourceRegistryRevision changed/.test(reason) ||
    /repairRealizerRegistryRevision changed/.test(reason) ||
    /postTransformProofRevision changed/.test(reason)
  ) {
    return {
      category: "repair-capability-changed",
      summary: "Repair strategy or realization evidence changed after this decision.",
      nextAction: "reassess-repair",
    };
  }
  if (/targetProfileFingerprint changed/.test(reason)) {
    return {
      category: "target-runtime-changed",
      summary: "The target Minecraft runtime profile changed.",
      nextAction: "rerun-runtime-proof",
    };
  }
  if (/probeBindingRevision changed/.test(reason)) {
    return {
      category: "probe-bindings-changed",
      summary: "Runtime probe bindings changed after this decision.",
      nextAction: "rerun-runtime-proof",
    };
  }
  if (/runtimeEvidenceRevision changed/.test(reason)) {
    return {
      category: "runtime-evidence-changed",
      summary: "Runtime evidence changed after this decision.",
      nextAction: "rerun-runtime-proof",
    };
  }
  if (/runtimeExperimentContractRevision changed/.test(reason)) {
    return {
      category: "runtime-experiment-changed",
      summary: "The authorizing runtime experiment contract changed.",
      nextAction: "rerun-runtime-proof",
    };
  }
  if (
    /preservationContractRevision changed/.test(reason) ||
    /preservationBaselineRevision changed/.test(reason)
  ) {
    return {
      category: "preservation-changed",
      summary: "Repair preservation expectations changed.",
      nextAction: "rerun-preservation-proof",
    };
  }
  if (/Upstream decision/.test(reason)) {
    return {
      category: "upstream-invalidated",
      summary: "An upstream decision required by this result is no longer active.",
      nextAction: "inspect-upstream",
    };
  }
  return {
    category: "unknown",
    summary: "This decision is no longer current.",
    nextAction: "review-reason",
  };
}

function decisionItem(
  entry: DecisionLedgerEntry,
): EngineeringReviewInvalidationItem | undefined {
  if (entry.status === "active") return undefined;

  if (entry.status === "superseded") {
    return {
      id: "decision:" + entry.id,
      source: "decision-ledger",
      category: "superseded",
      summary: entry.supersededBy
        ? "A newer decision replaced this decision."
        : "This decision was superseded.",
      reason: entry.supersededBy
        ? "Superseded by " + entry.supersededBy + "."
        : "Decision is marked superseded.",
      nextAction: "follow-replacement",
      blocking: false,
      decisionKind: entry.kind,
      decisionId: entry.id,
    };
  }

  const reason = entry.invalidationReason ??
    "Decision is invalidated without a recorded reason.";
  const classified = classifyDecisionReason(reason);
  return {
    id: "decision:" + entry.id,
    source: "decision-ledger",
    ...classified,
    reason,
    nextAction: classified.nextAction,
    blocking: true,
    decisionKind: entry.kind,
    decisionId: entry.id,
  };
}

function classifyValidationReason(
  reason: string,
): ClassifiedReason {
  if (/scenario revision changed|scenario no longer exists/.test(reason)) {
    return {
      category: "validation-scenario-changed",
      summary: "The validation scenario changed after this run.",
      nextAction: "rerun-validation",
    };
  }
  if (/artifact fingerprint changed/.test(reason)) {
    return {
      category: "validation-artifact-changed",
      summary: "The artifact changed after this validation run.",
      nextAction: "rerun-validation",
    };
  }
  if (/gameplay intent model changed/.test(reason)) {
    return {
      category: "validation-intent-changed",
      summary: "Gameplay intent changed after this validation run.",
      nextAction: "rerun-validation",
    };
  }
  if (/target runtime profile changed/.test(reason)) {
    return {
      category: "validation-runtime-changed",
      summary: "The target runtime changed after this validation run.",
      nextAction: "rerun-validation",
    };
  }
  return {
    category: "unknown",
    summary: "This validation run is no longer current.",
    nextAction: "rerun-validation",
  };
}

function validationItems(
  trace: ValidationTraceReport | undefined,
): EngineeringReviewInvalidationItem[] {
  if (!trace) return [];

  return trace.runs.flatMap(
    (run: ValidationRunTrace) =>
      run.current
        ? []
        : run.staleReasons.map((reason, index) => {
            const classified = classifyValidationReason(reason);
            return {
              id: "validation:" + run.runId + ":" + String(index),
              source: "validation" as const,
              ...classified,
              reason,
              nextAction: classified.nextAction,
              blocking: true,
              validationRunId: run.runId,
            };
          }),
  );
}

export function buildEngineeringReviewInvalidationProjection(
  currentBasis: DecisionBasisRevision,
  ledger?: DecisionLedgerSnapshot,
  validationTrace?: ValidationTraceReport,
): EngineeringReviewInvalidationProjection {
  const effectiveLedger = ledger
    ? invalidateStaleDecisionLedger(ledger, currentBasis)
    : undefined;

  const decisionItems = effectiveLedger?.entries
    .map(decisionItem)
    .filter(
      (item): item is EngineeringReviewInvalidationItem =>
        item !== undefined,
    ) ?? [];
  const validation = validationItems(validationTrace);
  const items = [...decisionItems, ...validation];

  return {
    items,
    invalidatedDecisionCount:
      effectiveLedger?.entries.filter(
        (entry) => entry.status === "invalidated",
      ).length ?? 0,
    supersededDecisionCount:
      effectiveLedger?.entries.filter(
        (entry) => entry.status === "superseded",
      ).length ?? 0,
    staleValidationRunCount:
      validationTrace?.runs.filter((run) => !run.current).length ?? 0,
    blockingCount: items.filter((item) => item.blocking).length,
  };
}
