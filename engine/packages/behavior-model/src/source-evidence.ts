import type { AuthoredBranchGuard, SemanticIr } from "../../semantic-ir/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";
import type { BehaviorClaimProvenance } from "./provenance.js";

/**
 * Bounded source-evidence reconciliation, NOT executable BehaviorTransitions.
 * A source-ordered state write or resource action may never execute, and a
 * returned literal does not establish a player-visible terminal outcome.
 */
export interface SourceResourceOutcomeCandidate {
  readonly outcomeId: string;
  readonly executionRegionId: string;
  readonly propertyName: string;
  readonly value: string;
  /** Exact source-ordered sites, not verified resource mutations. */
  readonly precedingResourceActionIds: readonly string[];
  readonly precedingReleaseActionIds: readonly string[];
  readonly status: "SOURCE_ORDER_CANDIDATE" | "UNRESOLVED";
  readonly reason: string;
  readonly provenance: BehaviorClaimProvenance;
}

export interface SourceStateOutcomeCandidate {
  readonly outcomeId: string;
  readonly executionRegionId: string;
  readonly propertyName: string;
  readonly value: string;
  readonly precedingWriteOperationIds: readonly string[];
  /** Later writes to the same authored surface that may supersede a candidate.
   * Includes unknown-location writes in the same region/document, not assumed absent. */
  readonly intermediateMutationOperationIds: readonly string[];
  readonly status: "SOURCE_ORDER_CANDIDATE" | "UNRESOLVED";
  readonly reason: string;
  readonly provenance: BehaviorClaimProvenance;
}

function sameDocument(a: SourceRef, b: SourceRef): boolean {
  return a.artifactId === b.artifactId &&
    a.relativePath === b.relativePath &&
    a.jsonPointer === b.jsonPointer;
}

function precedingSourceSite(
  site: SourceRef,
  outcome: SourceRef,
): boolean {
  if (!sameDocument(site, outcome)) return false;
  if (!hasOrderedPosition(site) || !hasOrderedPosition(outcome)) return false;
  const end = site.range!;
  const start = outcome.range!;
  return end.lineEnd! < start.lineStart! ||
    (end.lineEnd === start.lineStart &&
      end.columnEnd! <= start.columnStart!);
}

/** Missing position is not evidence that a mutation cannot intervene. */
function hasOrderedPosition(source: SourceRef): boolean {
  const range = source.range;
  return range?.lineStart !== undefined &&
    range.lineEnd !== undefined &&
    range.columnStart !== undefined &&
    range.columnEnd !== undefined;
}

function guardsEqual(
  a?: readonly AuthoredBranchGuard[],
  b?: readonly AuthoredBranchGuard[],
): boolean {
  const signature = (guards?: readonly AuthoredBranchGuard[]) =>
    JSON.stringify((guards ?? []).map(guard => {
      const range = guard.source.range;
      // Without exact source coordinates, a condition is insufficient to
      // establish that two records describe the same authored branch.
      if (!range || range.lineStart === undefined ||
          range.columnStart === undefined ||
          range.lineEnd === undefined ||
          range.columnEnd === undefined) return null;
      return [
        guard.source.artifactId, guard.source.relativePath,
        guard.source.jsonPointer ?? null,
        range.lineStart, range.columnStart, range.lineEnd, range.columnEnd,
        guard.expression, guard.branch,
      ];
    }));
  if ((a ?? []).some(g => !g.source.range) ||
      (b ?? []).some(g => !g.source.range)) return false;
  const valid = (guards?: readonly AuthoredBranchGuard[]) =>
    (guards ?? []).every(g => g.source.range?.lineStart !== undefined &&
      g.source.range?.columnStart !== undefined &&
      g.source.range?.lineEnd !== undefined &&
      g.source.range?.columnEnd !== undefined);
  return valid(a) && valid(b) && signature(a) === signature(b);
}

/**
 * A write inside an enclosing authored branch may precede a return in a
 * nested branch. Require each write-side lexical guard to match an exact
 * source/arm on the return. A different guard site, opposite arm, or missing
 * position cannot establish this bounded source association.
 *
 * Preceding early-exit guards remain exact-equality requirements: relaxing
 * those without control-flow dominance evidence would fabricate a path.
 */
