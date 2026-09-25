import { createHash } from "node:crypto";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type {
  CausalChain,
  CausalLink,
  CausalNode,
} from "../../project-model/src/index.js";
import type { RuntimeScope } from "../../project-model/src/index.js";

function idFor(parts: readonly string[]): string {
  return "cause_" + createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 16);
}

function asRuntimeScope(
  value: unknown,
): RuntimeScope | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) return undefined;

  const input = value as Record<string, unknown>;
  const output: RuntimeScope = {};

  for (const key of [
    "arenaId",
    "playerKey",
    "entityKey",
    "operationId",
  ] as const) {
    const item = input[key];
    if (item === undefined) continue;
    if (typeof item !== "string" || !item.trim()) return undefined;
    output[key] = item;
  }

  for (const key of [
    "arenaGeneration",
    "connectionGeneration",
    "lifeGeneration",
    "entityGeneration",
    "subsystemGeneration",
  ] as const) {
    const item = input[key];
    if (item === undefined) continue;
    if (
      typeof item !== "number" ||
      !Number.isInteger(item) ||
      item < 0
    ) return undefined;
    output[key] = item;
  }

  return output;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asNumberMap(
  value: unknown,
): Readonly<Record<string, number>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) return {};

  const output: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" && Number.isFinite(item) && item >= 1) {
      output[key] = item;
    }
  }
  return output;
}

interface ObservationPoint {
  tick?: number;
  streamId?: string;
  sequence?: number;
  timestamp?: string;
  origin?:
    | "static"
    | "telemetry"
    | "runtime-probe"
    | "native"
    | "external";
}

function asObservationMap(
  value: unknown,
): Readonly<Record<string, readonly ObservationPoint[]>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) return {};

  const output: Record<string, ObservationPoint[]> = {};
  for (const [predicate, items] of Object.entries(value)) {
    if (!Array.isArray(items)) continue;
    const normalized: ObservationPoint[] = [];
    for (const item of items) {
      if (
        typeof item !== "object" ||
        item === null ||
        Array.isArray(item)
      ) continue;
      const record = item as Record<string, unknown>;
      const point: ObservationPoint = {};
      if (typeof record.tick === "number" && Number.isFinite(record.tick)) {
        point.tick = record.tick;
      }
      if (typeof record.streamId === "string" && record.streamId.trim()) {
        point.streamId = record.streamId;
      }
      if (
        typeof record.sequence === "number" &&
        Number.isFinite(record.sequence)
      ) {
        point.sequence = record.sequence;
      }
      if (typeof record.timestamp === "string") {
        point.timestamp = record.timestamp;
      }
      if (
        record.origin === "static" ||
        record.origin === "telemetry" ||
        record.origin === "runtime-probe" ||
        record.origin === "native" ||
        record.origin === "external"
      ) {
        point.origin = record.origin;
      }
      if (
        point.tick !== undefined ||
        point.sequence !== undefined ||
        point.timestamp !== undefined ||
        point.origin !== undefined
      ) {
        normalized.push(point);
      }
    }
    if (normalized.length > 0) output[predicate] = normalized;
  }
  return output;
}

function compareObservation(
  subject: ObservationPoint,
  outcome: ObservationPoint,
): -1 | 0 | 1 | undefined {
  if (
    subject.tick !== undefined &&
    outcome.tick !== undefined
  ) {
    if (outcome.tick > subject.tick) return 1;
    if (outcome.tick < subject.tick) return -1;
    if (
      subject.streamId !== undefined &&
      outcome.streamId !== undefined &&
      subject.streamId === outcome.streamId &&
      subject.sequence !== undefined &&
      outcome.sequence !== undefined
    ) {
      if (outcome.sequence > subject.sequence) return 1;
      if (outcome.sequence < subject.sequence) return -1;
    }
    return 0;
  }

  if (
    subject.streamId !== undefined &&
    outcome.streamId !== undefined &&
    subject.streamId === outcome.streamId &&
    subject.sequence !== undefined &&
    outcome.sequence !== undefined
  ) {
    if (outcome.sequence > subject.sequence) return 1;
    if (outcome.sequence < subject.sequence) return -1;
    return 0;
  }

  if (
    subject.timestamp !== undefined &&
    outcome.timestamp !== undefined
  ) {
    const subjectTime = Date.parse(subject.timestamp);
    const outcomeTime = Date.parse(outcome.timestamp);
    if (
      Number.isFinite(subjectTime) &&
      Number.isFinite(outcomeTime)
    ) {
      if (outcomeTime > subjectTime) return 1;
      if (outcomeTime < subjectTime) return -1;
      return 0;
    }
  }

  return undefined;
}

