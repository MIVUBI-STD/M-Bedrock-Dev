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


export interface RootCauseCandidateLike {
  readonly route: "runtime" | "static" | "tester";
  readonly scenarioCausalLinkId?: string;
  readonly scenarioCausalLinkIds?: readonly string[];
}

function candidateLinkIds(
  candidate: RootCauseCandidateLike,
): readonly string[] {
  return unique([
    ...(candidate.scenarioCausalLinkIds ?? []),
    ...(candidate.scenarioCausalLinkId === undefined
      ? []
      : [candidate.scenarioCausalLinkId]),
  ]);
}

function sameLinkSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = unique(left);
  const b = unique(right);
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

export function auditRootCauseCandidateCoverageIssues(
  groups: readonly ReadyAuditRootCauseGroup[],
  candidates: readonly RootCauseCandidateLike[],
): readonly string[] {
  const issues: string[] = [];
  const matched = new Map<string, number>();

  for (const candidate of candidates) {
    if (candidate.route === "tester") continue;
    const links = candidateLinkIds(candidate);
    if (links.length === 0) continue;

    const matches = groups.filter((group) =>
      sameLinkSet(group.causalLinkIds, links)
    );
    if (matches.length !== 1) {
      issues.push(
        "AI candidate causal links must match exactly one deterministic root-cause group: " +
          links.join(", ") +
          ".",
      );
      continue;
    }

    const key = matches[0]!.rootCauseKey;
    matched.set(key, (matched.get(key) ?? 0) + 1);
  }

  for (const group of groups) {
    const count = matched.get(group.rootCauseKey) ?? 0;
    if (count === 0) {
      issues.push(
        "Deterministic root-cause group has no AI report candidate: " +
          group.rootCauseKey +
          ".",
      );
    } else if (count > 1) {
      issues.push(
        "Deterministic root-cause group maps to multiple AI report candidates: " +
          group.rootCauseKey +
          ".",
      );
    }
  }

  return issues;
}
