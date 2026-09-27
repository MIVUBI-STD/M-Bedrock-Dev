import {
  planMinimumSufficientAnalysis,
  type AnalysisEvidenceSnapshot,
  type AnalysisExecutionContext,
  type AnalysisGoal,
  type MinimumSufficientAnalysisPlan,
} from "../../analysis-planner/src/index.js";
import {
  DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY,
} from "./profile.js";
import {
  executePlannedDiagnosisStep,
  type DiagnosisExecutorRegistry,
  type DiagnosisPlannedStepExecution,
} from "./execution.js";

export interface DiagnosisPayloadProviderInput {
  capabilityId: string;
  goal: AnalysisGoal;
  context: AnalysisExecutionContext;
  completedCapabilityIds: readonly string[];
  evidence: readonly AnalysisEvidenceSnapshot[];
  outputs: Readonly<Record<string, unknown>>;
}

export interface DiagnosisPayloadProvider {
  payloadFor(
    input: DiagnosisPayloadProviderInput,
  ): unknown | Promise<unknown>;
}

export interface ProgressiveDiagnosisRunInput {
  goal: AnalysisGoal;
  relevantTags: readonly string[];
  context: AnalysisExecutionContext;
  executorRegistry: DiagnosisExecutorRegistry;
  payloadProvider: DiagnosisPayloadProvider;
  initialEvidence?: readonly AnalysisEvidenceSnapshot[];
  initialCompletedCapabilityIds?: readonly string[];
  initialOutputs?: Readonly<Record<string, unknown>>;
  maxSteps?: number;
}

export type ProgressiveDiagnosisRunStatus =
  | "sufficient"
  | "blocked"
  | "requires-runtime-context"
  | "capability-gap";

export interface ProgressiveDiagnosisRunResult {
  status: ProgressiveDiagnosisRunStatus;
  goal: AnalysisGoal;
  finalPlan: MinimumSufficientAnalysisPlan;
  completedCapabilityIds: readonly string[];
  evidence: readonly AnalysisEvidenceSnapshot[];
  outputs: Readonly<Record<string, unknown>>;
  executions: readonly DiagnosisPlannedStepExecution[];
  reasons: readonly string[];
}

function normalizedCompleted(
  values: readonly string[] | undefined,
): string[] {
  return [...new Set(values ?? [])].sort();
}

function planFor(
  input: ProgressiveDiagnosisRunInput,
  evidence: readonly AnalysisEvidenceSnapshot[],
  completedCapabilityIds: readonly string[],
): MinimumSufficientAnalysisPlan {
  return planMinimumSufficientAnalysis({
    goal: input.goal,
    relevantTags: input.relevantTags,
    context: input.context,
    availableEvidence: evidence,
    completedCapabilityIds,
    capabilities:
      DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
        .capabilities,
  });
}

export async function runProgressiveDiagnosis(
  input: ProgressiveDiagnosisRunInput,
): Promise<ProgressiveDiagnosisRunResult> {
  const evidence = [
    ...(input.initialEvidence ?? []),
  ];
  const completed =
    normalizedCompleted(
      input.initialCompletedCapabilityIds,
    );
  const outputs: Record<string, unknown> = {
    ...(input.initialOutputs ?? {}),
  };
  const executions:
    DiagnosisPlannedStepExecution[] = [];

  const maxSteps =
    input.maxSteps ??
    (
      DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
        .capabilities.length + 1
    );

  if (
    !Number.isInteger(maxSteps) ||
    maxSteps < 0
  ) {
    throw new Error(
      "Progressive diagnosis maxSteps must be a non-negative integer.",
    );
  }

  for (
    let stepIndex = 0;
    stepIndex <= maxSteps;
    stepIndex += 1
  ) {
    const plan = planFor(
      input,
      evidence,
      completed,
    );

    if (
      plan.disposition ===
      "stop-sufficient"
    ) {
      return {
        status: "sufficient",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [
          "Minimum sufficient evidence reached.",
          ...plan.reasons,
        ],
      };
    }

    if (
      plan.disposition ===
      "requires-runtime-context"
    ) {
      return {
        status:
          "requires-runtime-context",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [...plan.reasons],
      };
    }

    if (
      plan.disposition ===
      "capability-gap"
    ) {
      return {
        status: "capability-gap",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [...plan.reasons],
      };
    }

    if (stepIndex === maxSteps) {
      return {
        status: "blocked",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [
          "Progressive diagnosis step limit reached before sufficient evidence was established.",
        ],
      };
    }

    const capabilityId =
      plan.steps[0]?.capabilityId;

    if (!capabilityId) {
      return {
        status: "blocked",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [
          "Execute plan did not contain a next capability id.",
        ],
      };
    }

    let payload: unknown;
    try {
      payload =
        await input.payloadProvider
          .payloadFor({
            capabilityId,
            goal: input.goal,
            context: input.context,
            completedCapabilityIds:
              [...completed].sort(),
            evidence: [...evidence],
            outputs: { ...outputs },
          });
    } catch (error) {
      return {
        status: "blocked",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [
          "Diagnosis payload provider failed for " +
            capabilityId +
            ".",
          error instanceof Error
            ? error.message
            : String(error),
        ],
      };
    }

    const execution =
      await executePlannedDiagnosisStep({
        plan,
        context: input.context,
        payload,
        registry:
          input.executorRegistry,
      });

    executions.push(execution);

    if (
      execution.status === "blocked"
    ) {
      if (
        execution.output !== undefined
      ) {
        outputs[capabilityId] =
          execution.output;
      }

      return {
        status: "blocked",
        goal: input.goal,
        finalPlan: plan,
        completedCapabilityIds:
          [...completed].sort(),
        evidence: [...evidence],
        outputs: { ...outputs },
        executions,
        reasons: [
          "Diagnosis capability execution was blocked.",
          ...execution.reasons,
        ],
      };
    }

    evidence.push(
      ...execution.evidence,
    );
    outputs[capabilityId] =
      execution.output;

    if (!completed.includes(capabilityId)) {
      completed.push(capabilityId);
      completed.sort();
    }
  }

  throw new Error(
    "Progressive diagnosis loop terminated unexpectedly.",
  );
}
