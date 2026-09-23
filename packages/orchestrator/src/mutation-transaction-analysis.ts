import type { ParsedFunction, ParsedFunctionCommand } from "../../../analyzers/functions/src/types.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import { parseBlockVerificationSemantics } from "../../../analyzers/commands/src/verification-semantics.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";

export type MutationTransactionStepKind =
  | "apply"
  | "verify"
  | "dependent-action"
  | "unresolved-call"
  | "recursive-call";

export interface MutationTransactionStep {
  kind: MutationTransactionStepKind;
  functionId: string;
  source: SourceRef;
  command: string;
  detail?: string;
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

function commandSteps(
  functionId: string,
  command: ParsedFunctionCommand,
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
    output.push({
      kind: "apply",
      functionId,
      source: command.source,
      command: command.raw,
    });
  }

  const hasDependentAction = effects.some((effect) =>
    effect.kind === "teleport"
  );
  if (hasDependentAction) {
    output.push({
      kind: "dependent-action",
      functionId,
      source: command.source,
      command: command.raw,
      detail: "teleport",
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
): MutationTransactionStep[] {
  const fn = functions.get(functionId);
  if (!fn) return [];
  if (depth > maxDepth) return [];

  const output: MutationTransactionStep[] = [];

  for (const command of fn.commands) {
    const verification = parseBlockVerificationSemantics(command.raw);
    const steps = commandSteps(functionId, command);

    // For a gated execute command, verification must happen before the nested
    // function/teleport. Emit only the verify phase now.
    if (verification?.gatesDependentCommand) {
      output.push(...steps.filter((step) => step.kind === "verify"));
    } else {
      output.push(...steps.filter((step) => step.kind !== "dependent-action"));
    }

    const targets = directFunctionTargets(command);
    for (const target of targets) {
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
  maxDepth = 16,
): {
  timelines: ReadonlyMap<string, readonly MutationTransactionStep[]>;
  assessments: MutationTransactionAssessment[];
} {
  const map = new Map(functions.map((fn) => [fn.identifier, fn]));
  const timelines = new Map<string, readonly MutationTransactionStep[]>();
  const assessments: MutationTransactionAssessment[] = [];

  for (const root of rootFunctions(functions)) {
    const timeline = expandFunctionTimeline(root, map, [], 0, maxDepth);
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
        assessments.push({
          id: "mutation:" + operationId(apply.source),
          rootFunctionId: root,
          applyStep: apply,
          status: "no-dependent-action",
          barriers: segment.filter((step) =>
            step.kind === "unresolved-call" ||
            step.kind === "recursive-call"
          ),
        });
        continue;
      }

      const beforeDependent = segment.slice(0, dependentIndex);
      const barriers = beforeDependent.filter((step) =>
        step.kind === "unresolved-call" ||
        step.kind === "recursive-call"
      );
      const verifyBefore = beforeDependent.find(
        (step) => step.kind === "verify",
      );
      const verifyAfter = segment
        .slice(dependentIndex + 1)
        .find((step) => step.kind === "verify");

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
        id: "mutation:" + operationId(apply.source),
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
    if (!item.dependentStep) continue;
    const scope = { operationId: operationId(item.applyStep.source) };

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