function lexicalGuardsCoveredByOutcome(
  write?: readonly AuthoredBranchGuard[],
  outcome?: readonly AuthoredBranchGuard[],
): boolean {
  if (!guardsEqual(write, write) || !guardsEqual(outcome, outcome)) {
    return false;
  }
  return (write ?? []).every(required =>
    (outcome ?? []).some(observed =>
      guardsEqual([required], [observed])));
}

/** Exactly opposing branches of one identified source guard cannot both run
 * in the same evaluation. Textually similar guards at different sites are
 * NOT considered mutually exclusive (values may have changed). */
function mutuallyExclusiveGuards(
  a: {
    lexicalGuards?: readonly AuthoredBranchGuard[];
    precedenceGuards?: readonly AuthoredBranchGuard[];
  },
  b: {
    lexicalGuards?: readonly AuthoredBranchGuard[];
    precedenceGuards?: readonly AuthoredBranchGuard[];
  },
): boolean {
  const left = [...(a.lexicalGuards ?? []), ...(a.precedenceGuards ?? [])];
  const right = [...(b.lexicalGuards ?? []), ...(b.precedenceGuards ?? [])];
  return left.some(one => right.some(two => {
    const x = one.source.range;
    const y = two.source.range;
    return one.branch !== two.branch &&
      one.expression === two.expression &&
      sameDocument(one.source, two.source) &&
      x?.lineStart !== undefined && x.columnStart !== undefined &&
      x.lineEnd !== undefined && x.columnEnd !== undefined &&
      x.lineStart === y?.lineStart &&
      x.columnStart === y?.columnStart &&
      x.lineEnd === y?.lineEnd &&
      x.columnEnd === y?.columnEnd;
  }));
}

/**
 * Reconcile authored resource actions against return sites in the same
 * execution region and selected-artifact document. A source-order candidate
 * records only a possible call-before-return association: neither resource
 * release success nor game terminal/arena reset is proven. Unmatched outcomes
 * with same-region resource sites remain visible, but unrelated returns are
 * not turned into artificial resource requirements.
 */
export function reconcileSourceResourceOutcomes(
  ir: SemanticIr,
): readonly SourceResourceOutcomeCandidate[] {
  const actions = ir.state.resourceActions ?? [];
  return [...(ir.execution.outcomes ?? [])]
    .filter(outcome => actions.some(action =>
      action.executionRegionId === outcome.executionRegionId &&
      sameDocument(action.source, outcome.source)))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(outcome => {
      const possible = actions.filter(action =>
        action.executionRegionId === outcome.executionRegionId &&
        precedingSourceSite(action.source, outcome.source) &&
        lexicalGuardsCoveredByOutcome(
          action.lexicalGuards, outcome.lexicalGuards,
        ) &&
        guardsEqual(action.precedenceGuards, outcome.precedenceGuards));
      const precedingResourceActionIds = [...new Set(
        possible.map(action => action.id),
      )].sort();
      const precedingReleaseActionIds = [...new Set(
        possible.filter(action => action.action === "release")
          .map(action => action.id),
      )].sort();
      return {
        outcomeId: outcome.id,
        executionRegionId: outcome.executionRegionId,
        propertyName: outcome.propertyName,
        value: outcome.value,
        precedingResourceActionIds,
        precedingReleaseActionIds,
        status: possible.length > 0
          ? "SOURCE_ORDER_CANDIDATE" as const
          : "UNRESOLVED" as const,
        reason: possible.length > 0
          ? "Authored resource actions precede this return under compatible exact source guard evidence. Resource ownership, side effects, successful release, terminal meaning and reset completion remain unverified."
          : "Same-region authored resource actions exist but none has exact earlier source position and compatible branch evidence for this return; no resource/outcome association is established.",
        provenance: {
          kind: "source-inference" as const,
          evidenceCeiling: "inferred" as const,
          evidenceIds: [outcome.id, ...precedingResourceActionIds].sort(),
          note: "Source-order evidence only; not resource lifecycle closure, an executable BehaviorTransition or proof of game completion.",
        },
      };
    });
}

/**
 * Collect source-ordered writes preceding each authored return in the SAME
 * execution region. Every write-side lexical guard must be necessary for the
 * return path; preceding early-exit guards must match exactly.
 * Does not imply dataflow, runtime order, scope identity, or game success.
 * Unmatched returns stay explicitly visible rather than silently disappearing.
 */
