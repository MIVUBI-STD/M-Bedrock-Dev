import {
  link,
  mkdtemp,
  mkdir,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  prepareMutationWorkspace,
  resolveWorkingPathSecure,
} from "../src/workspace.js";

describe("mutation workspace hardening", () => {
  it("rejects overlapping source and working roots", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-workspace-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(sourceRoot, "working");
    await mkdir(workingRoot, { recursive: true });

    await expect(
      prepareMutationWorkspace({ sourceRoot, workingRoot }),
    ).rejects.toThrow(/must not overlap/);
  });

  it("rejects symlink escapes from working root", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-workspace-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    const outside = join(root, "outside");
    await mkdir(sourceRoot, { recursive: true });
    await mkdir(workingRoot, { recursive: true });
    await mkdir(outside, { recursive: true });
    await writeFile(join(outside, "target.mcfunction"), "say outside\n");

    const linkPath = join(workingRoot, "linked.mcfunction");
    await symlink(join(outside, "target.mcfunction"), linkPath);

    const prepared = await prepareMutationWorkspace({ sourceRoot, workingRoot });
    await expect(
      resolveWorkingPathSecure(prepared, "linked.mcfunction"),
    ).rejects.toThrow(/filesystem links|symbolic link/);
  });

  it("rejects hardlinks to immutable source content", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-workspace-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    await mkdir(join(sourceRoot, "functions"), { recursive: true });
    await mkdir(join(workingRoot, "functions"), { recursive: true });
    const sourceFile = join(sourceRoot, "functions/a.mcfunction");
    const workingFile = join(workingRoot, "functions/a.mcfunction");
    await writeFile(sourceFile, "say source\n");
    await link(sourceFile, workingFile);

    const prepared = await prepareMutationWorkspace({ sourceRoot, workingRoot });
    await expect(
      resolveWorkingPathSecure(prepared, "functions/a.mcfunction"),
    ).rejects.toThrow(/hardlinked/);
  });

  it("rejects parent-directory symlink escapes for not-yet-existing targets", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-workspace-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    const outside = join(root, "outside");
    await mkdir(sourceRoot, { recursive: true });
    await mkdir(workingRoot, { recursive: true });
    await mkdir(outside, { recursive: true });
    await symlink(outside, join(workingRoot, "linked-dir"));

    const prepared = await prepareMutationWorkspace({ sourceRoot, workingRoot });
    await expect(
      resolveWorkingPathSecure(prepared, "linked-dir/new.mcfunction"),
    ).rejects.toThrow(/filesystem links/);
  });
});
