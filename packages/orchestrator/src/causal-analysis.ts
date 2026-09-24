import { createHash } from "node:crypto";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type {
  CausalChain,
  CausalLink,
  CausalNode,
} from "../../project-model/src/causal-chain.js";

function idFor(parts: readonly string[]): string {
  return "cause_" + createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asCorroboratorMap(
  value: unknown,
): Readonly<Record<string, readonly string[]>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) return {};

  const output: Record<string, string[]> = {};
  for (const [risk, predicates] of Object.entries(value)) {
    const normalized = asStringArray(predicates);
    if (normalized.length > 0) output[risk] = normalized;
  }
  return output;
}

function knowledgeFindingChain(finding: DiagnosticFinding): CausalChain | undefined {
  if (
    finding.code !== "KNOWLEDGE_RELATION_VIOLATION" &&
    finding.code !== "KNOWLEDGE_EVIDENCE_GAP"
  ) return undefined;

  const data = finding.data ?? {};
  const relationId = typeof data.relationId === "string"
    ? data.relationId
    : undefined;
  const subject = typeof data.subject === "string" ? data.subject : undefined;
  const object = typeof data.object === "string" ? data.object : undefined;
  const scopeKey = typeof data.scopeKey === "string" ? data.scopeKey : undefined;
  if (!relationId || !subject || !object) return undefined;

  const consequences = asStringArray(data.causalConsequences);
  if (consequences.length === 0) return undefined;
  const presentPredicates = new Set(asStringArray(data.presentPredicates));
  const corroborators = asCorroboratorMap(data.causalCorroborators);
  const outcomePredicates = asCorroboratorMap(data.causalOutcomePredicates);

  const violation = finding.code === "KNOWLEDGE_RELATION_VIOLATION";
  const subjectNodeId = idFor([finding.id, "subject"]);
  const requirementNodeId = idFor([finding.id, "requirement"]);
  const statusNodeId = idFor([finding.id, "status"]);

  const nodes: CausalNode[] = [{
    id: subjectNodeId,
    kind: "observed-state",
    label: subject,
    ...(finding.source ? { sourceRefs: [finding.source] } : {}),
    diagnosticIds: [finding.id],
  }, {
    id: requirementNodeId,
    kind: "missing-requirement",
    label: object,
    ...(finding.source ? { sourceRefs: [finding.source] } : {}),
    diagnosticIds: [finding.id],
  }, {
    id: statusNodeId,
    kind: violation ? "violation" : "evidence-gap",
    label: violation
      ? "Dependency violation proven"
      : "Dependency remains unproven",
    ...(finding.source ? { sourceRefs: [finding.source] } : {}),
    diagnosticIds: [finding.id],
  }];

  const links: CausalLink[] = [{
    from: subjectNodeId,
    to: requirementNodeId,
    strength: violation ? "direct-evidence" : "dependency-supported",
    relationId,
    rationale: finding.message,
  }, {
    from: requirementNodeId,
    to: statusNodeId,
    strength: violation ? "direct-evidence" : "dependency-supported",
    relationId,
    rationale: violation
      ? "The required state is explicitly absent."
      : "The required state is not yet proven by available evidence.",
  }];

  let hasCorroboratedRisk = false;
  let hasObservedOutcome = false;

  for (const consequence of consequences) {
    const riskNodeId = idFor([finding.id, "risk", consequence]);
    const requiredPredicates = corroborators[consequence] ?? [];
    const corroborated =
      requiredPredicates.length > 0 &&
      requiredPredicates.every((predicate) => presentPredicates.has(predicate));
    if (corroborated) hasCorroboratedRisk = true;

    nodes.push({
      id: riskNodeId,
      kind: "downstream-risk",
      label: consequence,
      diagnosticIds: [finding.id],
      ...(corroborated
        ? { corroboratingPredicates: requiredPredicates }
        : {}),
    });
    links.push({
      from: statusNodeId,
      to: riskNodeId,
      strength: corroborated ? "corroborated-risk" : "risk-only",
      relationId,
      rationale: corroborated
        ? "Independent evidence in the same runtime scope corroborates this downstream risk, but the outcome itself is still not observed."
        : "Project knowledge marks this as a downstream risk, not as an observed outcome.",
    });

    const observedPredicates = outcomePredicates[consequence] ?? [];
    const observed = observedPredicates.filter((predicate) =>
      presentPredicates.has(predicate)
    );

    for (const predicate of observed) {
      hasObservedOutcome = true;
      const observedNodeId = idFor([
        finding.id,
        "observed-outcome",
        consequence,
        predicate,
      ]);
      nodes.push({
        id: observedNodeId,
        kind: "observed-state",
        label: predicate,
        diagnosticIds: [finding.id],
        corroboratingPredicates: [predicate],
      });
      links.push({
        from: riskNodeId,
        to: observedNodeId,
        strength: "direct-evidence",
        relationId,
        rationale:
          "Runtime evidence in the same scope reports the downstream outcome directly; causal attribution remains bounded by the dependency evidence.",
      });
    }
  }

  return {
    id: idFor([scopeKey ?? "global", relationId, finding.id]),
    ...(scopeKey === undefined ? {} : { scopeKey }),
    severity: finding.severity,
    confidence: violation
      ? "high"
      : hasObservedOutcome || hasCorroboratedRisk
        ? "medium"
        : "low",
    title: violation
      ? subject + " → missing " + object
      : subject + " → unproven " + object,
    summary: violation
      ? hasObservedOutcome
        ? "A required dependency is explicitly violated and at least one downstream outcome is independently observed in the same scope."
        : "A required dependency is explicitly violated; downstream items remain risk projections unless separately observed."
      : hasObservedOutcome
        ? "The required dependency remains unproven, while at least one downstream outcome is independently observed in the same scope; attribution remains a corroborated candidate rather than a proven sole cause."
        : hasCorroboratedRisk
          ? "The required dependency is still unproven, but independent evidence in the same scope corroborates at least one downstream risk."
          : "Available evidence establishes the initiating state but cannot prove the required dependency; downstream items are risk-only.",
    nodes,
    links,
    relatedDiagnosticIds: [finding.id],
  };
}

function chainKey(chain: CausalChain): string {
  return [
    chain.scopeKey ?? "global",
    chain.nodes[0]?.label ?? "",
    chain.nodes[1]?.label ?? "",
  ].join("|");
}

export function synthesizeCausalChains(
  diagnostics: readonly DiagnosticFinding[],
): CausalChain[] {
  const chains = diagnostics
    .map(knowledgeFindingChain)
    .filter((item): item is CausalChain => item !== undefined);

  const deduped = new Map<string, CausalChain>();
  for (const chain of chains) {
    const key = chainKey(chain);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, chain);
      continue;
    }

    const severityRank = { info: 0, minor: 1, medium: 2, critical: 3 } as const;
    if (severityRank[chain.severity] > severityRank[existing.severity]) {
      deduped.set(key, chain);
    }
  }

  const severityRank = { info: 0, minor: 1, medium: 2, critical: 3 } as const;
  return [...deduped.values()].sort((a, b) =>
    severityRank[b.severity] - severityRank[a.severity] ||
    a.id.localeCompare(b.id)
  );
}
