import type {
  MultiplayerSessionModel,
  SessionAction,
  SessionInvariantViolation,
} from "../../reliability/src/index.js";
import {
  applySessionAction,
  checkSessionInvariants,
  createSessionModel,
} from "../../reliability/src/index.js";
import type { StateMutation } from "./state-mutations.js";
import type {
  MutationScoreReport,
  MutationTestResult,
} from "./mutation-types.js";

export interface SessionMutationCase {
  arenaIds: readonly string[];
  actions: readonly SessionAction[];
}

export interface SessionMutationDetectorResult {
  killed: boolean;
  evidence?: string;
}

export type SessionMutationDetector = (
  baseline: MultiplayerSessionModel,
  mutated: MultiplayerSessionModel,
  violations: readonly SessionInvariantViolation[],
) => SessionMutationDetectorResult;

export function executeMutatedSession(
  testCase: SessionMutationCase,
  mutation: StateMutation,
): {
  baseline: MultiplayerSessionModel;
  mutated: MultiplayerSessionModel;
  violations: SessionInvariantViolation[];
} {
  let baseline = createSessionModel(testCase.arenaIds);
  let mutated = createSessionModel(testCase.arenaIds);

  for (const action of testCase.actions) {
    const baselineBefore = baseline;
    baseline = applySessionAction(baseline, action);

    const mutatedAfterCanonical = applySessionAction(mutated, action);
    mutated = mutation.apply(mutated, action, mutatedAfterCanonical);

    // baselineBefore intentionally retained as the semantic reference for future operators.
    void baselineBefore;
  }

  return {
    baseline,
    mutated,
    violations: checkSessionInvariants(mutated),
  };
}

export const invariantOrStateDiffDetector: SessionMutationDetector = (
  baseline,
  mutated,
  violations,
) => {
  if (violations.length > 0) {
    return {
      killed: true,
      evidence: `Invariant violation: ${violations.map((item) => item.invariantId).join(", ")}`,
    };
  }

  if (JSON.stringify(baseline) !== JSON.stringify(mutated)) {
    return {
      killed: true,
      evidence: "Mutated terminal session state diverged from canonical model.",
    };
  }

  return { killed: false };
};

export function runSessionMutationCampaign(
  testCases: readonly SessionMutationCase[],
  mutations: readonly StateMutation[],
  detector: SessionMutationDetector = invariantOrStateDiffDetector,
): MutationTestResult[] {
  const results: MutationTestResult[] = [];

  for (const mutation of mutations) {
    let killed: SessionMutationDetectorResult | undefined;

    for (const testCase of testCases) {
      const execution = executeMutatedSession(testCase, mutation);
      const detection = detector(
        execution.baseline,
        execution.mutated,
        execution.violations,
      );
      if (detection.killed) {
        killed = detection;
        break;
      }
    }

    results.push({
      descriptor: mutation.descriptor,
      status: killed ? "killed" : "survived",
      ...(killed?.evidence ? { evidence: killed.evidence } : {}),
    });
  }

  return results;
}

export function mutationScoreReport(
  results: readonly MutationTestResult[],
): MutationScoreReport {
  const byDomain: MutationScoreReport["byDomain"] = {};

  for (const result of results) {
    const domain = result.descriptor.domain;
    const bucket = byDomain[domain] ?? {
      total: 0,
      killed: 0,
      survived: 0,
      invalid: 0,
      score: 0,
    };

    bucket.total += 1;
    bucket[result.status] += 1;
    byDomain[domain] = bucket;
  }

  for (const bucket of Object.values(byDomain)) {
    const valid = bucket.killed + bucket.survived;
    bucket.score = valid === 0 ? 0 : bucket.killed / valid;
  }

  const killed = results.filter((item) => item.status === "killed").length;
  const survived = results.filter((item) => item.status === "survived").length;
  const invalid = results.filter((item) => item.status === "invalid").length;
  const valid = killed + survived;

  return {
    total: results.length,
    killed,
    survived,
    invalid,
    score: valid === 0 ? 0 : killed / valid,
    byDomain,
    results: [...results],
  };
}
