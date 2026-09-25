import { createHash } from "node:crypto";
import type { DiagnosticSeverity } from "../../diagnostics/src/index.js";
import type {
  CausalChain,
  CausalIncident,
  RootCauseCandidate,
  RootCauseEvidenceLevel,
} from "../../project-model/src/index.js";

const severityRank: Readonly<Record<DiagnosticSeverity, number>> = {
  info: 0,
  minor: 1,
  medium: 2,
  critical: 3,
};

const confidenceRank = {
  low: 0,
  medium: 1,
  high: 2,
} as const;

const evidenceRank: Readonly<Record<RootCauseEvidenceLevel, number>> = {
  "unproven-candidate": 0,
  "corroborated-candidate": 1,
  "proven-dependency-violation": 2,
  "proven-with-observed-outcome": 3,
};

function idFor(parts: readonly string[]): string {
  return "incident_" + createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

function observedOutcomeCount(chain: CausalChain): number {
  const nodes = new Map(chain.nodes.map((node) => [node.id, node]));
  return new Set(
    chain.links
      .filter((link) =>
        link.strength === "direct-evidence" &&
        link.temporalStatus !== "before-subject" &&
        nodes.get(link.from)?.kind === "downstream-risk" &&
        nodes.get(link.to)?.kind === "observed-state"
      )
      .map((link) => link.to),
  ).size;
}

function candidateForChain(chain: CausalChain): RootCauseCandidate | undefined {
  const root = chain.nodes.find((node) => node.kind === "observed-state");
  if (!root) return undefined;

  const violations = chain.nodes.filter((node) => node.kind === "violation").length;
  const gaps = chain.nodes.filter((node) => node.kind === "evidence-gap").length;
  const corroboratedRisks = chain.links.filter(
    (link) => link.strength === "corroborated-risk",
  ).length;
  const observedOutcomes = observedOutcomeCount(chain);

  const evidenceLevel: RootCauseEvidenceLevel =
    violations > 0 && observedOutcomes > 0
      ? "proven-with-observed-outcome"
      : violations > 0
        ? "proven-dependency-violation"
        : observedOutcomes > 0 || corroboratedRisks > 0
          ? "corroborated-candidate"
          : "unproven-candidate";

  return {
    id: idFor([chain.scopeKey ?? chain.id, root.label]),
    label: root.label,
    evidenceLevel,
    severity: chain.severity,
    confidence: chain.confidence,
    chainIds: [chain.id],
    relatedDiagnosticIds: chain.relatedDiagnosticIds,
    support: {
      dependencyViolations: violations,
      evidenceGaps: gaps,
      corroboratedRisks,
      observedOutcomes,
    },
  };
}

function mergeCandidates(
  candidates: readonly RootCauseCandidate[],
): RootCauseCandidate[] {
  const grouped = new Map<string, RootCauseCandidate>();

  for (const item of candidates) {
    const current = grouped.get(item.label);
    if (!current) {
      grouped.set(item.label, item);
      continue;
    }

    const evidenceLevel =
      evidenceRank[item.evidenceLevel] > evidenceRank[current.evidenceLevel]
        ? item.evidenceLevel
        : current.evidenceLevel;
    const severity =
      severityRank[item.severity] > severityRank[current.severity]
        ? item.severity
        : current.severity;
    const confidence =
      confidenceRank[item.confidence] > confidenceRank[current.confidence]
        ? item.confidence
        : current.confidence;

    grouped.set(item.label, {
      ...current,
      evidenceLevel,
      severity,
      confidence,
      chainIds: [...new Set([...current.chainIds, ...item.chainIds])].sort(),
      relatedDiagnosticIds: [
        ...new Set([
          ...current.relatedDiagnosticIds,
          ...item.relatedDiagnosticIds,
        ]),
      ].sort(),
      support: {
        dependencyViolations:
          current.support.dependencyViolations +
          item.support.dependencyViolations,
        evidenceGaps:
          current.support.evidenceGaps +
          item.support.evidenceGaps,
        corroboratedRisks:
          current.support.corroboratedRisks +
          item.support.corroboratedRisks,
        observedOutcomes:
          current.support.observedOutcomes +
          item.support.observedOutcomes,
      },
    });
  }

  return [...grouped.values()].sort((a, b) =>
    evidenceRank[b.evidenceLevel] - evidenceRank[a.evidenceLevel] ||
    severityRank[b.severity] - severityRank[a.severity] ||
    confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
    a.label.localeCompare(b.label)
  );
}

export function synthesizeCausalIncidents(
  chains: readonly CausalChain[],
): CausalIncident[] {
  const groups = new Map<string, CausalChain[]>();

  for (const chain of chains) {
    const scopeKey = chain.scopeKey ?? "chain:" + chain.id;
    const list = groups.get(scopeKey) ?? [];
    list.push(chain);
    groups.set(scopeKey, list);
  }

  const incidents: CausalIncident[] = [];

  for (const [scopeKey, scopedChains] of groups) {
    const severity = scopedChains
      .map((chain) => chain.severity)
      .sort((a, b) => severityRank[b] - severityRank[a])[0] ?? "info";
    const confidence = scopedChains
      .map((chain) => chain.confidence)
      .sort((a, b) => confidenceRank[b] - confidenceRank[a])[0] ?? "low";

    const nodes = new Map(
      scopedChains.flatMap((chain) => chain.nodes).map((node) => [node.id, node]),
    );
    const links = new Map(
      scopedChains.flatMap((chain) => chain.links).map((link) => [
        [link.from, link.to, link.relationId ?? "", link.strength].join("|"),
        link,
      ]),
    );

    const candidates = mergeCandidates(
      scopedChains
        .map(candidateForChain)
        .filter((item): item is RootCauseCandidate => item !== undefined),
    );
    const structuredScope = scopedChains.find(
      (chain) => chain.scope !== undefined,
    )?.scope;

    incidents.push({
      id: idFor([scopeKey, ...scopedChains.map((chain) => chain.id).sort()]),
      scopeKey,
      ...(structuredScope === undefined
        ? {}
        : { scope: structuredScope }),
      severity,
      confidence,
      chainIds: scopedChains.map((chain) => chain.id).sort(),
      relatedDiagnosticIds: [
        ...new Set(scopedChains.flatMap((chain) => chain.relatedDiagnosticIds)),
      ].sort(),
      nodes: [...nodes.values()],
      links: [...links.values()],
      rootCauseCandidates: candidates,
    });
  }

  return incidents.sort((a, b) =>
    severityRank[b.severity] - severityRank[a.severity] ||
    confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
    a.id.localeCompare(b.id)
  );
}