export function reconcileSourceStateOutcomes(
  ir: SemanticIr,
): readonly SourceStateOutcomeCandidate[] {
  const writes = ir.state.operations.filter(operation =>
    operation.operation === "write" && operation.writtenValue !== undefined);
  return [...(ir.execution.outcomes ?? [])]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(outcome => {
      const candidates = writes.filter(write =>
        write.executionRegionId === outcome.executionRegionId &&
        precedingSourceSite(write.source, outcome.source) &&
        lexicalGuardsCoveredByOutcome(
          write.lexicalGuards, outcome.lexicalGuards,
        ) &&
        guardsEqual(write.precedenceGuards, outcome.precedenceGuards));
      const ids = [...new Set(candidates.map(item => item.id))].sort();
      // An intermediate mutation of the same surface can invalidate a naive
      // state-at-return inference. Do not assume different branches are
      // exclusive across time, and do not discard imprecisely located writes.
      const candidateIds = new Set(ids);
      const interruptions = writes.filter(other =>
        !candidateIds.has(other.id) &&
        other.executionRegionId === outcome.executionRegionId &&
        sameDocument(other.source, outcome.source) &&
        candidates.some(candidate =>
          candidate.surfaceId === other.surfaceId &&
          !mutuallyExclusiveGuards(candidate, other) &&
          (
            !hasOrderedPosition(other.source) ||
            (precedingSourceSite(candidate.source, other.source) &&
              precedingSourceSite(other.source, outcome.source))
          ))
      ).map(item => item.id);
      // Multiple writes to the same surface within matching authored
      // branches also prohibit claiming one stable value at return.
      const repeated = candidates.filter(candidate =>
        candidates.some(other => other.id !== candidate.id &&
          other.surfaceId === candidate.surfaceId));
      const intermediateMutationOperationIds = [
        ...new Set([...interruptions, ...repeated.map(item => item.id)]),
      ].sort();
      const status = ids.length > 0 &&
        intermediateMutationOperationIds.length === 0
        ? "SOURCE_ORDER_CANDIDATE" as const
        : "UNRESOLVED" as const;
      return {
        outcomeId: outcome.id,
        executionRegionId: outcome.executionRegionId,
        propertyName: outcome.propertyName,
        value: outcome.value,
        precedingWriteOperationIds: ids,
        intermediateMutationOperationIds,
        status,
        reason: intermediateMutationOperationIds.length > 0
          ? "Intermediate or repeated writes to the same authored state surface may change its value before this return. Source order alone cannot establish the effective state, instance identity or lifetime."
          : ids.length > 0
          ? "Authored writes precede this return under compatible exact source branch evidence. The value's actual lifetime, state owner, runtime path and causal connection to the outcome are unknown."
          : "No source-ordered write with exact same-region, same-document and branch evidence was identified; the outcome's state dependency and lifetime are unknown.",
        provenance: {
          kind: "source-inference" as const,
          evidenceCeiling: "inferred" as const,
          evidenceIds: [outcome.id, ...new Set([...ids, ...intermediateMutationOperationIds])].sort(),
          note: "Static source association only; never an executable BehaviorTransition or gameplay completion claim.",
        },
      };
    });
}

/**
 * Effect-directed, bounded static program slice over the SAME Semantic IR.
 * The entry is an authored call/event candidate, never evidence that the
 * branch ran, a state mutation committed, or a player observed a result.
 * A missing ingress is UNKNOWN, not an unreachable-code or defect verdict.
 */
export interface SourceEffectSlice {
  readonly effectId: string;
  readonly effectKind: "state-mutation" | "resource-action" | "authored-return" | "world-effect";
  readonly worldEffectKind?: NonNullable<SemanticIr["execution"]["worldEffects"]>[number]["kind"];
  readonly targetLabel?: string;
  readonly evidencePrecision?: NonNullable<SemanticIr["execution"]["worldEffects"]>[number]["precision"];
  readonly executionRegionId: string;
  readonly sourcePath: string;
  readonly status: "CANDIDATE_INGRESS" | "NO_KNOWN_INGRESS" | "TRUNCATED";
  readonly truncated: boolean;
  readonly candidateIngress: readonly {
    readonly entryRegionId: string;
    /** A representative source call path in entry-to-effect order. */
    readonly regionIds: readonly string[];
    readonly executionEdgeIds: readonly string[];
    readonly guardedEdgeIds: readonly string[];
    readonly temporalBoundaryEdgeIds: readonly string[];
  }[];
  /** Source-order only; same-surface reads are not proven data dependencies. */
  readonly possiblePrecedingReadIds: readonly string[];
  /** Existing same-region guarded source-order candidates, not outcomes. */
  readonly sourceOrderedOutcomeIds: readonly string[];
  readonly effectGuards: readonly {
    readonly kind: "lexical" | "precedence";
    readonly branch: "true" | "false";
    readonly expression: string;
    readonly sourcePath: string;
    readonly lineStart: number | null;
    readonly columnStart: number | null;
  }[];
}

