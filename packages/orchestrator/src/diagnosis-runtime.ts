import type {
  FileInventoryEntry,
  StateAuthorityContract,
} from "../../project-model/src/index.js";
import type {
  AnalysisExecutionContext,
  AnalysisGoal,
} from "../../analysis-planner/src/index.js";
import {
  runProgressiveDiagnosis,
  type DiagnosisExecutorRegistry,
  type DiagnosisPayloadProvider,
  type ProgressiveDiagnosisRunResult,
} from "../../diagnosis-pipeline/src/index.js";
import {
  createAuthoredIntentDiagnosisExecutor,
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
): BuiltinDiagnosisRuntime {
  const executorRegistry: DiagnosisExecutorRegistry = {
    schemaVersion: 1,
    executors: [
      createSourceIndexDiagnosisExecutor(),
      createSemanticIrDiagnosisExecutor(),
      createIntentGroundingDiagnosisExecutor(),
      createAuthoredIntentDiagnosisExecutor(),
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

        case "diagnosis.authored-intent":
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
