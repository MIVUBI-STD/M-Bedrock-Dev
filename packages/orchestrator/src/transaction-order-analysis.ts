import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import { parseBlockVerificationSemantics } from "../../../analyzers/commands/src/verification-semantics.js";
import { parseTickingAreaSemantics } from "../../../analyzers/commands/src/tickingarea-semantics.js";
import { parseScheduleAreaLoadedSemantics } from "../../../analyzers/commands/src/schedule-semantics.js";
import type {
  ParsedFunction,
  ParsedFunctionCommand,
} from "../../../analyzers/functions/src/types.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";

export type TransactionStage =
  | "PREPARE"
  | "APPLY"
  | "VERIFY"
  | "DEPENDENT_WORK"
  | "CALL_UNRESOLVED"
  | "CALL_CYCLE"
  | "DEPTH_LIMIT";

export interface TransactionTraceStep {
  index: number;
  stage: TransactionStage;
  functionId: string;
  source: SourceRef;
  command?: string;
  detail?: string;
  callStack: readonly string[];
}

export interface TransactionTrace {
  rootFunctionId: string;
  steps: readonly TransactionTraceStep[];
  callsInlined: number;
  unresolvedCalls: number;
  cycles: number;
  depthLimited: boolean;
}

export interface TransactionOrderingFinding {
  kind:
    | "dependent-before-verify"
    | "apply-without-verify"
    | "unresolved-call-after-apply"
    | "call-cycle-after-apply"
    | "depth-limit-after-apply";
  rootFunctionId: string;
  applyStep: TransactionTraceStep;
  evidenceStep?: TransactionTraceStep;
  message: string;
}

