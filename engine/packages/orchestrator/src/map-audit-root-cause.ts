import { createHash } from "node:crypto";
import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  ReadyAuditDefectProjection,
} from "./map-audit-defect-projection.js";

export interface ReadyAuditRootCauseGroup {
  readonly rootCauseKey: string;
  readonly knowledgeDomain?: string;
  readonly technicalOwnerId: string;
  readonly causalLinkIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly sharedSubjectIds: readonly string[];
  readonly sharedComponentIds: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hash(values: readonly string[]): string {
  return createHash("sha256")
    .update(JSON.stringify(unique(values)))
    .digest("hex")
    .slice(0, 16);
}

function intersection(
  values: readonly (readonly string[])[],
): string[] {
  if (values.length === 0) return [];
  const [first, ...rest] = values;
  return unique(first).filter((value) =>
    rest.every((items) => items.includes(value))
  );
}

export function groupReadyAuditDefectsByRootCause(
  graph: GameplayScenarioGraph,
  defects: readonly ReadyAuditDefectProjection[],
): readonly ReadyAuditRootCauseGroup[] {
  const buckets = new Map<string, ReadyAuditDefectProjection[]>();

  for (const defect of defects) {
    const link = graph.causalLinks.find(
      (item) => item.id === defect.causalLinkId,
    );
    if (link === undefined) {
      throw new Error(
        "Ready defect lost its causal-link owner: " +
          defect.causalLinkId +
          ".",
      );
    }
    const requirement =
      link.knowledgeRequirementId === undefined
        ? undefined
        : graph.knowledgeRequirements.find(
            (item) => item.id === link.knowledgeRequirementId,
          );
    const technicalOwnerId = link.fromComponentId;
    const evidenceSignature = hash(defect.evidenceIds);
    const key = [
      requirement?.domain ?? "intent",
      technicalOwnerId,
      evidenceSignature,
    ].join("|");
    const list = buckets.get(key) ?? [];
    list.push(defect);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .map(([key, items]) => {
      const firstLink = graph.causalLinks.find(
        (link) => link.id === items[0]!.causalLinkId,
      )!;
      const requirement =
        firstLink.knowledgeRequirementId === undefined
          ? undefined
          : graph.knowledgeRequirements.find(
              (item) =>
                item.id === firstLink.knowledgeRequirementId,
            );
      return {
        rootCauseKey: "root:" + key,
        ...(requirement === undefined
          ? {}
          : { knowledgeDomain: requirement.domain }),
        technicalOwnerId: firstLink.fromComponentId,
        causalLinkIds: unique(
          items.map((item) => item.causalLinkId),
        ),
        scenarioIds: unique(
          items.map((item) => item.scenarioId),
        ),
        evidenceIds: unique(
          items.flatMap((item) => item.evidenceIds),
        ),
        sharedSubjectIds: intersection(
          items.map((item) => item.subjectIds),
        ),
        sharedComponentIds: intersection(
          items.map((item) => item.componentIds),
        ),
      };
    })
    .sort((a, b) =>
      a.rootCauseKey.localeCompare(b.rootCauseKey)
    );
}
