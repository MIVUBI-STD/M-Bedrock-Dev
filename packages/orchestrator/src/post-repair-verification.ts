import type {
  DiagnosticFinding,
} from "../../diagnostics/src/index.js";
import type {
  InspectArtifactResult,
} from "./inspect-artifact.js";

export type PostRepairVerificationStatus =
  | "pass"
  | "partial"
  | "fail";

export interface PostRepairVerificationInput {
  before: InspectArtifactResult;
  after: InspectArtifactResult;
  requiredResolvedDiagnosticCodes?:
    readonly DiagnosticFinding["code"][];
  allowNewMinorDiagnostics?: boolean;
}

export interface PostRepairVerificationReport {
  schemaVersion: 1;
  status: PostRepairVerificationStatus;
  releaseReady: boolean;
  beforeFingerprint: string;
  afterFingerprint: string;
  targetDiagnosticsRemaining:
    readonly DiagnosticFinding["code"][];
  newDiagnostics: {
    critical: readonly DiagnosticFinding[];
    medium: readonly DiagnosticFinding[];
    minor: readonly DiagnosticFinding[];
  };
  regressions: readonly string[];
  followUps: readonly string[];
  improvements: readonly string[];
}

function sourceKey(
  finding: DiagnosticFinding,
): string {
  const source = finding.source;
  return [
    finding.code,
    source?.relativePath ?? "",
    source?.range?.lineStart ?? 0,
    source?.range?.columnStart ?? 0,
    finding.message,
  ].join("|");
}

function diagnosticSet(
  findings: readonly DiagnosticFinding[],
): Set<string> {
  return new Set(
    findings.map(sourceKey),
  );
}

function newDiagnostics(
  before: InspectArtifactResult,
  after: InspectArtifactResult,
): DiagnosticFinding[] {
  const previous =
    diagnosticSet(before.diagnostics);
  return after.diagnostics.filter(
    (finding) =>
      !previous.has(sourceKey(finding)),
  );
}

function proofRank(
  value:
    | InspectArtifactResult["arenaAnalysis"]["proofConclusion"]
    | undefined,
): number {
  const conclusion = value?.conclusion;
  if (conclusion === "complete-proof") return 4;
  if (conclusion === "bounded-proof") return 3;
  if (conclusion === "partition-fallback") return 2;
  if (conclusion === "no-proof") return 1;
  return 0;
}

function hasPackDrift(
  result: InspectArtifactResult,
): boolean {
  return result.diagnostics.some(
    (finding) =>
      finding.code ===
      "PACK_IDENTITY_DRIFT",
  );
}

function arenaDivergenceCount(
  result: InspectArtifactResult,
): number {
  return result.diagnostics.filter(
    (finding) =>
      finding.code.startsWith("ARENA_") &&
      finding.code.endsWith(
        "_DIVERGENCE",
      ),
  ).length;
}

