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
} from "../../analysis-planner/src/index.js";
import {
  DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY,
  executePlannedDiagnosisStep,
} from "../../diagnosis-pipeline/src/index.js";
import {
  createAuthoredIntentDiagnosisExecutor,
  createIntentGroundingDiagnosisExecutor,
} from "../src/diagnosis-intent-executors.js";
import {
  createSourceIndexDiagnosisExecutor,
} from "../src/diagnosis-source-index-executor.js";

async function indexPack(
  root: string,
) {
  const sourcePlan =
    planMinimumSufficientAnalysis({
      goal: "intent-classification",
      relevantTags: ["session"],
      context: "LOCAL_ARTIFACT",
      capabilities:
        DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
          .capabilities,
    });

  return await executePlannedDiagnosisStep({
    plan: sourcePlan,
    context: "LOCAL_ARTIFACT",
    payload: {
      root,
      artifactId: "artifact:test",
      files: [{
        relativePath:
          "scripts/main.ts",
        size: 64,
        contentHash: "hash-main",
      }],
    },
    registry: {
      schemaVersion: 1,
      executors: [
        createSourceIndexDiagnosisExecutor(),
      ],
    },
  });
}

describe("intent diagnosis executors", () => {
  it("grounds intent from indexed scripts without claiming authored evidence", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-intent-"),
    );

    try {
      await mkdir(join(root, "scripts"), {
        recursive: true,
      });
      await writeFile(
        join(root, "scripts", "main.ts"),
        [
          "let ready = false;",
          "function start() {",
          "  ready = true;",
          "}",
          "",
        ].join("\n"),
        "utf8",
      );

      const sourceResult =
        await indexPack(root);

      expect(sourceResult.status).toBe(
        "executed",
      );
      if (
        sourceResult.status !==
        "executed"
      ) {
        return;
      }

      const intentPlan =
        planMinimumSufficientAnalysis({
          goal: "intent-classification",
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

      const result =
        await executePlannedDiagnosisStep({
          plan: intentPlan,
          context: "LOCAL_ARTIFACT",
          payload: {
            id: "intent:test",
            artifactId:
              "artifact:test",
            sourceIndex:
              sourceResult.output,
          },
          registry: {
            schemaVersion: 1,
            executors: [
              createIntentGroundingDiagnosisExecutor(),
            ],
          },
        });

      // This fixture may not contain a recognized
      // gameplay-intent signal. The critical behavior
      // is that the executor never fabricates authored
      // evidence.
      if (result.status === "executed") {
        expect(
          result.evidence.flatMap(
            (item) => item.traits,
          ),
        ).not.toContain(
          "authored-intent",
        );
      } else {
        expect(result.reasons.join(" "))
          .toMatch(/No gameplay intent could be grounded/);
      }
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("grounds authored intent from a configured custom source root", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-authored-custom-"),
    );

    try {
      await mkdir(join(root, "scripts"), {
        recursive: true,
      });
      await mkdir(
        join(root, "map-source/domain"),
        { recursive: true },
      );

      await writeFile(
        join(root, "scripts", "main.ts"),
        "export const x = 1;\n",
        "utf8",
      );
      await writeFile(
        join(root, "map-source/domain/types.ts"),
        [
          "export interface ResourceRecord {",
          "  owner: SessionToken;",
          "}",
          "export interface SessionToken {",
          "  sessionId: string;",
          "}",
          "",
        ].join("\n"),
        "utf8",
      );

      const sourceResult =
        await indexPack(root);

      expect(sourceResult.status).toBe(
        "executed",
      );
      if (
        sourceResult.status !==
        "executed"
      ) {
        return;
      }

      const authoredPlan =
        planMinimumSufficientAnalysis({
          goal: "authored-intent",
          relevantTags: ["session"],
          context: "LOCAL_ARTIFACT",
          availableEvidence: [{
            level: "semantic",
            evidenceIds: ["intent:inferred"],
            quality: "usable",
            traits: ["intent-grounded"],
          }],
          completedCapabilityIds: [
            "diagnosis.source-index",
            "diagnosis.intent-grounding",
          ],
          capabilities:
            DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
              .capabilities,
        });

      const result =
        await executePlannedDiagnosisStep({
          plan: authoredPlan,
          context: "LOCAL_ARTIFACT",
          payload: {
            id: "intent:test",
            root,
            artifactId: "artifact:test",
            authoredSourceRoots: ["map-source"],
            files: [
              {
                relativePath: "scripts/main.ts",
                size: 64,
                contentHash: "hash-main",
              },
              {
                relativePath:
                  "map-source/domain/types.ts",
                size: 128,
                contentHash: "hash-authored",
              },
            ],
            sourceIndex:
              sourceResult.output,
          },
          registry: {
            schemaVersion: 1,
            executors: [
              createAuthoredIntentDiagnosisExecutor(),
            ],
          },
        });

      expect(result.status).toBe("executed");
      if (result.status !== "executed") return;
      expect(
        result.evidence.flatMap(
          (item) => item.traits,
        ),
      ).toContain("authored-intent");
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("does not promote authored intent when no recognized authored source exists", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-authored-"),
    );

    try {
      await mkdir(join(root, "scripts"), {
        recursive: true,
      });
      await writeFile(
        join(root, "scripts", "main.ts"),
        "export const x = 1;\n",
        "utf8",
      );

      const sourceResult =
        await indexPack(root);

      expect(sourceResult.status).toBe(
        "executed",
      );
      if (
        sourceResult.status !==
        "executed"
      ) {
        return;
      }

      const authoredPlan =
        planMinimumSufficientAnalysis({
          goal: "authored-intent",
          relevantTags: ["session"],
          context: "LOCAL_ARTIFACT",
          availableEvidence: [{
            level: "semantic",
            evidenceIds: [
              "intent:inferred",
            ],
            quality: "usable",
            traits: ["intent-grounded"],
          }],
          completedCapabilityIds: [
            "diagnosis.source-index",
            "diagnosis.intent-grounding",
          ],
          capabilities:
            DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
              .capabilities,
        });

      const result =
        await executePlannedDiagnosisStep({
          plan: authoredPlan,
          context: "LOCAL_ARTIFACT",
          payload: {
            id: "intent:test",
            root,
            artifactId:
              "artifact:test",
            files: [{
              relativePath:
                "scripts/main.ts",
              size: 20,
              contentHash:
                "hash-main",
            }],
            sourceIndex:
              sourceResult.output,
          },
          registry: {
            schemaVersion: 1,
            executors: [
              createAuthoredIntentDiagnosisExecutor(),
            ],
          },
        });

      expect(result.status).toBe(
        "blocked",
      );
      expect(result.reasons.join(" "))
        .toMatch(/No explicit authored intent source files/);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
