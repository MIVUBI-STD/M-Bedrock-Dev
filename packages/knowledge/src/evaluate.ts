import { buildKnowledgeGraph } from "./graph.js";
import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
  KnowledgeRelationKind,
} from "./types.js";

export type EvidenceState = "present" | "absent" | "unknown";

export interface KnowledgeEvidence {
  state: EvidenceState;
  sourceIds?: readonly string[];
  note?: string;
}

export type KnowledgeEvidenceMap = Readonly<Record<string, KnowledgeEvidence>>;

export interface KnowledgeRelationAssessment {
  relationId: string;
  kind: KnowledgeRelationKind;
  subject: string;
  object: string;
  status: "satisfied" | "violation" | "unknown";
  message: string;
  knowledgeSourceIds: readonly string[];
  evidenceSourceIds: readonly string[];
  diagnosticSeverity?: "info" | "minor" | "medium" | "critical";
  causalConsequences?: readonly string[];
  causalCorroborators?: Readonly<Record<string, readonly string[]>>;
}

function evidenceFor(
  evidence: KnowledgeEvidenceMap,
  key: string,
): KnowledgeEvidence {
  return evidence[key] ?? { state: "unknown" };
}

function alternatives(value: string): string[] {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

export function assessKnowledgeRelations(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
  evidence: KnowledgeEvidenceMap,
): KnowledgeRelationAssessment[] {
  const graph = buildKnowledgeGraph(catalog, profile);
  const results: KnowledgeRelationAssessment[] = [];

  for (const relation of graph.edges) {
    const subject = evidenceFor(evidence, relation.from);
    const object = evidenceFor(evidence, relation.to);
    const evidenceIds = new Set<string>([
      ...(subject.sourceIds ?? []),
      ...(object.sourceIds ?? []),
    ]);

    if (relation.kind === "requires") {
      if (subject.state !== "present") continue;
      const status = object.state === "present"
        ? "satisfied"
        : object.state === "absent" ? "violation" : "unknown";
      results.push({
        relationId: relation.id,
        kind: relation.kind,
        subject: relation.from,
        object: relation.to,
        status,
        message: status === "violation"
          ? `${relation.from} requires ${relation.to}, but evidence marks it absent.`
          : status === "unknown"
          ? `${relation.from} requires ${relation.to}, but current evidence cannot prove it.`
          : `${relation.from} requirement ${relation.to} is satisfied.`,
        knowledgeSourceIds: relation.sourceIds,
        evidenceSourceIds: [...evidenceIds],
        ...(relation.diagnosticSeverity === undefined
          ? {}
          : { diagnosticSeverity: relation.diagnosticSeverity }),
        ...(relation.causalConsequences === undefined
          ? {}
          : { causalConsequences: relation.causalConsequences }),
        ...(relation.causalCorroborators === undefined
          ? {}
          : { causalCorroborators: relation.causalCorroborators }),
      });
      continue;
    }

    if (relation.kind === "requires-any") {
      if (subject.state !== "present") continue;
      const choices = alternatives(relation.to);
      const states = choices.map((choice) => evidenceFor(evidence, choice).state);
      const status = states.includes("present")
        ? "satisfied"
        : states.every((state) => state === "absent") ? "violation" : "unknown";
      results.push({
        relationId: relation.id,
        kind: relation.kind,
        subject: relation.from,
        object: relation.to,
        status,
        message: status === "violation"
          ? `${relation.from} requires one of ${choices.join(", ")}, but all are explicitly absent.`
          : status === "unknown"
          ? `${relation.from} requires one of ${choices.join(", ")}, but evidence is incomplete.`
          : `${relation.from} has a satisfied alternative requirement.`,
        knowledgeSourceIds: relation.sourceIds,
        evidenceSourceIds: [...evidenceIds],
        ...(relation.diagnosticSeverity === undefined
          ? {}
          : { diagnosticSeverity: relation.diagnosticSeverity }),
        ...(relation.causalConsequences === undefined
          ? {}
          : { causalConsequences: relation.causalConsequences }),
        ...(relation.causalCorroborators === undefined
          ? {}
          : { causalCorroborators: relation.causalCorroborators }),
      });
      continue;
    }

    if (relation.kind === "gates") {
      if (object.state !== "present") continue;
      const status = subject.state === "present"
        ? "satisfied"
        : subject.state === "absent" ? "violation" : "unknown";
      results.push({
        relationId: relation.id,
        kind: relation.kind,
        subject: relation.from,
        object: relation.to,
        status,
        message: status === "violation"
          ? `${relation.to} is present while required gate ${relation.from} is absent.`
          : status === "unknown"
          ? `${relation.to} is present but gate ${relation.from} is unproven.`
          : `${relation.to} is backed by gate ${relation.from}.`,
        knowledgeSourceIds: relation.sourceIds,
        evidenceSourceIds: [...evidenceIds],
        ...(relation.diagnosticSeverity === undefined
          ? {}
          : { diagnosticSeverity: relation.diagnosticSeverity }),
        ...(relation.causalConsequences === undefined
          ? {}
          : { causalConsequences: relation.causalConsequences }),
        ...(relation.causalCorroborators === undefined
          ? {}
          : { causalCorroborators: relation.causalCorroborators }),
      });
      continue;
    }

    if (relation.kind === "deactivates") {
      if (subject.state !== "present" || object.state === "unknown") continue;
      const status = object.state === "absent" ? "satisfied" : "violation";
      results.push({
        relationId: relation.id,
        kind: relation.kind,
        subject: relation.from,
        object: relation.to,
        status,
        message: status === "violation"
          ? `${relation.from} should deactivate ${relation.to}, but both are explicitly present.`
          : `${relation.from} deactivation of ${relation.to} is reflected in evidence.`,
        knowledgeSourceIds: relation.sourceIds,
        evidenceSourceIds: [...evidenceIds],
        ...(relation.diagnosticSeverity === undefined
          ? {}
          : { diagnosticSeverity: relation.diagnosticSeverity }),
        ...(relation.causalConsequences === undefined
          ? {}
          : { causalConsequences: relation.causalConsequences }),
        ...(relation.causalCorroborators === undefined
          ? {}
          : { causalCorroborators: relation.causalCorroborators }),
      });
      continue;
    }

    if (relation.kind === "restores") {
      if (subject.state !== "present") continue;
      const status = object.state === "present"
        ? "satisfied"
        : object.state === "absent" ? "violation" : "unknown";
      results.push({
        relationId: relation.id,
        kind: relation.kind,
        subject: relation.from,
        object: relation.to,
        status,
        message: status === "violation"
          ? `${relation.from} should restore ${relation.to}, but evidence marks it absent.`
          : status === "unknown"
          ? `${relation.from} should restore ${relation.to}, but restoration is unverified.`
          : `${relation.from} restoration of ${relation.to} is satisfied.`,
        knowledgeSourceIds: relation.sourceIds,
        evidenceSourceIds: [...evidenceIds],
        ...(relation.diagnosticSeverity === undefined
          ? {}
          : { diagnosticSeverity: relation.diagnosticSeverity }),
        ...(relation.causalConsequences === undefined
          ? {}
          : { causalConsequences: relation.causalConsequences }),
        ...(relation.causalCorroborators === undefined
          ? {}
          : { causalCorroborators: relation.causalCorroborators }),
      });
    }
  }

  return results.sort((a, b) =>
    a.status.localeCompare(b.status) ||
    a.relationId.localeCompare(b.relationId)
  );
}