function stageForCommand(command: ParsedFunctionCommand): TransactionStage[] {
  const stages: TransactionStage[] = [];
  const ticking = parseTickingAreaSemantics(command.raw);
  const schedule = parseScheduleAreaLoadedSemantics(command.raw);
  if (
    ticking?.action === "add-circle" ||
    ticking?.action === "add-rectangle" ||
    ticking?.action === "preload" ||
    schedule !== undefined
  ) {
    stages.push("PREPARE");
  }

  const effects = flattenCommandEffects(command.analysis);
  if (effects.some((effect) =>
    effect.kind === "structure-load" ||
    effect.kind === "fill" ||
    effect.kind === "setblock" ||
    effect.kind === "clone" ||
    effect.kind === "entity-event-trigger"
  )) {
    stages.push("APPLY");
  }

  const verification = parseBlockVerificationSemantics(command.raw);
  if (verification?.gatesDependentCommand === true) {
    stages.push("VERIFY");
  }

  if (effects.some((effect) =>
    effect.kind === "teleport" ||
    effect.kind === "dialogue"
  )) {
    stages.push("DEPENDENT_WORK");
  }

  const verb = command.raw.trim().replace(/^\//, "").split(/\s+/)[0]?.toLowerCase();
  if (
    verb === "summon" ||
    verb === "give" ||
    verb === "playsound" ||
    verb === "camera"
  ) {
    stages.push("DEPENDENT_WORK");
  }

  return [...new Set(stages)];
}

function functionCalls(command: ParsedFunctionCommand): string[] {
  return flattenCommandEffects(command.analysis)
    .filter((effect): effect is Extract<
      ReturnType<typeof flattenCommandEffects>[number],
      { kind: "function-call" }
    > => effect.kind === "function-call")
    .map((effect) => effect.target);
}

export function traceFunctionTransactionOrder(
  functions: readonly ParsedFunction[],
  rootFunctionId: string,
  maxDepth = 8,
): TransactionTrace {
  const byId = new Map(functions.map((fn) => [fn.identifier, fn]));
  const steps: TransactionTraceStep[] = [];
  let callsInlined = 0;
  let unresolvedCalls = 0;
  let cycles = 0;
  let depthLimited = false;

  const push = (
    stage: TransactionStage,
    fn: ParsedFunction,
    command: ParsedFunctionCommand | undefined,
    callStack: readonly string[],
    detail?: string,
  ): void => {
    steps.push({
      index: steps.length,
      stage,
      functionId: fn.identifier,
      source: command?.source ?? fn.source,
      ...(command === undefined ? {} : { command: command.raw }),
      ...(detail === undefined ? {} : { detail }),
      callStack: [...callStack],
    });
  };

  const visit = (
    fn: ParsedFunction,
    depth: number,
    stack: readonly string[],
  ): void => {
    if (depth > maxDepth) {
      depthLimited = true;
      push("DEPTH_LIMIT", fn, undefined, stack, "Maximum function inline depth exceeded.");
      return;
    }

    const nextStack = [...stack, fn.identifier];

    for (const command of fn.commands) {
      for (const stage of stageForCommand(command)) {
        push(stage, fn, command, nextStack);
      }

      for (const target of functionCalls(command)) {
        if (nextStack.includes(target)) {
          cycles += 1;
          push("CALL_CYCLE", fn, command, nextStack, target);
          continue;
        }

        const called = byId.get(target);
        if (!called) {
          unresolvedCalls += 1;
          push("CALL_UNRESOLVED", fn, command, nextStack, target);
          continue;
        }

        callsInlined += 1;
        visit(called, depth + 1, nextStack);
      }
    }
  };

  const root = byId.get(rootFunctionId);
  if (root) visit(root, 0, []);

  return {
    rootFunctionId,
    steps,
    callsInlined,
    unresolvedCalls,
    cycles,
    depthLimited,
  };
}

export function analyzeTransactionOrdering(
  trace: TransactionTrace,
): TransactionOrderingFinding[] {
  const findings: TransactionOrderingFinding[] = [];
  const applySteps = trace.steps.filter((step) => step.stage === "APPLY");

  for (const apply of applySteps) {
    const following = trace.steps.filter((step) => step.index > apply.index);
    const nextApplyIndex = following.find((step) => step.stage === "APPLY")?.index;
    const window = nextApplyIndex === undefined
      ? following
      : following.filter((step) => step.index < nextApplyIndex);

    const verify = window.find((step) => step.stage === "VERIFY");
    const dependent = window.find((step) => step.stage === "DEPENDENT_WORK");
    const unresolved = window.find((step) => step.stage === "CALL_UNRESOLVED");
    const cycle = window.find((step) => step.stage === "CALL_CYCLE");
    const depth = window.find((step) => step.stage === "DEPTH_LIMIT");

    if (dependent && (!verify || dependent.index < verify.index)) {
      findings.push({
        kind: "dependent-before-verify",
        rootFunctionId: trace.rootFunctionId,
        applyStep: apply,
        evidenceStep: dependent,
        message:
          "Dependent gameplay work occurs after mutation APPLY but before a proven VERIFY step.",
      });
      continue;
    }

    if (unresolved && !verify) {
      findings.push({
        kind: "unresolved-call-after-apply",
        rootFunctionId: trace.rootFunctionId,
        applyStep: apply,
        evidenceStep: unresolved,
        message:
          "Mutation APPLY reaches an unresolved function call before verification can be proven.",
      });
      continue;
    }

    if (cycle && !verify) {
      findings.push({
        kind: "call-cycle-after-apply",
        rootFunctionId: trace.rootFunctionId,
        applyStep: apply,
        evidenceStep: cycle,
        message:
          "Mutation APPLY enters a recursive function cycle before verification can be proven.",
      });
      continue;
    }

    if (depth && !verify) {
      findings.push({
        kind: "depth-limit-after-apply",
        rootFunctionId: trace.rootFunctionId,
        applyStep: apply,
        evidenceStep: depth,
        message:
          "Mutation APPLY exceeds bounded call-trace depth before verification can be proven.",
      });
      continue;
    }

    if (!verify) {
      findings.push({
        kind: "apply-without-verify",
        rootFunctionId: trace.rootFunctionId,
        applyStep: apply,
        message:
          "Mutation APPLY has no proven VERIFY step before the next mutation boundary/end of trace.",
      });
    }
  }

  return findings;
}
