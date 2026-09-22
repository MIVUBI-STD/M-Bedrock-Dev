import { mkdtemp, mkdir, cp, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { NORMAL_EXTRACTION_BUDGET } from "../../archive/src/budgets.js";
import { extractZipSafely, inventoryZip } from "../../archive/src/zip-transport.js";
import { sha256File, artifactIdFromFingerprint } from "../../artifact/src/fingerprint.js";
import { inspectDirectory, type InspectDirectoryResult } from "./inspect.js";

export interface InspectArtifactResult extends InspectDirectoryResult {
  artifactId: string;
  fingerprint: string;
  archiveEntries: number;
}

export async function inspectArtifact(path: string): Promise<InspectArtifactResult> {
  const fingerprint = await sha256File(path);
  const artifactId = artifactIdFromFingerprint(fingerprint);
  const sessionRoot = await mkdtemp(join(tmpdir(), "m-bedrock-inspect-"));
  const sourceRoot = join(sessionRoot, "source");
  const workingRoot = join(sessionRoot, "working");

  try {
    await mkdir(sourceRoot, { recursive: true });
    await mkdir(workingRoot, { recursive: true });
    const inventory = await inventoryZip(path);
    await extractZipSafely(path, sourceRoot, NORMAL_EXTRACTION_BUDGET);
    await cp(sourceRoot, workingRoot, { recursive: true });

    const result = await inspectDirectory(workingRoot, artifactId);
    return {
      artifactId,
      fingerprint,
      archiveEntries: inventory.entries.length,
      ...result,
    };
  } finally {
    await rm(sessionRoot, { recursive: true, force: true });
  }
}