export function deriveSourceEffectSlices(
  ir: SemanticIr,
): readonly SourceEffectSlice[] {
  // Build inverse *resolved* execution links once. Cycles, depth and
  // alternative paths are bounded; no cross-artifact or name-only traversal.
  const MAX_REGIONS = 64;
  const MAX_DEPTH = 12;
  const MAX_ENTRIES = 12;
  const incoming = new Map<string, SemanticIr["execution"]["edges"][number][]>();
  const edgeById = new Map(ir.execution.edges.map(edge => [edge.id, edge]));
  const regions = new Map(ir.execution.regions.map(region => [region.id, region]));
  for (const edge of ir.execution.edges) {
    if (edge.resolution !== "resolved" || edge.to === undefined ||
        !regions.has(edge.from) || !regions.has(edge.to)) continue;
    const list = incoming.get(edge.to) ?? [];
    list.push(edge);
    incoming.set(edge.to, list);
  }
  for (const list of incoming.values()) list.sort((a, b) => a.id.localeCompare(b.id));

  type Effect = {
    id: string;
    kind: SourceEffectSlice["effectKind"];
    region: string;
    source: SourceRef;
    surfaceId?: string;
    worldEffectKind?: SourceEffectSlice["worldEffectKind"];
    targetLabel?: string;
    evidencePrecision?: SourceEffectSlice["evidencePrecision"];
    lexicalGuards?: readonly AuthoredBranchGuard[];
    precedenceGuards?: readonly AuthoredBranchGuard[];
  };
  const effects: Effect[] = [
    ...ir.state.operations
      .filter(op => op.operation === "write" ||
        op.operation === "delete" || op.operation === "clear")
      .map(op => ({
        id: op.id, kind: "state-mutation" as const,
        region: op.executionRegionId, source: op.source,
        surfaceId: op.surfaceId,
        lexicalGuards: op.lexicalGuards,
        precedenceGuards: op.precedenceGuards,
      })),
    ...(ir.state.resourceActions ?? []).map(action => ({
      id: action.id, kind: "resource-action" as const,
      region: action.executionRegionId, source: action.source,
      lexicalGuards: action.lexicalGuards,
      precedenceGuards: action.precedenceGuards,
    })),
    ...(ir.execution.outcomes ?? []).map(outcome => ({
      id: outcome.id, kind: "authored-return" as const,
      region: outcome.executionRegionId, source: outcome.source,
      lexicalGuards: outcome.lexicalGuards,
      precedenceGuards: outcome.precedenceGuards,
    })),
    ...(ir.execution.worldEffects ?? []).map(effect => ({
      id: effect.id, kind: "world-effect" as const,
      region: effect.executionRegionId, source: effect.source,
      worldEffectKind: effect.kind, targetLabel: effect.targetLabel,
      evidencePrecision: effect.precision,
    })),
  ];
  const stateOutcomeCandidates = reconcileSourceStateOutcomes(ir);
  const resourceOutcomeCandidates = reconcileSourceResourceOutcomes(ir);
  return effects.sort((a, b) => a.id.localeCompare(b.id)).map(effect => {
    type Candidate = SourceEffectSlice["candidateIngress"][number];
    const queue: { regionId: string; path: readonly string[]; depth: number }[] =
      [{ regionId: effect.region, path: [], depth: 0 }];
    const visited = new Set([effect.region]);
    const found: Candidate[] = [];
    let truncated = false;
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index]!;
      const region = regions.get(current.regionId);
      const parents = incoming.get(current.regionId) ?? [];
      const validEntry = region?.kind === "event-source" ||
        region?.kind === "script-module" ||
        (region?.kind === "mcfunction" && parents.length === 0);
      if (validEntry) {
        const entryToEffectEdges = current.path;
        const chain = [current.regionId];
        for (const edgeId of entryToEffectEdges) {
          const edge = edgeById.get(edgeId);
          if (edge?.to !== undefined) chain.push(edge.to);
        }
        if (found.length >= MAX_ENTRIES) {
          truncated = true;
        } else {
          found.push({
            entryRegionId: current.regionId,
            regionIds: chain,
            executionEdgeIds: [...entryToEffectEdges],
            guardedEdgeIds: entryToEffectEdges.filter(id => {
              const edge = edgeById.get(id);
              return edge?.controlFlow === "conditional" ||
                (edge?.lexicalGuards?.length ?? 0) > 0 ||
                (edge?.precedenceGuards?.length ?? 0) > 0;
            }),
            temporalBoundaryEdgeIds: entryToEffectEdges.filter(id => {
              const kind = edgeById.get(id)?.kind;
              return kind === "event-dispatch" || kind === "deferred" ||
                kind === "periodic";
            }),
          });
        }
      }
      if (current.depth >= MAX_DEPTH) {
        if (parents.length > 0) truncated = true;
        continue;
      }
      for (const edge of parents) {
        if (visited.has(edge.from)) continue;
        if (visited.size >= MAX_REGIONS) {
          truncated = true;
          break;
        }
        visited.add(edge.from);
        queue.push({
          regionId: edge.from,
          path: [edge.id, ...current.path],
          depth: current.depth + 1,
        });
      }
    }
    const guardSites = (
      guards: readonly AuthoredBranchGuard[] | undefined,
      kind: "lexical" | "precedence",
    ): SourceEffectSlice["effectGuards"][number][] =>
      (guards ?? []).map(guard => ({
        kind,
        branch: guard.branch,
        expression: guard.expression,
        sourcePath: guard.source.relativePath,
        lineStart: guard.source.range?.lineStart ?? null,
        columnStart: guard.source.range?.columnStart ?? null,
      }));
    const sourceOrderedOutcomeIds = effect.kind === "state-mutation"
      ? stateOutcomeCandidates
          .filter(candidate => candidate.status === "SOURCE_ORDER_CANDIDATE" &&
            candidate.precedingWriteOperationIds.includes(effect.id))
          .map(candidate => candidate.outcomeId)
      : effect.kind === "resource-action"
        ? resourceOutcomeCandidates
            .filter(candidate => candidate.status === "SOURCE_ORDER_CANDIDATE" &&
              candidate.precedingResourceActionIds.includes(effect.id))
            .map(candidate => candidate.outcomeId)
        : [];
    const possiblePrecedingReadIds = effect.surfaceId === undefined ? []
      : ir.state.operations
          .filter(op => op.operation === "read" &&
            op.surfaceId === effect.surfaceId &&
            op.executionRegionId === effect.region &&
            precedingSourceSite(op.source, effect.source) &&
            lexicalGuardsCoveredByOutcome(op.lexicalGuards, effect.lexicalGuards) &&
            guardsEqual(op.precedenceGuards, effect.precedenceGuards))
          .map(op => op.id).sort();
    return {
      effectId: effect.id,
      effectKind: effect.kind,
      ...(effect.worldEffectKind === undefined ? {} : {
        worldEffectKind: effect.worldEffectKind,
        targetLabel: effect.targetLabel,
        evidencePrecision: effect.evidencePrecision,
      }),
      executionRegionId: effect.region,
      sourcePath: effect.source.relativePath,
      status: truncated ? "TRUNCATED" as const :
        found.length > 0 ? "CANDIDATE_INGRESS" as const :
        "NO_KNOWN_INGRESS" as const,
      truncated,
      candidateIngress: found.sort((a, b) =>
        a.entryRegionId.localeCompare(b.entryRegionId)),
      possiblePrecedingReadIds,
      sourceOrderedOutcomeIds: [...new Set(sourceOrderedOutcomeIds)].sort(),
      effectGuards: [
        ...guardSites(effect.lexicalGuards, "lexical"),
        ...guardSites(effect.precedenceGuards, "precedence"),
      ],
    };
  });
}
