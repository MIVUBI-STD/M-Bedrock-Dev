import { inspectArtifact } from "./inspect-artifact.js";
import { planRetest } from "../../reliability/src/retest-planner.js";
import type {
  BlindspotCoverage,
  MinecraftUpdateDelta,
  RegressionCase,
  RetestPlan,
} from "../../reliability/src/types.js";
import type { InspectTargetProfile } from "./types.js";

export interface ArtifactRetestPlanInput {
  artifactPath: string;
  updateDelta: MinecraftUpdateDelta;
  regressions?: readonly RegressionCase[];
  coverage?: readonly BlindspotCoverage[];
  target?: InspectTargetProfile;
}

export interface ArtifactRetestPlanResult {
  artifact: {
    artifactId: string;
    fingerprint: string;
    reliabilityFingerprintId: string;
  };
  inspection: {
    diagnostics: number;
    unresolvedReferences: number;
    repairCandidates: number;
  };
  plan: RetestPlan;
}

export async function planArtifactRetest(
  input: ArtifactRetestPlanInput,
): Promise<ArtifactRetestPlanResult> {
  const inspection = await inspectArtifact(
    input.artifactPath,
    input.target ?? {},
  );

  const plan = planRetest(
    inspection.reliability.fingerprint,
    input.updateDelta,
    input.regressions ?? [],
    input.coverage ?? [],
  );

  return {
    artifact: {
      artifactId: inspection.artifactId,
      fingerprint: inspection.fingerprint,
      reliabilityFingerprintId: inspection.reliability.fingerprintId,
    },
    inspection: {
      diagnostics: inspection.diagnostics.length,
      unresolvedReferences: inspection.unresolvedReferences,
      repairCandidates: inspection.repairCandidates.length,
    },
    plan,
  };
}
