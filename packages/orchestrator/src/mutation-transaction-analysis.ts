import type { ParsedFunction, ParsedFunctionCommand } from "../../../analyzers/functions/src/types.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import {
  parseBlockVerificationSemantics,
  type BlockVerificationSemantics,
} from "../../../analyzers/commands/src/verification-semantics.js";
import type { Coordinate3 } from "../../../analyzers/commands/src/coordinates.js";
import type { derivePlacementProofs, PlacementBounds } from "./structure-proof-analysis.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import {
  mutationDependentActionLabel,
  type MutationDependentActionContract,
} from "../../project-model/src/mutation-dependent-action.js";

export type MutationTransactionStepKind =
  | "apply"
  | "verify"
  | "dependent-action"
  | "unresolved-call"
  | "recursive-call"
  | "depth-limit";

export interface MutationTransactionStep {
  kind: MutationTransactionStepKind;
  functionId: string;
  source: SourceRef;
  command: string;
  detail?: string;
  verification?: BlockVerificationSemantics;
  mutationBounds?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export type MutationOrderingStatus =
  | "verified-before-dependent"
  | "dependent-before-verification"
  | "verification-unresolved"
  | "no-dependent-action";

export interface MutationTransactionAssessment {
  id: string;
  rootFunctionId: string;
  applyStep: MutationTransactionStep;
  dependentStep?: MutationTransactionStep;
  verificationStep?: MutationTransactionStep;
  status: MutationOrderingStatus;
  barriers: MutationTransactionStep[];
}

function operationId(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

function directFunctionTargets(command: ParsedFunctionCommand): string[] {
  return flattenCommandEffects(command.analysis)
    .filter((effect): effect is Extract<
      ReturnType<typeof flattenCommandEffects>[number],
      { kind: "function-call" }
    > => effect.kind === "function-call")
    .map((effect) => effect.target);
}

function normalizedBounds(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  return {
    min: {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      z: Math.min(a.z, b.z),
    },
    max: {
      x: Math.max(a.x, b.x),
      y: Math.max(a.y, b.y),
      z: Math.max(a.z, b.z),
    },
  };
}

function directMutationBounds(
  effects: readonly ReturnType<typeof flattenCommandEffects>[number][],
): MutationTransactionStep["mutationBounds"] | undefined {
  for (const effect of effects) {
    if (effect.kind === "setblock") {
      const point = absolutePosition(effect.position);
      if (point) return normalizedBounds(point, point);
    }

    if (effect.kind === "fill") {
      const from = absolutePosition(effect.region.from);
      const to = absolutePosition(effect.region.to);
      if (from && to) return normalizedBounds(from, to);
    }

    if (effect.kind === "clone") {
      const from = absolutePosition(effect.sourceRegion.from);
      const to = absolutePosition(effect.sourceRegion.to);
      const destination = absolutePosition(effect.destination);
      if (!from || !to || !destination) continue;

      const size = {
        x: Math.abs(to.x - from.x) + 1,
        y: Math.abs(to.y - from.y) + 1,
        z: Math.abs(to.z - from.z) + 1,
      };
      return normalizedBounds(
        destination,
        {
          x: destination.x + size.x - 1,
          y: destination.y + size.y - 1,
          z: destination.z + size.z - 1,
        },
      );
    }
  }
  return undefined;
}

function matchingDependentContract(
  effect: ReturnType<typeof flattenCommandEffects>[number],
  contracts: readonly MutationDependentActionContract[],
): MutationDependentActionContract | undefined {
  return contracts.find((contract) => {
    if (
      contract.kind === "function-call" &&
      effect.kind === "function-call"
    ) {
      return contract.functionTarget === effect.target;
    }

    if (
      contract.kind === "scoreboard-write" &&
      effect.kind === "scoreboard-access" &&
      (
        effect.access === "write" ||
        effect.access === "read-write"
      )
    ) {
      return contract.objective === effect.objective;
    }

    if (
      contract.kind === "tag-write" &&
      effect.kind === "tag-mutation"
    ) {
      return contract.tag === effect.tag;
    }

    if (
      contract.kind === "entity-event" &&
      effect.kind === "entity-event-trigger"
    ) {
      return contract.event === effect.event;
    }

    if (
      contract.kind === "dialogue" &&
      effect.kind === "dialogue"
    ) {
      return contract.dialogueScene === effect.sceneName;
    }

    return false;
  });
}

function dependentAction(
  effects: readonly ReturnType<typeof flattenCommandEffects>[number][],
  contracts: readonly MutationDependentActionContract[],
): {
  detail: string;
  contract?: MutationDependentActionContract;
} | undefined {
  if (effects.some((effect) => effect.kind === "teleport")) {
    return { detail: "teleport" };
  }
  if (effects.some((effect) => effect.kind === "entity-spawn")) {
    return { detail: "entity-spawn" };
  }

  for (const effect of effects) {
    const contract = matchingDependentContract(effect, contracts);
    if (contract) {
      return {
        detail: mutationDependentActionLabel(contract),
        contract,
      };
    }
  }

  return undefined;
}

function isDependentFunctionTarget(
  target: string,
  contracts: readonly MutationDependentActionContract[],
): boolean {
  return contracts.some(
    (contract) =>
      contract.kind === "function-call" &&
      contract.functionTarget === target,
  );
}

function commandSteps(
  functionId: string,
  command: ParsedFunctionCommand,
  dependentContracts: readonly MutationDependentActionContract[],
): MutationTransactionStep[] {
  const output: MutationTransactionStep[] = [];
  const verification = parseBlockVerificationSemantics(command.raw);

  // An execute-if-block verification gates its nested command, so it is
  // deliberately placed before any nested dependent action/call expansion.
  if (verification?.gatesDependentCommand) {
    output.push({
      kind: "verify",
      functionId,
      source: command.source,
      command: command.raw,
      detail: verification.expectedBlock,
      verification,
    });
  }

  const effects = flattenCommandEffects(command.analysis);
  const hasApply = effects.some((effect) =>
    effect.kind === "structure-load" ||
    effect.kind === "fill" ||
    effect.kind === "setblock" ||
    effect.kind === "clone"
  );
  if (hasApply) {
    const mutationBounds = directMutationBounds(effects);
    output.push({
      kind: "apply",
      functionId,
      source: command.source,
      command: command.raw,
      ...(mutationBounds ? { mutationBounds } : {}),
    });
  }

  const dependent = dependentAction(
    effects,
    dependentContracts,
  );
  if (dependent) {
    output.push({
      kind: "dependent-action",
      functionId,
      source: command.source,
      command: command.raw,
      detail: dependent.detail,
    });
  }

  return output;
}

function expandFunctionTimeline(
  functionId: string,
  functions: ReadonlyMap<string, ParsedFunction>,
  stack: readonly string[],
  depth: number,
  maxDepth: number,
  dependentContracts: readonly MutationDependentActionContract[],
): MutationTransactionStep[] {
  const fn = functions.get(functionId);
  if (!fn) return [];

  const output: MutationTransactionStep[] = [];
  if (depth > maxDepth) {
    output.push({
      kind: "depth-limit",
      functionId,
      source: fn.source,
      command: "<function-depth-limit>",
      detail: String(maxDepth),
    });
    return output;
  }

  for (const command of fn.commands) {
    const verification = parseBlockVerificationSemantics(command.raw);
    const steps = commandSteps(
      functionId,
      command,
      dependentContracts,
    );

    // For a gated execute command, verification must happen before the nested
    // function/teleport. Emit only the verify phase now.
    if (verification?.gatesDependentCommand) {
      output.push(...steps.filter((step) => step.kind === "verify"));
    } else {
      output.push(...steps.filter((step) => step.kind !== "dependent-action"));
    }

    const targets = directFunctionTargets(command);
    for (const target of targets) {
      if (
        isDependentFunctionTarget(
          target,
          dependentContracts,
        )
      ) {
        continue;
      }
      if (stack.includes(target) || target === functionId) {
        output.push({
          kind: "recursive-call",
          functionId,
          source: command.source,
          command: command.raw,
          detail: target,
        });
        continue;
      }

      if (!functions.has(target)) {
        output.push({
          kind: "unresolved-call",
          functionId,
          source: command.source,
          command: command.raw,
          detail: target,
        });
        continue;
      }

      output.push(...expandFunctionTimeline(
        target,
        functions,
        [...stack, functionId],
        depth + 1,
        maxDepth,
        dependentContracts,
      ));
    }

    // Nested direct teleport in execute-if-block is safely after verification.
    output.push(...steps.filter((step) => step.kind === "dependent-action"));

    if (!verification?.gatesDependentCommand) {
      // Non-gated verification never qualifies as transaction verification.
      // Nothing else to emit here.
    }
  }

  return output;
}

function absolutePosition(
  coordinate: Coordinate3 | undefined,
): { x: number; y: number; z: number } | undefined {
  if (!coordinate) return undefined;
  if (
    coordinate.x.mode !== "absolute" ||
    coordinate.y.mode !== "absolute" ||
    coordinate.z.mode !== "absolute"
  ) return undefined;
  return {
    x: coordinate.x.value,
    y: coordinate.y.value,
    z: coordinate.z.value,
  };
}

function insideBounds(
  bounds: Pick<PlacementBounds, "min" | "max">,
  position: { x: number; y: number; z: number },
): boolean {
  return (
    position.x >= bounds.min.x &&
    position.x <= bounds.max.x &&
    position.y >= bounds.min.y &&
    position.y <= bounds.max.y &&
    position.z >= bounds.min.z &&
    position.z <= bounds.max.z
  );
}

type StructurePlacementProofs = ReturnType<typeof derivePlacementProofs>;

function trustedVerification(
  apply: MutationTransactionStep,
  candidate: MutationTransactionStep,
  proofs: StructurePlacementProofs | undefined,
): boolean {
  if (candidate.kind !== "verify" || !candidate.verification) return false;
  const line = apply.source.range?.lineStart;
  const structureBounds = line === undefined
    ? undefined
    : proofs?.bounds.get(apply.functionId + ":" + line);
  const bounds = apply.mutationBounds ?? structureBounds;
  if (!bounds) return false;

  const position = absolutePosition(candidate.verification.position);
  return position !== undefined && insideBounds(bounds, position);
}

function rootFunctions(functions: readonly ParsedFunction[]): string[] {
  const ids = new Set(functions.map((fn) => fn.identifier));
  const called = new Set<string>();

  for (const fn of functions) {
    for (const command of fn.commands) {
      for (const target of directFunctionTargets(command)) {
        if (ids.has(target)) called.add(target);
      }
    }
  }

  const roots = functions
    .map((fn) => fn.identifier)
    .filter((id) => !called.has(id))
    .sort();

  // Fully cyclic graphs have no natural root; keep deterministic coverage.
  return roots.length > 0
    ? roots
    : functions.map((fn) => fn.identifier).sort();
}

export function analyzeMutationTransactionOrdering(
  functions: readonly ParsedFunction[],
  proofs?: StructurePlacementProofs,
  dependentContractsOrMaxDepth:
    | readonly MutationDependentActionContract[]
    | number = [],
  maxDepth = 16,
): {
  timelines: ReadonlyMap<string, readonly MutationTransactionStep[]>;
  assessments: MutationTransactionAssessment[];
} {
  const dependentContracts =
    typeof dependentContractsOrMaxDepth === "number"
      ? []
      : dependentContractsOrMaxDepth;
  const effectiveMaxDepth =
    typeof dependentContractsOrMaxDepth === "number"
      ? dependentContractsOrMaxDepth
      : maxDepth;

  const map = new Map(functions.map((fn) => [fn.identifier, fn]));
  const timelines = new Map<string, readonly MutationTransactionStep[]>();
  const assessments: MutationTransactionAssessment[] = [];

  for (const root of rootFunctions(functions)) {
    const timeline = expandFunctionTimeline(
      root,
      map,
      [],
      0,
      effectiveMaxDepth,
      dependentContracts,
    );
    timelines.set(root, timeline);

    for (let index = 0; index < timeline.length; index += 1) {
      const apply = timeline[index];
      if (!apply || apply.kind !== "apply") continue;

      const segment: MutationTransactionStep[] = [];
      for (let cursor = index + 1; cursor < timeline.length; cursor += 1) {
        const step = timeline[cursor]!;
        if (step.kind === "apply") break;
        segment.push(step);
      }

      const dependentIndex = segment.findIndex(
        (step) => step.kind === "dependent-action",
      );
      const dependent = dependentIndex >= 0
        ? segment[dependentIndex]
        : undefined;

      if (!dependent) {
        const barriers = segment.filter((step) =>
          step.kind === "unresolved-call" ||
          step.kind === "recursive-call" ||
          step.kind === "depth-limit"
        );
        assessments.push({
          id: "mutation:" + root + ":" + operationId(apply.source),
          rootFunctionId: root,
          applyStep: apply,
          status: barriers.length > 0
            ? "verification-unresolved"
            : "no-dependent-action",
          barriers,
        });
        continue;
      }

      const beforeDependent = segment.slice(0, dependentIndex);
      const barriers = beforeDependent.filter((step) =>
        step.kind === "unresolved-call" ||
        step.kind === "recursive-call" ||
        step.kind === "depth-limit"
      );
      const verifyBefore = beforeDependent.find(
        (step) => trustedVerification(apply, step, proofs),
      );
      const verifyAfter = segment
        .slice(dependentIndex + 1)
        .find((step) => trustedVerification(apply, step, proofs));

      let status: MutationOrderingStatus = "verification-unresolved";
      let verificationStep: MutationTransactionStep | undefined;

      if (barriers.length === 0 && verifyBefore) {
        status = "verified-before-dependent";
        verificationStep = verifyBefore;
      } else if (barriers.length === 0 && verifyAfter) {
        status = "dependent-before-verification";
        verificationStep = verifyAfter;
      }

      assessments.push({
        id: "mutation:" + root + ":" + operationId(apply.source),
        rootFunctionId: root,
        applyStep: apply,
        dependentStep: dependent,
        ...(verificationStep === undefined ? {} : { verificationStep }),
        status,
        barriers,
      });
    }
  }

  return { timelines, assessments };
}

export function mutationTransactionRuntimeEvidence(
  assessments: readonly MutationTransactionAssessment[],
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [];

  for (const item of assessments) {
    if (
      item.status === "verification-unresolved" &&
      item.barriers.length > 0
    ) {
      records.push({
        predicate: "transaction-order-proof-incomplete",
        state: "present",
        confidence: "derived",
        scope: { operationId: item.id },
        sourceRefs: [
          item.applyStep.source,
          ...item.barriers.map((barrier) => barrier.source),
        ],
        note:
          "Function transaction ordering is blocked by unresolved, recursive, or depth-limited calls.",
      });
    }

    if (!item.dependentStep) continue;
    const scope = {
      operationId:
        "mutation:" +
        item.rootFunctionId +
        ":" +
        operationId(item.applyStep.source),
    };

    records.push({
      predicate: "mutation-dependent-action",
      state: "present",
      confidence: "derived",
      scope,
      sourceRefs: [item.applyStep.source, item.dependentStep.source],
      note:
        item.applyStep.functionId +
        " -> " +
        item.dependentStep.functionId +
        ":" +
        (item.dependentStep.detail ?? item.dependentStep.kind),
    });

    if (item.status === "verified-before-dependent") {
      records.push({
        predicate: "verification-before-dependent-action",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyStep.source,
          item.verificationStep!.source,
          item.dependentStep.source,
        ],
      });
    } else if (item.status === "dependent-before-verification") {
      records.push({
        predicate: "verification-before-dependent-action",
        state: "absent",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyStep.source,
          item.dependentStep.source,
          item.verificationStep!.source,
        ],
        note: "A known verification occurs only after the dependent action.",
      });
    }
  }

  return records;
}
