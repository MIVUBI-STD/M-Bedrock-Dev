import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  stageRepairPackage,
} from "../src/repair-package-staging.js";
import type { RepairLifecycleState } from "../src/repair-lifecycle.js";

function lifecycle(
  stage: RepairLifecycleState["stage"] = "static-validated",
): RepairLifecycleState {
  return {
    transactionId: "tx-1",
    stage,
    mutationPresent: stage !== "not-authorized" && stage !== "apply-failed",
    localStaticValidationPassed: stage === "static-validated",
    transitiveRevalidationComplete: stage === "static-validated",
    runtimeVerificationComplete: false,
    preservationVerificationComplete: false,
    packageVerificationComplete: false,
    pendingNodeIds: [],
    pendingPaths: [],
    reasons: [],
  };
}

describe("repair package staging", () => {
  it("blocks packaging before static and transitive validation complete", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-stage-"));
    const result = await stageRepairPackage(
      root,
      join(root, "blocked.mcworld"),
      lifecycle("transitive-revalidation-pending"),
    );

    expect(result.status).toBe("blocked");
  });

  it("creates a deterministic staged archive from an eligible working copy", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-stage-"));
    const workingRoot = join(root, "working");
    const outputPath = join(root, "staged.mcworld");
    await mkdir(join(workingRoot, "functions"), { recursive: true });
    await writeFile(
      join(workingRoot, "functions/a.mcfunction"),
      "say hello\n",
    );

    const result = await stageRepairPackage(
      workingRoot,
      outputPath,
      lifecycle(),
    );

    expect(result.status).toBe("staged");
    expect((await stat(outputPath)).isFile()).toBe(true);
    expect((await readFile(outputPath)).byteLength).toBeGreaterThan(0);
  });

  it("removes partial output when packaging fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-stage-"));
    const outputPath = join(root, "failed.mcworld");
    await writeFile(outputPath, "stale partial");

    const result = await stageRepairPackage(
      join(root, "missing-working-root"),
      outputPath,
      lifecycle(),
    );

    expect(result.status).toBe("package-failed");
    await expect(stat(outputPath)).rejects.toThrow();
  });
});
