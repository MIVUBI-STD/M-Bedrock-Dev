import type { KnowledgeRelationAssessment } from "./evaluate.js";

export type ValidationStrategy =
  | "static-proof"
  | "runtime-invariant"
  | "repeatability"
  | "concurrency"
  | "recovery"
  | "manual-or-gametest";

export interface ValidationCase {
  id: string;
  relationId: string;
  priority: "high" | "medium" | "low";
  strategy: ValidationStrategy;
  objective: string;
  expected: string;
  knowledgeSourceIds: readonly string[];
  evidenceSourceIds: readonly string[];
}

function strategyFor(item: KnowledgeRelationAssessment): ValidationStrategy {
  const haystack = `${item.subject} ${item.object} ${item.message}`.toLowerCase();
  if (/reset|restore|cleanup|baseline/.test(haystack)) return "repeatability";
  if (/generation|stale|owner|queue|concurrent|arena/.test(haystack)) return "concurrency";
  if (/recover|restart|worldload|journal|orphan/.test(haystack)) return "recovery";
  if (/runtime|tick|loaded|velocity|camera|input|entity|player/.test(haystack)) {
    return "runtime-invariant";
  }
  return "static-proof";
}

export function validationPlanFromAssessments(
  assessments: readonly KnowledgeRelationAssessment[],
): ValidationCase[] {
  return assessments
    .filter((item) => item.status !== "satisfied")
    .map((item) => ({
      id: `validate::${item.relationId}`,
      relationId: item.relationId,
      priority: item.status === "violation" ? "high" : "medium",
      strategy: strategyFor(item),
      objective: item.message,
      expected: item.status === "violation"
        ? "The violating evidence is removed or the required relationship is explicitly satisfied."
        : "Additional evidence resolves the relationship to satisfied or proves the feature is not applicable.",
      knowledgeSourceIds: item.knowledgeSourceIds,
      evidenceSourceIds: item.evidenceSourceIds,
    }));
}
