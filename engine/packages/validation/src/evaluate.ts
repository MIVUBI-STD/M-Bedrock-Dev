import type {
  TransactionValidationResult,
  ValidationInvariantTrace,
  ValidationRun,
  ValidationRunTrace,
  ValidationScenario,
  ValidationScenarioSnapshot,
  ValidationStepResult,
  ValidationTraceContext,
  ValidationTraceReport,
} from "./types.js";

const proofRank = {
  "UNKNOWN": 0,
  "STATIC VERIFIED": 1,
  "PACKAGE VERIFIED": 2,
  "LOCAL GAME VERIFIED": 3,
  "LIVE GAME VERIFIED": 4,
} as const;

function proofSatisfies(
  actual: keyof typeof proofRank,
  required: keyof typeof proofRank,
): boolean {
  return proofRank[actual] >= proofRank[required];
}

export function summarizeValidation(
  steps: readonly ValidationStepResult[],
): TransactionValidationResult {
  return {
    ok: steps.every((step) => step.ok),
    steps: [...steps],
  };
}

export function snapshotValidationScenario(
  scenario: ValidationScenario,
  context: ValidationTraceContext,
): ValidationScenarioSnapshot {
  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    scenarioRevision: scenario.revision,
    title: scenario.title,
    ...(scenario.description === undefined
      ? {}
      : { description: scenario.description }),
    intentInvariantIds: [...scenario.intentInvariantIds],
    steps: scenario.steps.map((step) => ({ ...step })),
    requiredProofLevel: scenario.requiredProofLevel,
    artifactFingerprint: context.artifactFingerprint,
    intentModelId: context.intentModelId,
    ...(context.targetProfileFingerprint === undefined
      ? {}
      : {
          targetProfileFingerprint:
            context.targetProfileFingerprint,
        }),
  };
}

function staleReasonsForRun(
  run: ValidationRun,
  scenariosById: ReadonlyMap<string, ValidationScenario>,
  context: ValidationTraceContext,
): string[] {
  const reasons: string[] = [];
  const scenario = scenariosById.get(run.snapshot.scenarioId);

  if (!scenario) {
    reasons.push("validation scenario no longer exists in the current scenario set");
  } else if (scenario.revision !== run.snapshot.scenarioRevision) {
    reasons.push(
      "validation scenario revision changed from " +
      run.snapshot.scenarioRevision +
      " to " +
      scenario.revision,
    );
  }

  if (run.snapshot.artifactFingerprint !== context.artifactFingerprint) {
    reasons.push("artifact fingerprint changed since this validation run");
  }

  if (run.snapshot.intentModelId !== context.intentModelId) {
    reasons.push("gameplay intent model changed since this validation run");
  }

  if (
    run.snapshot.targetProfileFingerprint !==
    context.targetProfileFingerprint
  ) {
    reasons.push("target runtime profile changed since this validation run");
  }

  return reasons;
}

export function assessValidationTrace(
  scenarios: readonly ValidationScenario[],
  runs: readonly ValidationRun[],
  context: ValidationTraceContext,
): ValidationTraceReport {
  const scenariosById = new Map(
    scenarios.map((scenario) => [scenario.id, scenario]),
  );

  const runTraces: ValidationRunTrace[] = runs.map((run) => {
    const staleReasons = staleReasonsForRun(
      run,
      scenariosById,
      context,
    );

    const scenario = scenariosById.get(run.snapshot.scenarioId);
    const proofEvidencePresent =
      run.proofLevel === "UNKNOWN" ||
      run.evidenceIds.length > 0;
    const runtimeProfileBound =
      run.proofLevel !== "LOCAL GAME VERIFIED" &&
      run.proofLevel !== "LIVE GAME VERIFIED"
        ? true
        : (
            run.snapshot.targetProfileFingerprint !==
              undefined &&
            run.snapshot.targetProfileFingerprint.trim().length > 0
          );
    const proofSufficient =
      scenario !== undefined &&
      proofSatisfies(
        run.proofLevel,
        scenario.requiredProofLevel,
      ) &&
      proofEvidencePresent &&
      runtimeProfileBound;

    return {
      runId: run.id,
      scenarioId: run.snapshot.scenarioId,
      scenarioRevision: run.snapshot.scenarioRevision,
      intentInvariantIds: [
        ...run.snapshot.intentInvariantIds,
      ],
      ok: run.result.ok,
      proofLevel: run.proofLevel,
      proofSufficient,
      current: staleReasons.length === 0,
      staleReasons,
      evidenceIds: [...run.evidenceIds],
    };
  });

  const invariantIds = new Set(
    scenarios.flatMap((scenario) =>
      scenario.intentInvariantIds
    ),
  );

  const invariantTraces: ValidationInvariantTrace[] =
    [...invariantIds].sort().map((invariantId) => {
      const matchingScenarios = scenarios.filter((scenario) =>
        scenario.intentInvariantIds.includes(invariantId)
      );
      const scenarioIds = matchingScenarios.map(
        (scenario) => scenario.id,
      );
      const matchingRuns = runTraces.filter((run) =>
        run.intentInvariantIds.includes(invariantId)
      );
      const currentPassingRunIds = matchingRuns
        .filter((run) => run.current && run.ok && run.proofSufficient)
        .map((run) => run.runId);

      return {
        invariantId,
        scenarioIds,
        runIds: matchingRuns.map((run) => run.runId),
        currentPassingRunIds,
        current:
          scenarioIds.length > 0 &&
          currentPassingRunIds.length > 0,
      };
    });

  return {
    runs: runTraces,
    invariants: invariantTraces,
  };
}
