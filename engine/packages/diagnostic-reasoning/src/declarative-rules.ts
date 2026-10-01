import type { DiagnosticCode, DiagnosticSeverity } from "../../diagnostics/src/index.js";
import type { DiagnosticEvidenceObservation, DiagnosticEvidenceState } from "./types.js";

export interface DeclarativeDiagnosticRule {
  id: string;
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  allOf: readonly string[];
  anyOf?: readonly string[];
  noneOf?: readonly string[];
  falsePositiveGuards?: readonly string[];
  requiredProofTier?: "STATIC" | "PACKAGE" | "LOCAL_GAME" | "LIVE_GAME";
}

export interface DeclarativeDiagnosticRuleEvaluation {
  ruleId: string;
  disposition: "matched" | "not-matched" | "suppressed" | "insufficient-evidence";
  supportingEvidenceIds: readonly string[];
  missingPredicates: readonly string[];
  guardPredicates: readonly string[];
  reason: string;
}

function latestEvidence(items: readonly DiagnosticEvidenceObservation[]) {
  const map = new Map<string, DiagnosticEvidenceObservation>();
  for (const item of items) map.set(item.predicate, item);
  return map;
}

function stateOf(map: ReadonlyMap<string, DiagnosticEvidenceObservation>, predicate: string): DiagnosticEvidenceState {
  return map.get(predicate)?.state ?? "unknown";
}

export function evaluateDeclarativeDiagnosticRule(
  rule: DeclarativeDiagnosticRule,
  evidence: readonly DiagnosticEvidenceObservation[],
): DeclarativeDiagnosticRuleEvaluation {
  const byPredicate = latestEvidence(evidence);
  const missingPredicates = rule.allOf.filter((p) => stateOf(byPredicate, p) === "unknown");
  const support = new Set<string>();
  for (const predicate of [...rule.allOf, ...(rule.anyOf ?? [])]) {
    const item = byPredicate.get(predicate);
    if (item?.state === "present") support.add(item.evidenceId ?? "predicate:" + predicate);
  }
  const guardPredicates = [
    ...(rule.noneOf ?? []).filter((p) => stateOf(byPredicate, p) === "present"),
    ...(rule.falsePositiveGuards ?? []).filter((p) => stateOf(byPredicate, p) === "present"),
  ];
  if (guardPredicates.length > 0) {
    return { ruleId: rule.id, disposition: "suppressed", supportingEvidenceIds: [...support].sort(), missingPredicates, guardPredicates: [...new Set(guardPredicates)].sort(), reason: "A declared false-positive/negative guard is present." };
  }
  if (missingPredicates.length > 0) {
    return { ruleId: rule.id, disposition: "insufficient-evidence", supportingEvidenceIds: [...support].sort(), missingPredicates: [...missingPredicates].sort(), guardPredicates: [], reason: "One or more required predicates are unknown." };
  }
  if (rule.allOf.some((p) => stateOf(byPredicate, p) !== "present")) {
    return { ruleId: rule.id, disposition: "not-matched", supportingEvidenceIds: [...support].sort(), missingPredicates: [], guardPredicates: [], reason: "At least one required predicate is absent." };
  }
  if ((rule.anyOf?.length ?? 0) > 0 && !rule.anyOf!.some((p) => stateOf(byPredicate, p) === "present")) {
    const unknown = rule.anyOf!.filter((p) => stateOf(byPredicate, p) === "unknown");
    return { ruleId: rule.id, disposition: unknown.length > 0 ? "insufficient-evidence" : "not-matched", supportingEvidenceIds: [...support].sort(), missingPredicates: unknown.sort(), guardPredicates: [], reason: unknown.length > 0 ? "No anyOf predicate is proven and at least one remains unknown." : "No anyOf predicate is present." };
  }
  return { ruleId: rule.id, disposition: "matched", supportingEvidenceIds: [...support].sort(), missingPredicates: [], guardPredicates: [], reason: "All declarative evidence conditions are satisfied." };
}
