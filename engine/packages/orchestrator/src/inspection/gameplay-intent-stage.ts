import {
  extractGameplayIntentSignals,
  type GameplayIntentRelationSignal,
  type GameplayIntentSignal,
} from "../../../../analyzers/gameplay-intent/src/index.js";
import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";
import type { SemanticIr } from "../../../semantic-ir/src/index.js";
import { scriptRegionId } from "../diagnosis/semantic-ir-stage.js";
import {
  validateGameplayIntentModel,
  type GameplayIntentEdge,
  type GameplayIntentEvidence,
  type GameplayIntentInvariant,
  type GameplayIntentModel,
  type GameplayIntentNode,
  type GameplayIntentStatus,
} from "../../../gameplay-intent/src/index.js";

export interface GameplayIntentStageInput {
  id: string;
  artifactId?: string;
  parsedScripts: readonly {
    parsed: ParsedScriptFile;
  }[];
  contractScripts?: readonly {
    parsed: ParsedScriptFile;
  }[];
  supplementalSignals?: readonly GameplayIntentSignal[];
  /** Built from these same parsed sources; absent in lightweight consumers. */
  semanticIr?: SemanticIr;
}

const STATUS_RANK: Readonly<Record<GameplayIntentStatus, number>> = {
  hypothesis: 0,
  inferred: 1,
  authored: 2,
};

function evidenceId(
  signal: GameplayIntentSignal | GameplayIntentRelationSignal,
): string {
  return "intent-evidence:" + signal.id;
}

function sameExactCallSource(left: SourceRef, right: SourceRef): boolean {
  // A file-only match is never unique provenance for a call site.
  return left.artifactId === right.artifactId &&
    left.relativePath === right.relativePath &&
    left.jsonPointer === right.jsonPointer &&
    left.range?.lineStart !== undefined &&
    left.range?.columnStart !== undefined &&
    left.range?.lineStart === right.range?.lineStart &&
    left.range?.lineEnd === right.range?.lineEnd &&
    left.range?.columnStart === right.range?.columnStart &&
    left.range?.columnEnd === right.range?.columnEnd;
}

