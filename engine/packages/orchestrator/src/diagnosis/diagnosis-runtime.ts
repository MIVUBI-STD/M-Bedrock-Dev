import type {
  FileInventoryEntry,
  StateAuthorityContract,
} from "../../../project-model/src/index.js";
import type {
  AnalysisExecutionContext,
  AnalysisGoal,
} from "../../../analysis-planner/src/index.js";
import type {
  ConstraintProblem,
} from "../../../logic-solver/src/index.js";
import {
  createContradictionProofDiagnosisExecutor,
  runProgressiveDiagnosis,
  type DiagnosisExecutorRegistry,
  type DiagnosisPayloadProvider,
  type ProgressiveDiagnosisRunResult,
} from "../../../diagnosis-pipeline/src/index.js";
import {
  createContractEvidenceDiagnosisExecutor,
  createIntentGroundingDiagnosisExecutor,
} from "./diagnosis-intent-executors.js";
import {
  createSemanticIrDiagnosisExecutor,
} from "./diagnosis-semantic-ir-executor.js";
import {
  createSourceIndexDiagnosisExecutor,
} from "./diagnosis-source-index-executor.js";

export interface BuiltinDiagnosisArtifactContext {
  root: string;
  artifactId: string;
  files: readonly FileInventoryEntry[];
  intentModelId?: string;
  stateAuthorityContracts?: readonly StateAuthorityContract[];
}

export interface BuiltinDiagnosisInput {
  goal: AnalysisGoal;
  relevantTags: readonly string[];
  context: AnalysisExecutionContext;
  artifact: BuiltinDiagnosisArtifactContext;
  contradictionProblem?: ConstraintProblem;
  maxSteps?: number;
}

export interface BuiltinDiagnosisRuntime {
  executorRegistry: DiagnosisExecutorRegistry;
  payloadProvider: DiagnosisPayloadProvider;
}

function requiredOutput(
  outputs: Readonly<Record<string, unknown>>,
  capabilityId: string,
): unknown {
  if (!(capabilityId in outputs)) {
    throw new Error(
      "Diagnosis payload requires missing prior capability output: " +
        capabilityId +
        ".",
    );
  }

  return outputs[capabilityId];
}

export function createBuiltinDiagnosisRuntime(
  artifact: BuiltinDiagnosisArtifactContext,
  options: {
    contradictionProblem?: ConstraintProblem;
  } = {},
): BuiltinDiagnosisRuntime {
  const executorRegistry: DiagnosisExecutorRegistry = {
    schemaVersion: 1,
    executors: [
      createSourceIndexDiagnosisExecutor(),
      createSemanticIrDiagnosisExecutor(),
      createIntentGroundingDiagnosisExecutor(),
      createContractEvidenceDiagnosisExecutor(),
      createContradictionProofDiagnosisExecutor(),
    ],
  };

  const intentModelId =
    artifact.intentModelId ??
    "intent:" + artifact.artifactId;

  const payloadProvider: DiagnosisPayloadProvider = {
    payloadFor(input) {
      switch (input.capabilityId) {
        case "diagnosis.source-index":
          return {
            root: artifact.root,
            artifactId: artifact.artifactId,
            files: artifact.files,
          };

        case "diagnosis.semantic-ir":
          return {
            sourceIndex: requiredOutput(
              input.outputs,
              "diagnosis.source-index",
            ),
            ...(artifact.stateAuthorityContracts === undefined
              ? {}
              : {
                  stateAuthorityContracts:
                    artifact.stateAuthorityContracts,
                }),
          };

        case "diagnosis.intent-grounding":
          return {
            id: intentModelId,
            artifactId: artifact.artifactId,
            sourceIndex: requiredOutput(
              input.outputs,
              "diagnosis.source-index",
            ),
          };

        case "diagnosis.contract-evidence":
          return {
            id: intentModelId,
            root: artifact.root,
            artifactId: artifact.artifactId,
            files: artifact.files,
            sourceIndex: requiredOutput(
              input.outputs,
              "diagnosis.source-index",
            ),
          };

        case "diagnosis.contradiction-proof":
          if (
            options.contradictionProblem ===
            undefined
          ) {
            throw new Error(
              "Formal contradiction proof requires an explicit ConstraintProblem; the built-in runtime never invents one.",
            );
          }

          return {
            problem:
              options.contradictionProblem,
          };

        default:
          throw new Error(
            "No built-in diagnosis payload binding exists for capability " +
              input.capabilityId +
              ".",
          );
      }
    },
  };

  return {
    executorRegistry,
    payloadProvider,
  };
}

export async function runBuiltinDiagnosis(
  input: BuiltinDiagnosisInput,
): Promise<ProgressiveDiagnosisRunResult> {
  const runtime =
    createBuiltinDiagnosisRuntime(
      input.artifact,
      {
        ...(input.contradictionProblem === undefined
          ? {}
          : {
              contradictionProblem:
                input.contradictionProblem,
            }),
      },
    );

  return await runProgressiveDiagnosis({
    goal: input.goal,
    relevantTags: input.relevantTags,
    context: input.context,
    executorRegistry:
      runtime.executorRegistry,
    payloadProvider:
      runtime.payloadProvider,
    ...(input.maxSteps === undefined
      ? {}
      : { maxSteps: input.maxSteps }),
  });
}