function temporalStatus(
  subjects: readonly ObservationPoint[],
  outcomes: readonly ObservationPoint[],
): "after-subject" | "before-subject" | "same-moment" | "unresolved" {
  const comparisons: Array<-1 | 0 | 1> = [];

  for (const subject of subjects) {
    for (const outcome of outcomes) {
      const comparison = compareObservation(subject, outcome);
      if (comparison !== undefined) comparisons.push(comparison);
    }
  }

  if (comparisons.length === 0) return "unresolved";
  if (comparisons.every((item) => item === 1)) return "after-subject";
  if (comparisons.every((item) => item === -1)) return "before-subject";
  if (comparisons.every((item) => item === 0)) return "same-moment";
  return "unresolved";
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

export interface CausalSynthesisOptions {
  /**
   * Global override retained for compatibility/tests. False means no temporal
   * observation may strengthen causality.
   */
  temporalEvidenceReliable?: boolean;
  /**
   * Controls only telemetry-origin observations. Runtime-probe/static evidence
   * remains independent from unrelated telemetry continuity failures.
   */
  telemetryTemporalReliable?: boolean;
  /**
   * Controls only runtime-probe-origin observations. Dropped probe exchanges
   * cannot invalidate unrelated telemetry/static temporal evidence.
   */
  runtimeProbeTemporalReliable?: boolean;
}

function knowledgeFindingChain(
  finding: DiagnosticFinding,
  options: CausalSynthesisOptions,
): CausalChain | undefined {
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
  const runtimeScope = asRuntimeScope(data.runtimeScope);
  if (!relationId || !subject || !object) return undefined;

  const consequences = asStringArray(data.causalConsequences);
  if (consequences.length === 0) return undefined;
  const presentPredicates = new Set(asStringArray(data.presentPredicates));
  const corroborators = asCorroboratorMap(data.causalCorroborators);
  const outcomePredicates = asCorroboratorMap(data.causalOutcomePredicates);
  const minCorroboratingSources = asNumberMap(
    data.causalCorroborationMinSources,
  );
  const predicateSourceKeys = asCorroboratorMap(data.predicateSourceKeys);
  const predicateObservations = asObservationMap(
    data.predicateObservations,
  );
  const subjectObservations = predicateObservations[subject] ?? [];

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
  const observedOutcomeNodeIds = new Set<string>();

  for (const consequence of consequences) {
    const riskNodeId = idFor([finding.id, "risk", consequence]);
    const requiredPredicates = corroborators[consequence] ?? [];
    const sourceKeys = [...new Set(
      requiredPredicates.flatMap(
        (predicate) => predicateSourceKeys[predicate] ?? [],
      ),
    )].sort();
    const minimumSources = minCorroboratingSources[consequence] ?? 0;
    const predicateProof =
      requiredPredicates.length > 0 &&
      requiredPredicates.every((predicate) => presentPredicates.has(predicate));
    const sourceProof =
      minimumSources === 0 || sourceKeys.length >= minimumSources;
    const corroborated = predicateProof && sourceProof;
    if (corroborated) hasCorroboratedRisk = true;

    nodes.push({
      id: riskNodeId,
      kind: "downstream-risk",
      label: consequence,
      diagnosticIds: [finding.id],
      ...(corroborated
        ? {
            corroboratingPredicates: requiredPredicates,
            ...(sourceKeys.length === 0
              ? {}
              : { corroboratingSourceKeys: sourceKeys }),
          }
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
      const outcomeObservations =
        predicateObservations[predicate] ?? [];
      const timing = temporalStatus(
        subjectObservations,
        outcomeObservations,
      );
      const temporalObservations = [
        ...subjectObservations,
        ...outcomeObservations,
      ];
      const usesTelemetryObservation = temporalObservations.some(
        (observation) => observation.origin === "telemetry",
      );
      const usesRuntimeProbeObservation = temporalObservations.some(
        (observation) => observation.origin === "runtime-probe",
      );
      const temporalEvidenceReliable =
        options.temporalEvidenceReliable !== false &&
        !(
          usesTelemetryObservation &&
          options.telemetryTemporalReliable === false
        ) &&
        !(
          usesRuntimeProbeObservation &&
          options.runtimeProbeTemporalReliable === false
        );
      if (
        temporalEvidenceReliable &&
        timing !== "before-subject"
      ) {
        hasObservedOutcome = true;
      }
      const observedNodeId = idFor([
        finding.id,
        "observed-outcome",
        predicate,
      ]);
      const observedSourceKeys = predicateSourceKeys[predicate] ?? [];
      if (!observedOutcomeNodeIds.has(observedNodeId)) {
        observedOutcomeNodeIds.add(observedNodeId);
        nodes.push({
          id: observedNodeId,
          kind: "observed-state",
          label: predicate,
          diagnosticIds: [finding.id],
          corroboratingPredicates: [predicate],
          ...(observedSourceKeys.length === 0
            ? {}
            : { corroboratingSourceKeys: observedSourceKeys }),
        });
      }
      links.push({
        from: riskNodeId,
        to: observedNodeId,
        strength: "direct-evidence",
        relationId,
        temporalStatus: timing,
        temporalIntegrity:
          temporalEvidenceReliable
            ? "complete"
            : "incomplete",
        rationale: !temporalEvidenceReliable
          ? usesTelemetryObservation &&
            options.telemetryTemporalReliable === false
            ? "The downstream outcome is observed, but telemetry-origin timing is not trustworthy because telemetry continuity is incomplete; the observation is retained without using temporal position as causal support."
            : usesRuntimeProbeObservation &&
                options.runtimeProbeTemporalReliable === false
              ? "The downstream outcome is observed, but runtime-probe timing is not trustworthy because probe exchanges were dropped; the observation is retained without using temporal position as causal support."
              : "The downstream outcome is observed, but temporal evidence is explicitly marked unreliable; the observation is retained without using temporal position as causal support."
          : timing === "before-subject"
            ? "The downstream outcome is observed in the same scope, but available timing places it before the initiating subject; it is not counted as causal support."
            : timing === "after-subject"
              ? "Runtime evidence reports the downstream outcome after the initiating subject in the same scope; causal attribution remains bounded by the dependency evidence."
              : "Runtime evidence in the same scope reports the downstream outcome directly, but temporal ordering is not fully resolved.",
      });
    }
  }

  return {
    id: idFor([scopeKey ?? "global", relationId, finding.id]),
    ...(scopeKey === undefined ? {} : { scopeKey }),
    ...(runtimeScope === undefined ? {} : { scope: runtimeScope }),
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
  options: CausalSynthesisOptions = {},
): CausalChain[] {
  const chains = diagnostics
    .map((finding) => knowledgeFindingChain(finding, options))
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
