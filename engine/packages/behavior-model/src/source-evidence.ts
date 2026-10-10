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

/**
 * An authored world-effect command/API site preceding a literal return.
 * This is a source-order hint only, not evidence of command success or
 * player-facing gameplay causality. Effects lack exact lexical branch data.
 */
export interface SourceWorldEffectOutcomeCandidate {
  readonly outcomeId: string;
  readonly executionRegionId: string;
  readonly precedingWorldEffectIds: readonly string[];
  /** Individual effects compatible with the return's exact guard ancestry. */
  readonly guardCompatibleWorldEffectIds: readonly string[];
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

/**
 * A dynamic-property read may be written inside an authored guard expression.
 * Inclusion is only about exact AST source spans in the SAME document, not
 * inferred from state names, similar text, or a shared execution trace.
 */
function sourceRangeContains(
  parent: SourceRef,
  child: SourceRef,
): boolean {
  if (!sameDocument(parent, child) ||
      !hasOrderedPosition(parent) || !hasOrderedPosition(child)) return false;
  const a = parent.range!;
  const b = child.range!;
  const atOrAfter = (line: number, col: number, otherLine: number, otherCol: number) =>
    line > otherLine || (line === otherLine && col >= otherCol);
  return atOrAfter(b.lineStart!, b.columnStart!, a.lineStart!, a.columnStart!) &&
    atOrAfter(a.lineEnd!, a.columnEnd!, b.lineEnd!, b.columnEnd!);
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
 * Exact resource-key lifetime candidates from one authored execution region.
 * This is NOT runtime resource state, full lifecycle closure, or a guarantee
 * that a matching release was executed.
 */
export interface SourceResourceLifetimeCandidate {
  readonly acquireActionId: string;
  readonly executionRegionId: string;
  readonly surface: NonNullable<SemanticIr["state"]["resourceActions"]>[number]["surface"];
  readonly resourceKey: string;
  readonly candidateReleaseActionIds: readonly string[];
  /** Same region/source/branch and after a candidate release, not terminal proof. */
  readonly candidatePostReleaseReturnIds: readonly string[];
  /** Reacquire or imprecise matching makes source-order pairing undecidable. */
  readonly interveningAcquireActionIds: readonly string[];
  readonly status: "SOURCE_ORDER_RELEASE_CANDIDATE" | "UNRESOLVED";
  readonly provenance: BehaviorClaimProvenance;
}

/**
 * Reconcile a resource acquire with a later exact-key release ONLY when the
 * two authored sites share region, artifact, document and branch-compatible
 * prerequisites. A second acquire in between prevents an unambiguous pair.
 * Unmatched acquire is not evidence that cleanup is absent in another region.
 */
export function reconcileSourceResourceLifetimes(
  ir: SemanticIr,
): readonly SourceResourceLifetimeCandidate[] {
  const actions = ir.state.resourceActions ?? [];
  const outcomes = ir.execution.outcomes ?? [];
  const exactSameResource = (
    a: typeof actions[number],
    b: typeof actions[number],
  ): boolean =>
    a.precision === "exact" &&
    b.precision === "exact" &&
    a.key !== "*" && b.key !== "*" &&
    a.surface === b.surface && a.key === b.key &&
    a.executionRegionId === b.executionRegionId &&
    sameDocument(a.source, b.source);
  return actions
    .filter(action => action.action === "acquire")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(acquire => {
      const matchingReleases = actions.filter(release =>
        release.action === "release" &&
        exactSameResource(acquire, release) &&
        precedingSourceSite(acquire.source, release.source) &&
        lexicalGuardsCoveredByOutcome(
          acquire.lexicalGuards, release.lexicalGuards) &&
        guardsEqual(acquire.precedenceGuards, release.precedenceGuards));
      const intervening = new Set<string>();
      const candidateReleases = matchingReleases.filter(release => {
        const renewed = actions.filter(other =>
          other.id !== acquire.id && other.action === "acquire" &&
          exactSameResource(acquire, other) &&
          precedingSourceSite(acquire.source, other.source) &&
          precedingSourceSite(other.source, release.source) &&
          !mutuallyExclusiveGuards(other, release));
        for (const item of renewed) intervening.add(item.id);
        return renewed.length === 0;
      });
      const terminalCandidates = outcomes.filter(outcome =>
        candidateReleases.some(release =>
          outcome.executionRegionId === release.executionRegionId &&
          sameDocument(outcome.source, release.source) &&
          precedingSourceSite(release.source, outcome.source) &&
          lexicalGuardsCoveredByOutcome(
            release.lexicalGuards, outcome.lexicalGuards) &&
          guardsEqual(release.precedenceGuards, outcome.precedenceGuards)));
      const candidateReleaseActionIds = [...new Set(
        candidateReleases.map(release => release.id))].sort();
      const candidatePostReleaseReturnIds = [...new Set(
        terminalCandidates.map(outcome => outcome.id))].sort();
      const interveningAcquireActionIds = [...intervening].sort();
      return {
        acquireActionId: acquire.id,
        executionRegionId: acquire.executionRegionId,
        surface: acquire.surface,
        resourceKey: acquire.key,
        candidateReleaseActionIds,
        candidatePostReleaseReturnIds,
        interveningAcquireActionIds,
        status: candidateReleaseActionIds.length > 0
          ? "SOURCE_ORDER_RELEASE_CANDIDATE" as const
          : "UNRESOLVED" as const,
        provenance: {
          kind: "source-inference" as const,
          evidenceCeiling: "inferred" as const,
          evidenceIds: [acquire.id,
            ...matchingReleases.map(x => x.id),
            ...interveningAcquireActionIds,
            ...candidatePostReleaseReturnIds].sort(),
          note: "Only source-site and exact guard compatibility: no runtime acquire/release success, terminal execution, ownership lifetime or arena reset proven.",
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
 * An authored world effect and a return are associated only in the same
 * document/region and when the exact site of the effect precedes the return.
 * A guarded return is UNRESOLVED because current world-effect records do not
 * carry matched branch ancestry. Even an unguarded pairing is not dataflow.
 */
export function reconcileSourceWorldEffectOutcomes(
  ir: SemanticIr,
): readonly SourceWorldEffectOutcomeCandidate[] {
  const effects = ir.execution.worldEffects ?? [];
  return [...(ir.execution.outcomes ?? [])]
    .filter(outcome => effects.some(effect =>
      effect.executionRegionId === outcome.executionRegionId &&
      sameDocument(effect.source, outcome.source)))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(outcome => {
      const preceding = effects.filter(effect =>
        effect.executionRegionId === outcome.executionRegionId &&
        precedingSourceSite(effect.source, outcome.source));
      const precedingWorldEffectIds = [...new Set(
        preceding.map(effect => effect.id))].sort();
      // Source-order alone cannot merge opposite branch arms. The effect's
      // lexical guards must be exact identified ancestors of the return and
      // all necessary preceding early-exit constraints must match.
      const guardCompatibleWorldEffectIds = [...new Set(preceding
        .filter(effect =>
          ((outcome.lexicalGuards?.length ?? 0) === 0 ||
            (effect.lexicalGuards?.length ?? 0) > 0) &&
          lexicalGuardsCoveredByOutcome(
            effect.lexicalGuards, outcome.lexicalGuards) &&
          guardsEqual(effect.precedenceGuards, outcome.precedenceGuards))
        .map(effect => effect.id))].sort();
      const status = guardCompatibleWorldEffectIds.length > 0
        ? "SOURCE_ORDER_CANDIDATE" as const
        : "UNRESOLVED" as const;
      return {
        outcomeId: outcome.id,
        executionRegionId: outcome.executionRegionId,
        precedingWorldEffectIds,
        guardCompatibleWorldEffectIds,
        status,
        reason: status === "SOURCE_ORDER_CANDIDATE"
          ? "Authored effect and return have compatible exact source/branch evidence. Source order does not prove effect success or a gameplay outcome."
          : "A nearby effect does not have exact branch/source evidence compatible with this return.",
        provenance: {
          kind: "source-inference" as const,
          evidenceCeiling: "inferred" as const,
          evidenceIds: [outcome.id, ...precedingWorldEffectIds].sort(),
          note: "Static source proximity only, not an executable BehaviorTransition or successful Minecraft effect.",
        },
      };
    });
}

/**
 * A typed authored state write that might supply a later effect guard read.
 * It is source-order and same-surface evidence, NEVER a proven live state,
 * true from→to transition, reaching definition or Minecraft runtime result.
 */
export interface SourceStateValueHandoff {
  readonly guardReadOperationId: string;
  readonly writeOperationId: string;
  readonly surfaceId: string;
  readonly receiverHint: string;
  readonly authoredValue: string;
  readonly scalarKind: "string" | "number" | "boolean";
  readonly origin: "SOURCE_LOCAL" | "SYNCHRONOUS_CALLER";
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
  readonly resourceAction?: "acquire" | "release";
  readonly resourceKey?: string;
  /** Exact source-site acquire/release/return candidates, never cleanup proof. */
  readonly sourceResourceLifetime?: SourceResourceLifetimeCandidate;
  /** A directly authored dynamic-property literal write (no inferred prior value). */
  readonly authoredStateValue?: {
    readonly surfaceId: string;
    readonly receiverHint: string;
    readonly authoredValue: string;
    readonly scalarKind: "string" | "number" | "boolean";
  };
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
    /** Exact authored call-site guards on THIS candidate path. */
    readonly pathGuards: readonly (SourceEffectSlice["effectGuards"][number] & {
      readonly executionEdgeId: string;
    })[];
    /** Source-ordered, exact state writes in upstream synchronous callers.
     * One list per candidate ingress, never a global def-use claim. */
    readonly candidateCallerStateWriteIds: readonly string[];
    /** Exact value of a compatible caller write, not a proven value at callee read. */
    readonly candidateCallerStateValueHandoffs: readonly SourceStateValueHandoff[];
  }[];
  /** Source-order only; same-surface reads are not proven data dependencies. */
  readonly possiblePrecedingReadIds: readonly string[];
  /**
   * Exact state read CALL sites inside an authored effect guard expression.
   * This is a syntactic precondition input, NOT proof that the read value
   * directly causes the effect or that the branch is satisfiable.
   */
  readonly guardStateReadIds: readonly string[];
  /** Prior same-surface/source-region write sites to those guard reads.
   * These are conservative candidates, never proven reaching definitions. */
  readonly candidateGuardStateWriteIds: readonly string[];
  /** Values authored before guard reads in this same source function. */
  readonly sourceLocalStateValueHandoffs: readonly SourceStateValueHandoff[];
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
  // Bound path states, not globally visited region IDs: different callers
  // are genuinely different ingress candidates and must not be discarded.
  const MAX_PATH_STATES = 256;
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
    resourceAction?: SourceEffectSlice["resourceAction"];
    resourceKey?: string;
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
      resourceAction: action.action, resourceKey: action.key,
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
      lexicalGuards: effect.lexicalGuards,
      precedenceGuards: effect.precedenceGuards,
    })),
  ];
  const stateOutcomeCandidates = reconcileSourceStateOutcomes(ir);
  const resourceOutcomeCandidates = reconcileSourceResourceOutcomes(ir);
  const resourceLifetimes = new Map(
    reconcileSourceResourceLifetimes(ir).map(item => [item.acquireActionId, item]),
  );
  const worldEffectOutcomeCandidates = reconcileSourceWorldEffectOutcomes(ir);
  const stateSurfaces = new Map(ir.state.surfaces.map(s => [s.id, s.ref]));
  const stateReads = ir.state.operations.filter(op => op.operation === "read");
  const stateWrites = ir.state.operations.filter(op => op.operation === "write");
  const operationsById = new Map(ir.state.operations.map(op => [op.id, op]));
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
  return effects.sort((a, b) => a.id.localeCompare(b.id)).map(effect => {
    type Candidate = Omit<
      SourceEffectSlice["candidateIngress"][number],
      "candidateCallerStateWriteIds" | "candidateCallerStateValueHandoffs"
    >;
    const queue: {
      regionId: string;
      path: readonly string[];
      visitedRegionIds: readonly string[];
      depth: number;
    }[] = [{
      regionId: effect.region, path: [],
      visitedRegionIds: [effect.region], depth: 0,
    }];
    const found: Candidate[] = [];
    let truncated = false;
    for (let index = 0; index < queue.length; index += 1) {
      if (index >= MAX_PATH_STATES) {
        truncated = true;
        break;
      }
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
            pathGuards: entryToEffectEdges.flatMap(id => {
              const edge = edgeById.get(id);
              return [
                ...guardSites(edge?.lexicalGuards, "lexical"),
                ...guardSites(edge?.precedenceGuards, "precedence"),
              ].map(guard => ({ ...guard, executionEdgeId: id }));
            }),
          });
        }
      }
      if (current.depth >= MAX_DEPTH) {
        if (parents.length > 0) truncated = true;
        continue;
      }
      for (const edge of parents) {
        if (current.visitedRegionIds.includes(edge.from)) {
          // Cyclic call paths cannot be exhaustively enumerated. Keep
          // other candidate ingresses, but expose this bounded residue.
          truncated = true;
          continue;
        }
        if (queue.length >= MAX_PATH_STATES) {
          truncated = true;
          continue;
        }
        queue.push({
          regionId: edge.from,
          path: [edge.id, ...current.path],
          visitedRegionIds: [...current.visitedRegionIds, edge.from],
          depth: current.depth + 1,
        });
      }
    }
    // Only the AST-spanned state reads INSIDE this effect's authored guard
    // can be treated as guard operands. A read elsewhere in the function
    // is not enough; callback call-path co-placement is not a dependency.
    const guards = [
      ...(effect.lexicalGuards ?? []),
      ...(effect.precedenceGuards ?? []),
    ];
    const guardStateReads = stateReads.filter(read =>
      read.executionRegionId === effect.region &&
      guards.some(guard => sourceRangeContains(guard.source, read.source)));
    const guardStateReadIds = [...new Set(guardStateReads.map(read => read.id))].sort();
    // Strict same-source/surface context: unknown wildcard keys and
    // unspecified or differently spelled receivers cannot establish even
    // this limited candidate prior-definition association.
    const candidateGuardStateWriteIds = [...new Set(guardStateReads.flatMap(read => {
      const surface = stateSurfaces.get(read.surfaceId);
      if (surface?.kind !== "dynamic-property" || surface.key === "*" ||
          !read.targetHint) return [];
      return stateWrites
        .filter(write =>
          write.surfaceId === read.surfaceId &&
          write.executionRegionId === read.executionRegionId &&
          write.targetHint === read.targetHint &&
          precedingSourceSite(write.source, read.source) &&
          lexicalGuardsCoveredByOutcome(write.lexicalGuards, read.lexicalGuards) &&
          guardsEqual(write.precedenceGuards, read.precedenceGuards))
        .map(write => write.id);
    }))].sort();
    // Retain the actual typed scalar literal from the IR operation, not a
    // guessed enum value or phase name. Pair only the guard-read identity
    // and a previously admitted conservative write candidate.
    const valueHandoffs = (
      writeIds: readonly string[],
      origin: SourceStateValueHandoff["origin"],
    ): SourceStateValueHandoff[] =>
      guardStateReads.flatMap(read => writeIds.flatMap(writeId => {
        const write = operationsById.get(writeId);
        const literal = write?.writtenValue;
        if (!write || read.targetHint === undefined ||
            literal?.kind !== "literal" ||
            literal.scalarKind === undefined ||
            write.surfaceId !== read.surfaceId ||
            write.targetHint === undefined ||
            write.targetHint !== read.targetHint ||
            write.source.artifactId !== read.source.artifactId) return [];
        return [{
          guardReadOperationId: read.id,
          writeOperationId: write.id,
          surfaceId: read.surfaceId,
          receiverHint: read.targetHint,
          authoredValue: literal.value,
          scalarKind: literal.scalarKind,
          origin,
        }];
      })).sort((a, b) =>
        a.guardReadOperationId.localeCompare(b.guardReadOperationId) ||
        a.writeOperationId.localeCompare(b.writeOperationId));
    const sourceLocalStateValueHandoffs =
      valueHandoffs(candidateGuardStateWriteIds, "SOURCE_LOCAL");
    // Source-reachable callers may have authored a matching state write
    // before invoking a callee whose guard reads that state. Require a fully
    // resolved SYNCHRONOUS suffix; deferred boundaries cannot establish
    // source-sequenced state lifetime. This is not SSA/reaching-definition.
    const callerStateWriteIds = (path: Candidate): string[] => {
      const candidates = new Set<string>();
      for (const read of guardStateReads) {
        const surface = stateSurfaces.get(read.surfaceId);
        if (surface?.kind !== "dynamic-property" || surface.key === "*" ||
            !read.targetHint) continue;
        for (let index = 0; index < path.executionEdgeIds.length; index += 1) {
          const suffix = path.executionEdgeIds.slice(index)
            .map(id => edgeById.get(id));
          if (suffix.some(step => step?.kind !== "synchronous-call" ||
              step.resolution !== "resolved" || step.to === undefined)) continue;
          const call = suffix[0];
          if (!call || call.source.artifactId !== read.source.artifactId) continue;
          for (const write of stateWrites) {
            if (write.surfaceId !== read.surfaceId ||
                write.executionRegionId !== call.from ||
                write.targetHint !== read.targetHint ||
                !precedingSourceSite(write.source, call.source) ||
                !lexicalGuardsCoveredByOutcome(
                  write.lexicalGuards, call.lexicalGuards) ||
                !guardsEqual(write.precedenceGuards, call.precedenceGuards)) {
              continue;
            }
            candidates.add(write.id);
          }
        }
      }
      return [...candidates].sort();
    };
    const candidateIngress = found.map(path => {
      const writeIds = callerStateWriteIds(path);
      return {
        ...path,
        candidateCallerStateWriteIds: writeIds,
        candidateCallerStateValueHandoffs:
          valueHandoffs(writeIds, "SYNCHRONOUS_CALLER"),
      };
    });
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
        : effect.kind === "world-effect"
          ? worldEffectOutcomeCandidates
              .filter(candidate =>
                candidate.guardCompatibleWorldEffectIds.includes(effect.id))
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
    const authoredOperation = operationsById.get(effect.id);
    const authoredLiteral = authoredOperation?.writtenValue;
    const authoredStateValue =
      effect.kind === "state-mutation" &&
      effect.surfaceId !== undefined &&
      stateSurfaces.get(effect.surfaceId)?.kind === "dynamic-property" &&
      stateSurfaces.get(effect.surfaceId)?.key !== "*" &&
      authoredOperation?.targetHint !== undefined &&
      authoredLiteral?.kind === "literal" &&
      authoredLiteral.scalarKind !== undefined
        ? {
            surfaceId: effect.surfaceId,
            receiverHint: authoredOperation.targetHint,
            authoredValue: authoredLiteral.value,
            scalarKind: authoredLiteral.scalarKind,
          }
        : undefined;
    return {
      effectId: effect.id,
      effectKind: effect.kind,
      ...(effect.worldEffectKind === undefined ? {} : {
        worldEffectKind: effect.worldEffectKind,
        targetLabel: effect.targetLabel,
        evidencePrecision: effect.evidencePrecision,
      }),
      ...(effect.resourceAction === undefined ? {} : {
        resourceAction: effect.resourceAction,
        resourceKey: effect.resourceKey,
      }),
      ...(resourceLifetimes.get(effect.id) === undefined ? {} : {
        sourceResourceLifetime: resourceLifetimes.get(effect.id),
      }),
      ...(authoredStateValue === undefined ? {} : { authoredStateValue }),
      executionRegionId: effect.region,
      sourcePath: effect.source.relativePath,
      status: truncated ? "TRUNCATED" as const :
        found.length > 0 ? "CANDIDATE_INGRESS" as const :
        "NO_KNOWN_INGRESS" as const,
      truncated,
      candidateIngress: candidateIngress.sort((a, b) =>
        a.entryRegionId.localeCompare(b.entryRegionId) ||
        a.executionEdgeIds.join("|").localeCompare(b.executionEdgeIds.join("|"))),
      possiblePrecedingReadIds,
      guardStateReadIds,
      candidateGuardStateWriteIds,
      sourceLocalStateValueHandoffs,
      sourceOrderedOutcomeIds: [...new Set(sourceOrderedOutcomeIds)].sort(),
      effectGuards: [
        ...guardSites(effect.lexicalGuards, "lexical"),
        ...guardSites(effect.precedenceGuards, "precedence"),
      ],
    };
  });
}
