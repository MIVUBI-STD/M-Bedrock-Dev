import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyPatchTransaction } from "../../repair/src/apply.js";
import { planLinearTopologyRepair } from "../../repair/src/topology-planner.js";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { analyzeFunctionTopology } from "../src/topology-analysis.js";
import { validatePatchTransaction } from "../src/repair-validation.js";

describe("repair validation executor", () => {
  it("accepts an applied topology repair only after the target outlier disappears", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-validation-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    const relativePath = "behavior_packs/demo/functions/arenas.mcfunction";
    await mkdir(join(sourceRoot, "behavior_packs/demo/functions"), { recursive: true });
    await mkdir(join(workingRoot, "behavior_packs/demo/functions"), { recursive: true });

    const original = [
      "fill 0 0 0 3 2 3 stone",
      "fill 100 0 0 103 2 3 stone",
      "fill 198 0 0 201 2 3 stone",
      "fill 300 0 0 303 2 3 stone",
      "fill 400 0 0 403 2 3 stone",
    ].join("\n") + "\n";

    await writeFile(join(sourceRoot, relativePath), original);
    await writeFile(join(workingRoot, relativePath), original);

    const parsed = parseMcFunction("arenas", original, {
      artifactId: "source-sha",
      relativePath,
    });
    const topology = analyzeFunctionTopology([parsed]);
    const candidate = topology.repairableTopologyCandidates[0];
    if (!candidate) throw new Error("expected repairable candidate");

    const plan = planLinearTopologyRepair({
      outlier: candidate.outlier,
      effect: candidate.record.effect,
      rawCommand: candidate.record.rawCommand,
    }, "source-sha");
    if (plan.status !== "planned") throw new Error("expected planned transaction");

    const applied = await applyPatchTransaction(
      plan.transaction,
      { sourceRoot, workingRoot },
      { currentSourceFingerprint: "source-sha" },
    );
    expect(applied.ok).toBe(true);

    const validation = await validatePatchTransaction(
      plan.transaction,
      { sourceRoot, workingRoot },
    );

    expect(validation.ok).toBe(true);
    expect(validation.steps.every((step) => step.ok)).toBe(true);
  });

  it("rejects validation when mutation did not remove the target diagnostic", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-validation-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    const relativePath = "behavior_packs/demo/functions/arenas.mcfunction";
    await mkdir(join(workingRoot, "behavior_packs/demo/functions"), { recursive: true });

    const broken = [
      "fill 0 0 0 3 2 3 stone",
      "fill 100 0 0 103 2 3 stone",
      "fill 198 0 0 201 2 3 stone",
      "fill 300 0 0 303 2 3 stone",
      "fill 400 0 0 403 2 3 stone",
    ].join("\n") + "\n";
    await writeFile(join(workingRoot, relativePath), broken);

    const transaction = {
      id: "patch_fixture",
      title: "fixture",
      sourceFingerprint: "source-sha",
      operations: [],
      preconditions: [],
      affectedPaths: [relativePath],
      validation: [{
        kind: "topology-compare" as const,
        source: {
          artifactId: "source-sha",
          relativePath,
          range: { lineStart: 3, lineEnd: 3 },
        },
        expectation: "outlier-absent" as const,
      }],
    };

    const validation = await validatePatchTransaction(
      transaction,
      { sourceRoot, workingRoot },
    );

    expect(validation.ok).toBe(false);
  });
});
