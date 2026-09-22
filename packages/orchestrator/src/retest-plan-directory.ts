import { inspectDirectory } from "./inspect.js";
import { planRetest } from "../../reliability/src/retest-planner.js";
import type {
  BlindspotCoverage,
  MinecraftUpdateDelta,
  RegressionCase,
  RetestPlan,
} from "../../reliability/src/types.js";
import type { InspectTargetProfile } from "./types.js";

export interface DirectoryRetestPlanInput {
  root: string;
  mapId: string;
  updateDelta: MinecraftUpdateDelta;
  regressions?: readonly RegressionCase[];
  coverage?: readonly BlindspotCoverage[];
  target?: InspectTargetProfile;
}

export interface DirectoryRetestPlanResult {
  mapId: string;
  reliabilityFingerprintId: string;
  plan: RetestPlan;
}

export async function planDirectoryRetest(
  input: DirectoryRetestPlanInput,
): Promise<DirectoryRetestPlanResult> {
  const inspection = await inspectDirectory(
    input.root,
    input.mapId,
    input.target ?? {},
  );

  const fingerprint = {
    ...inspection.reliability.fingerprint,
    mapId: input.mapId,
  };

  const plan = planRetest(
    fingerprint,
    input.updateDelta,
    input.regressions ?? [],
    input.coverage ?? [],
  );

  return {
    mapId: input.mapId,
    reliabilityFingerprintId: inspection.reliability.fingerprintId,
    plan,
  };
}
