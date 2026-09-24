import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { packageDirectoryDeterministically } from "../../archive/src/package-zip.js";
import {
  directoryContentFingerprint,
  verifyStagedRepairPackage,
} from "../src/repair-package-verification.js";

describe("repair package verification", () => {
  it("verifies deterministic package round-trip content", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-package-"));
    const workingRoot = join(root, "working");
    const packagePath = join(root, "repair.mcworld");
    await mkdir(join(workingRoot, "functions"), { recursive: true });
    await writeFile(
      join(workingRoot, "functions/a.mcfunction"),
      "say verified\n",
    );

    await packageDirectoryDeterministically(
      workingRoot,
      packagePath,
    );

    const result = await verifyStagedRepairPackage(
      workingRoot,
      packagePath,
      "tx-1",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toEqual(result.extracted);
    expect(result.receipt).toMatchObject({
      transactionId: "tx-1",
      kind: "package",
      passed: true,
    });
    expect(result.receipt.evidenceIds.length).toBe(2);
  });

  it("detects package content drift from the validated working copy", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-package-"));
    const workingRoot = join(root, "working");
    const packageSource = join(root, "package-source");
    const packagePath = join(root, "repair.mcworld");
    await mkdir(workingRoot, { recursive: true });
    await mkdir(packageSource, { recursive: true });
    await writeFile(join(workingRoot, "levelname.txt"), "expected");
    await writeFile(join(packageSource, "levelname.txt"), "different");

    await packageDirectoryDeterministically(
      packageSource,
      packagePath,
    );

    const result = await verifyStagedRepairPackage(
      workingRoot,
      packagePath,
      "tx-1",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toMatch(/differs/);
  });

  it("fingerprints directory content independently of root path", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-package-"));
    const left = join(root, "left");
    const right = join(root, "right");
    await mkdir(join(left, "nested"), { recursive: true });
    await mkdir(join(right, "nested"), { recursive: true });
    await writeFile(join(left, "nested/a.txt"), "same");
    await writeFile(join(right, "nested/a.txt"), "same");

    expect(await directoryContentFingerprint(left))
      .toEqual(await directoryContentFingerprint(right));
  });
});