export function buildGameplayIntentModel(
  input: GameplayIntentStageInput,
): GameplayIntentModel {
  const contractScripts =
    input.contractScripts ?? [];
  const extractedBase = extractGameplayIntentSignals([
    ...input.parsedScripts.map((item) => item.parsed),
    ...contractScripts.map(
      (item) => item.parsed,
    ),
  ]);
  const supplementalSignals =
    input.supplementalSignals ?? [];
  const extracted = {
    ...extractedBase,
    signals: [
      ...extractedBase.signals,
      ...supplementalSignals,
    ],
  };
  const selectedArtifactSourcePaths = new Set([
    ...input.parsedScripts.map(
      (item) => item.parsed.source.relativePath,
    ),
    ...contractScripts.map(
      (item) => item.parsed.source.relativePath,
    ),
    ...supplementalSignals.map(
      (signal) => signal.locator,
    ),
  ]);

  const evidence = new Map<string, GameplayIntentEvidence>();
  const nodes = new Map<string, GameplayIntentNode>();
  const edges = new Map<string, GameplayIntentEdge>();
  const invariants = new Map<string, GameplayIntentInvariant>();
  const intentUnknowns: GameplayIntentModel["unknowns"][number][] = [];


  for (const signal of extracted.signals) {
    const id = evidenceId(signal);
    const signalScope =
      selectedArtifactSourcePaths.has(signal.locator)
        ? "selected-artifact" as const
        : undefined;
    evidence.set(id, {
      id,
      origin: signal.evidenceOrigin,
      locator: signal.locator,
      summary: signal.summary,
      ...(signalScope === undefined
        ? {}
        : { scope: signalScope }),
    });

    const existing = nodes.get(signal.subjectKey);
    if (!existing) {
      nodes.set(signal.subjectKey, {
        id: signal.subjectKey,
        kind: signal.nodeKind,
        label: signal.label,
        status: signal.status,
        evidenceIds: [id],
        ...(signal.policyPredicate === undefined
          ? {}
          : { policyPredicate: signal.policyPredicate }),
        ...(signal.spatialProfile === undefined
          ? {}
          : { spatialProfile: signal.spatialProfile }),
      });
      continue;
    }

    const mergedEvidence = [
      ...new Set([...existing.evidenceIds, id]),
    ].sort();

    nodes.set(signal.subjectKey, {
      ...existing,
      status:
        STATUS_RANK[signal.status] > STATUS_RANK[existing.status]
          ? signal.status
          : existing.status,
      evidenceIds: mergedEvidence,
      ...(existing.policyPredicate !== undefined
        ? { policyPredicate: existing.policyPredicate }
        : signal.policyPredicate !== undefined
        ? { policyPredicate: signal.policyPredicate }
        : {}),
      ...(existing.spatialProfile !== undefined
        ? { spatialProfile: existing.spatialProfile }
        : signal.spatialProfile !== undefined
        ? { spatialProfile: signal.spatialProfile }
        : {}),
    });
  }

  for (const relation of extracted.relations) {
    if (
      !nodes.has(relation.fromSubjectKey) ||
      !nodes.has(relation.toSubjectKey)
    ) {
      continue;
    }

    const id = evidenceId(relation);
    const relationScope =
      selectedArtifactSourcePaths.has(relation.locator)
        ? "selected-artifact" as const
        : undefined;
    evidence.set(id, {
      id,
      origin: relation.evidenceOrigin,
      locator: relation.locator,
      summary: relation.summary,
      ...(relationScope === undefined
        ? {}
        : { scope: relationScope }),
    });

    // Carry exact IR identity across the existing intent edge, but do not
    // upgrade the inferred gameplay purpose of a syntactic function call.
    const exactIrEvidenceIds = new Set<string>();
    if (relation.edgeKind === "requires" && input.semanticIr) {
      for (const origin of relation.localCallOrigins ?? []) {
        if (origin.scriptSource.artifactId !== origin.call.source.artifactId ||
            origin.scriptSource.relativePath !== origin.call.source.relativePath) {
          continue;
        }
        const matches = input.semanticIr.execution.edges.filter(edge =>
          edge.kind === "synchronous-call" &&
          edge.resolution === "resolved" &&
          edge.from === scriptRegionId(origin.scriptSource, origin.call.callerRegion) &&
          edge.to === scriptRegionId(origin.scriptSource, origin.call.targetRegion) &&
          edge.targetLabel === origin.call.targetName &&
          sameExactCallSource(edge.source, origin.call.source));
        if (matches.length !== 1) continue;
        const matched = matches[0]!;
        exactIrEvidenceIds.add(matched.id);
        evidence.set(matched.id, {
          id: matched.id,
          origin: "source-code",
          locator: matched.source.relativePath,
          scope: "selected-artifact",
          summary: "Exact Semantic IR call edge from parsed source location; gameplay dependency remains inferred.",
        });
      }
    }
    const relationEvidenceIds = [id, ...exactIrEvidenceIds].sort();

    const semanticKey = [
      relation.edgeKind,
      relation.fromSubjectKey,
      relation.toSubjectKey,
    ].join("::");

    const existing = edges.get(semanticKey);
    if (!existing) {
      edges.set(semanticKey, {
        id:
          "intent-edge:" +
          relation.edgeKind + ":" +
          relation.fromSubjectKey + ":" +
          relation.toSubjectKey,
        from: relation.fromSubjectKey,
        to: relation.toSubjectKey,
        kind: relation.edgeKind,
        status: relation.status,
        evidenceIds: relationEvidenceIds,
      });
      continue;
    }

    edges.set(semanticKey, {
      ...existing,
      status:
        STATUS_RANK[relation.status] >
        STATUS_RANK[existing.status]
          ? relation.status
          : existing.status,
      evidenceIds: [
        ...new Set([...existing.evidenceIds, ...relationEvidenceIds]),
      ].sort(),
    });
  }

  const evidenceHasSelectedArtifactSource = (
    evidenceIds: readonly string[],
  ): boolean =>
    evidenceIds.some((id) => {
      const item = evidence.get(id);
      return (
        item !== undefined &&
        item.scope === "selected-artifact"
      );
    });

  const authoredTransitionsByFrom = new Map<
    string,
    GameplayIntentEdge[]
  >();

  for (const edge of edges.values()) {
    if (
      edge.kind !== "transitions-to" ||
      edge.status !== "authored"
    ) {
      continue;
    }
    const list =
      authoredTransitionsByFrom.get(edge.from) ?? [];
    list.push(edge);
    authoredTransitionsByFrom.set(edge.from, list);
  }

  for (const [from, transitions] of authoredTransitionsByFrom) {
    const targetLabels = transitions
      .map((edge) => nodes.get(edge.to)?.label ?? edge.to)
      .sort();
    const evidenceIds = [
      ...new Set(
        transitions.flatMap((edge) => edge.evidenceIds),
      ),
    ].sort();

    invariants.set("inv:allowed-transitions:" + from, {
      id: "inv:allowed-transitions:" + from,
      statement:
        (nodes.get(from)?.label ?? from) +
        " transitions only to declared successors: " +
        targetLabels.join(", "),
      strength: "must",
      status: evidenceHasSelectedArtifactSource(evidenceIds)
        ? "authored"
        : "inferred",
      subjectIds: [from],
      evidenceIds,
    });
  }

  for (const coverage of extracted.outcomePolicyCoverage) {
    const policyEdges = [...edges.values()].filter(
      (edge) =>
        edge.from === coverage.outcomeSubjectKey &&
        edge.kind === "requires" &&
        edge.status === "authored" &&
        nodes.get(edge.to)?.kind === "policy",
    );

    if (
      coverage.completeDirectGuardCoverage &&
      policyEdges.length > 0
    ) {
      const policyLabels = policyEdges
        .map((edge) => nodes.get(edge.to)?.label ?? edge.to)
        .sort();
      const evidenceIds = [
        ...new Set(
          policyEdges.flatMap((edge) => edge.evidenceIds),
        ),
      ].sort();

      invariants.set(
        "inv:admissible-policy:" +
          coverage.outcomeSubjectKey,
        {
          id:
            "inv:admissible-policy:" +
            coverage.outcomeSubjectKey,
          statement:
            (nodes.get(coverage.outcomeSubjectKey)?.label ??
              coverage.outcomeSubjectKey) +
            " is statically observed only under one of these direct guards: " +
            policyLabels.join(" OR "),
          strength: "must",
          status: evidenceHasSelectedArtifactSource(evidenceIds)
            ? "authored"
            : "inferred",
          subjectIds: [coverage.outcomeSubjectKey],
          evidenceIds,
        },
      );
      continue;
    }

    if (coverage.totalLiteralReturnSites > 0) {
      intentUnknowns.push({
        id:
          "unknown:outcome-policy-coverage:" +
          coverage.outcomeSubjectKey,
        question:
          "Not every recognized literal return site for this outcome is controlled by a directly modeled if-guard; switch/default/nested or other control flow may still define admissibility.",
        blockedSubjectIds: [coverage.outcomeSubjectKey],
      });
    }
  }

  const model: GameplayIntentModel = {
    schemaVersion: 1,
    id: input.id,
    ...(input.artifactId === undefined
      ? {}
      : { artifactId: input.artifactId }),
    evidence: [...evidence.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    nodes: [...nodes.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    edges: [...edges.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    invariants: [...invariants.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    unknowns: [
      ...(nodes.size === 0
        ? [{
            id: "unknown:no-intent-signals",
            question:
              "No gameplay-intent signal could be grounded from the available selected-artifact evidence.",
            blockedSubjectIds: [] as readonly string[],
          }]
        : []),
      ...intentUnknowns,
    ],
  };

  const errors = validateGameplayIntentModel(model);
  if (errors.length > 0) {
    throw new Error(
      "Gameplay Intent Model failed validation: " +
        errors
          .map((error) => error.path + ": " + error.message)
          .join("; "),
    );
  }

  return model;
}
