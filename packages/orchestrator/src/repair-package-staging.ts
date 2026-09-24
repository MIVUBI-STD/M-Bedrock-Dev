import { rm } from "node:fs/promises";
import { packageDirectoryDeterministically } from "../../archive/src/package-zip.js";
import type { RepairLifecycleState } from "./repair-lifecycle.js";
import {
  decideRepairPackageStaging,
  type PackageStagingDecision,
} from "./repair-release-gate.js";

export type RepairPackageStageResult =
  | {
      status: "blocked";
      decision: PackageStagingDecision;
    }
  | {
      status: "staged";
      decision: PackageStagingDecision;
      outputPath: string;
    }
  | {
      status: "package-failed";
      decision: PackageStagingDecision;
      outputPath: string;
      failure: string;
    };

export async function stageRepairPackage(
  workingRoot: string,
  outputPath: string,
  lifecycle: RepairLifecycleState,
): Promise<RepairPackageStageResult> {
  const decision = decideRepairPackageStaging(lifecycle);
  if (decision.disposition !== "staging-eligible") {
    return {
      status: "blocked",
      decision,
    };
  }

  try {
    await packageDirectoryDeterministically(
      workingRoot,
      outputPath,
    );
    return {
      status: "staged",
      decision,
      outputPath,
    };
  } catch (error) {
    // A failed packaging attempt must not leave a partial output that can be
    // mistaken for an eligible artifact.
    try {
      await rm(outputPath, { force: true });
    } catch {
      // Preserve the original packaging failure as first-wrong-owner.
    }

    return {
      status: "package-failed",
      decision,
      outputPath,
      failure:
        error instanceof Error
          ? error.message
          : "PACKAGE_STAGING_FAILED",
    };
  }
}
