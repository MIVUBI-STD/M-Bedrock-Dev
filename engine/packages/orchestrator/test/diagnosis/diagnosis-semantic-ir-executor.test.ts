import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  planMinimumSufficientAnalysis,
} from "../../../analysis-planner/src/index.js";
import {
  DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY,
  executePlannedDiagnosisStep,
} from "../../../diagnosis-pipeline/src/index.js";
import {
  createSemanticIrDiagnosisExecutor,
} from "../../src/diagnosis/diagnosis-semantic-ir-executor.js";
import {
  createSourceIndexDiagnosisExecutor,
} from "../../src/diagnosis/diagnosis-source-index-executor.js";

describe("semantic-IR diagnosis executor", () => {
  it("reuses source-index output and promotes semantic-model evidence", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-semantic-"),
    );

    try {
      await mkdir(join(root, "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "functions", "start.mcfunction"),
        "scoreboard players set @s ready 1\n",
        "utf8",
      );

      const sourcePlan =
        planMinimumSufficientAnalysis({
          goal: "intent-classification",
          relevantTags: ["session"],
          context: "LOCAL_ARTIFACT",
          capabilities:
            DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
              .capabilities,
        });

      const sourceResult =
        await executePlannedDiagnosisStep({
          plan: sourcePlan,
          context: "LOCAL_ARTIFACT",
          payload: {
            root,
            artifactId: "artifact:test",
            files: [{
              relativePath:
                "functions/start.mcfunction",
              size: 32,
              contentHash: "hash-start",
            }],
          },
          registry: {
            schemaVersion: 1,
            executors: [
              createSourceIndexDiagnosisExecutor(),
            ],
          },
        });

      expect(sourceResult.status).toBe(
        "executed",
      );
      if (sourceResult.status !== "executed") {
        return;
      }

      const semanticPlan =
        planMinimumSufficientAnalysis({
          goal: "semantic-consistency",
          relevantTags: ["session"],
          context: "LOCAL_ARTIFACT",
          availableEvidence:
            sourceResult.evidence,
          completedCapabilityIds: [
            "diagnosis.source-index",
          ],
          capabilities:
            DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
              .capabilities,
        });

      expect(
        semanticPlan.steps[0]
          ?.capabilityId,
      ).toBe("diagnosis.semantic-ir");

      const semanticResult =
        await executePlannedDiagnosisStep({
          plan: semanticPlan,
          context: "LOCAL_ARTIFACT",
          payload: {
            sourceIndex:
              sourceResult.output,
          },
          registry: {
            schemaVersion: 1,
            executors: [
              createSemanticIrDiagnosisExecutor(),
            ],
          },
        });

      expect(semanticResult.status).toBe(
        "executed",
      );
      if (
        semanticResult.status !==
        "executed"
      ) {
        return;
      }

      expect(
        semanticResult.evidence[0],
      ).toMatchObject({
        level: "semantic",
        quality: "usable",
        traits: ["semantic-model"],
      });
      expect(
        semanticResult.evidence[0]
          ?.evidenceIds[0],
      ).toMatch(
        /^semantic-ir:[a-f0-9]{64}$/,
      );
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
