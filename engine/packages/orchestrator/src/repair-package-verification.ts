import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { NORMAL_EXTRACTION_BUDGET } from "../../archive/src/index.js";
import {
  extractZipSafely,
  inventoryZip,
} from "../../archive/src/index.js";
import { sha256File } from "../../artifact/src/index.js";
import type {
  RepairVerificationReceipt,
} from "./repair-lifecycle.js";

export interface DirectoryContentFingerprint {
  sha256: string;
  files: number;
}

export type StagedPackageVerificationResult =
  | {
      ok: true;
      packageFingerprint: string;
      source: DirectoryContentFingerprint;
      extracted: DirectoryContentFingerprint;
      archiveEntries: number;
      receipt: RepairVerificationReceipt;
    }
  | {
      ok: false;
      failure: string;
      source?: DirectoryContentFingerprint;
      extracted?: DirectoryContentFingerprint;
      archiveEntries?: number;
    };

async function listFiles(
  root: string,
  current = root,
): Promise<string[]> {
  const entries = await readdir(current, {
    withFileTypes: true,
  });
  const output: string[] = [];

  for (const entry of entries) {
    const full = join(current, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listFiles(root, full));
    } else if (entry.isFile()) {
      output.push(full);
    }
  }

  return output.sort((a, b) =>
    relative(root, a).localeCompare(relative(root, b))
  );
}

export async function directoryContentFingerprint(
  root: string,
): Promise<DirectoryContentFingerprint> {
  const files = await listFiles(root);
  const digest = createHash("sha256");

  for (const file of files) {
    const path = relative(root, file).replaceAll("\\", "/");
    const fileHash = await sha256File(file);
    digest.update(path);
    digest.update("\0");
    digest.update(fileHash);
    digest.update("\n");
  }

  return {
    sha256: digest.digest("hex"),
    files: files.length,
  };
}

export async function verifyStagedRepairPackage(
  workingRoot: string,
  packagePath: string,
  transactionId: string,
): Promise<StagedPackageVerificationResult> {
  const extractionRoot = await mkdtemp(
    join(tmpdir(), "m-bedrock-package-verify-"),
  );

  let source: DirectoryContentFingerprint | undefined;
  let extracted: DirectoryContentFingerprint | undefined;
  let archiveEntries: number | undefined;

  try {
    source = await directoryContentFingerprint(workingRoot);
    const inventory = await inventoryZip(packagePath);
    archiveEntries = inventory.entries.length;

    await extractZipSafely(
      packagePath,
      extractionRoot,
      NORMAL_EXTRACTION_BUDGET,
    );
    extracted = await directoryContentFingerprint(extractionRoot);

    if (
      source.files !== extracted.files ||
      source.sha256 !== extracted.sha256
    ) {
      return {
        ok: false,
        failure:
          "Staged package round-trip content differs from the validated working copy.",
        source,
        extracted,
        archiveEntries,
      };
    }

    const packageFingerprint = await sha256File(packagePath);

    return {
      ok: true,
      packageFingerprint,
      source,
      extracted,
      archiveEntries,
      receipt: {
        transactionId,
        kind: "package",
        passed: true,
        evidenceIds: [
          "package:archive-sha256:" + packageFingerprint,
          "package:roundtrip-content-sha256:" + source.sha256,
        ],
      },
    };
  } catch (error) {
    return {
      ok: false,
      failure:
        error instanceof Error
          ? error.message
          : "PACKAGE_VERIFICATION_FAILED",
      ...(source === undefined ? {} : { source }),
      ...(extracted === undefined ? {} : { extracted }),
      ...(archiveEntries === undefined
        ? {}
        : { archiveEntries }),
    };
  } finally {
    await rm(extractionRoot, {
      recursive: true,
      force: true,
    });
  }
}