export function verifyPostRepairOutcome(
  input: PostRepairVerificationInput,
): PostRepairVerificationReport {
  const required = [
    ...new Set(
      input.requiredResolvedDiagnosticCodes ?? [],
    ),
  ].sort();
  const remaining = required.filter(
    (code) =>
      input.after.diagnostics.some(
        (finding) =>
          finding.code === code,
      ),
  );

  const introduced =
    newDiagnostics(
      input.before,
      input.after,
    );
  const newCritical =
    introduced.filter(
      (item) =>
        item.severity === "critical",
    );
  const newMedium =
    introduced.filter(
      (item) =>
        item.severity === "medium",
    );
  const newMinor =
    introduced.filter(
      (item) =>
        item.severity === "minor",
    );

  const regressions: string[] = [];
  const followUps: string[] = [];
  const improvements: string[] = [];

  if (remaining.length > 0) {
    regressions.push(
      "Required diagnostic target(s) remain after repair: " +
        remaining.join(", ") +
        ".",
    );
  }

  if (newCritical.length > 0) {
    regressions.push(
      String(newCritical.length) +
        " new critical diagnostic(s) were introduced.",
    );
  }
  if (newMedium.length > 0) {
    regressions.push(
      String(newMedium.length) +
        " new medium/major diagnostic(s) were introduced.",
    );
  }
  if (
    newMinor.length > 0 &&
    input.allowNewMinorDiagnostics !== true
  ) {
    followUps.push(
      String(newMinor.length) +
        " new minor diagnostic(s) were introduced.",
    );
  }

  if (
    input.after.unresolvedReferences >
    input.before.unresolvedReferences
  ) {
    regressions.push(
      "Unresolved semantic references increased from " +
        input.before.unresolvedReferences +
        " to " +
        input.after.unresolvedReferences +
        ".",
    );
  } else if (
    input.after.unresolvedReferences <
    input.before.unresolvedReferences
  ) {
    improvements.push(
      "Unresolved semantic references decreased.",
    );
  }

  if (
    input.after.releaseIdentity.status ===
    "conflict"
  ) {
    regressions.push(
      "Post-repair release identity is conflicting.",
    );
  }

  const beforePackDrift =
    hasPackDrift(input.before);
  const afterPackDrift =
    hasPackDrift(input.after);
  if (!beforePackDrift && afterPackDrift) {
    regressions.push(
      "Repair introduced persisted/current pack identity drift.",
    );
  }
  if (beforePackDrift && !afterPackDrift) {
    improvements.push(
      "Persisted/current pack identity drift was resolved.",
    );
  }

  const beforeArenaDivergence =
    arenaDivergenceCount(input.before);
  const afterArenaDivergence =
    arenaDivergenceCount(input.after);
  if (
    afterArenaDivergence >
    beforeArenaDivergence
  ) {
    regressions.push(
      "Arena divergence diagnostics increased from " +
        beforeArenaDivergence +
        " to " +
        afterArenaDivergence +
        ".",
    );
  } else if (
    afterArenaDivergence <
    beforeArenaDivergence
  ) {
    improvements.push(
      "Arena divergence diagnostics decreased.",
    );
  }

  const beforeProofMode =
    input.before.arenaAnalysis
      .proofExecution?.mode;
  const afterProofMode =
    input.after.arenaAnalysis
      .proofExecution?.mode;
  const beforeProofRank =
    proofRank(
      input.before.arenaAnalysis
        .proofConclusion,
    );
  const afterProofRank =
    proofRank(
      input.after.arenaAnalysis
        .proofConclusion,
    );

  if (
    beforeProofMode === "full" &&
    afterProofMode === "full" &&
    afterProofRank < beforeProofRank
  ) {
    regressions.push(
      "Full arena proof degraded from " +
        (
          input.before.arenaAnalysis
            .proofConclusion?.conclusion ??
          "unavailable"
        ) +
        " to " +
        (
          input.after.arenaAnalysis
            .proofConclusion?.conclusion ??
          "unavailable"
        ) +
        ".",
    );
  } else if (
    beforeProofMode === "full" &&
    afterProofMode !== "full" &&
    beforeProofRank > 0
  ) {
    followUps.push(
      "Before-state arena evidence used full proof, but after-state verification did not. Run full arena proof before release.",
    );
  }

  const beforeUnknowns =
    input.before.gameplayWorld
      .intent.unknowns.length;
  const afterUnknowns =
    input.after.gameplayWorld
      .intent.unknowns.length;
  if (afterUnknowns > beforeUnknowns) {
    followUps.push(
      "Gameplay intent unknowns increased from " +
        beforeUnknowns +
        " to " +
        afterUnknowns +
        ".",
    );
  } else if (afterUnknowns < beforeUnknowns) {
    improvements.push(
      "Gameplay intent unknowns decreased.",
    );
  }

  if (
    input.after.evidenceRecovery.actions.length >
    input.before.evidenceRecovery.actions.length
  ) {
    followUps.push(
      "Post-repair evidence recovery requirements increased.",
    );
  }

  if (
    input.before.fingerprint ===
    input.after.fingerprint
  ) {
    followUps.push(
      "Before and after artifact fingerprints are identical; verify that a material repair was actually applied.",
    );
  }

  const status:
    PostRepairVerificationStatus =
      regressions.length > 0
        ? "fail"
        : followUps.length > 0
          ? "partial"
          : "pass";

  return {
    schemaVersion: 1,
    status,
    releaseReady:
      status === "pass",
    beforeFingerprint:
      input.before.fingerprint,
    afterFingerprint:
      input.after.fingerprint,
    targetDiagnosticsRemaining:
      remaining,
    newDiagnostics: {
      critical: newCritical,
      medium: newMedium,
      minor: newMinor,
    },
    regressions,
    followUps,
    improvements,
  };
}
