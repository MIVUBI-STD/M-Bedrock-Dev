import { createHash } from "node:crypto";
import {
  boundedBehaviorSolver,
  type ConstraintProblem,
  type SolverResult,
} from "../../logic-solver/src/index.js";
import type {
  DiagnosisCapabilityExecutor,
  DiagnosisExecutorRequest,
} from "./execution.js";

export interface ContradictionProofDiagnosisPayload {
  problem: ConstraintProblem;
}

function isConstraintProblem(
  value: unknown,
): value is ConstraintProblem {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record =
    value as Record<string, unknown>;
  const query =
    record.query as
      | Record<string, unknown>
      | undefined;
  const budget =
    record.budget as
      | Record<string, unknown>
      | undefined;
  const initialState =
    record.initialState as
      | Record<string, unknown>
      | undefined;
  const model =
    record.model as
      | Record<string, unknown>
      | undefined;

  return (
    typeof record.id === "string" &&
    model !== undefined &&
    model.schemaVersion === 1 &&
    initialState !== undefined &&
    initialState.schemaVersion === 1 &&
    query !== undefined &&
    query.kind === "invariant" &&
    typeof query.id === "string" &&
    budget !== undefined &&
    typeof budget.maxDepth === "number" &&
    typeof budget.maxStates === "number"
  );
}

function evidenceId(
  problem: ConstraintProblem,
  result: SolverResult,
): string {
  return "contradiction-proof:" +
    createHash("sha256")
      .update(
        JSON.stringify({
          problemId: problem.id,
          queryId: problem.query.id,
          disposition: result.disposition,
          proof: result.proof,
          transitionIds:
            result.proof.transitionIds,
        }),
      )
      .digest("hex");
}

export function createContradictionProofDiagnosisExecutor():
  DiagnosisCapabilityExecutor {
  return {
    executorId:
      "diagnosis.contradiction-proof",
    executorRevision:
      "contradiction-proof-executor:1",

    async execute(
      request: DiagnosisExecutorRequest,
    ) {
      if (
        request.capabilityId !==
        "diagnosis.contradiction-proof"
      ) {
        return {
          status: "blocked",
          reasons: [
            "Contradiction-proof executor received the wrong diagnosis capability id.",
          ],
        };
      }

      if (
        request.payload === null ||
        typeof request.payload !== "object"
      ) {
        return {
          status: "blocked",
          reasons: [
            "Contradiction-proof diagnosis payload must contain an explicit invariant ConstraintProblem.",
          ],
        };
      }

      const payload =
        request.payload as
          Record<string, unknown>;

      if (
        !isConstraintProblem(
          payload.problem,
        )
      ) {
        return {
          status: "blocked",
          reasons: [
            "Contradiction-proof executor accepts only an explicit invariant ConstraintProblem.",
            "The executor never invents or weakens an invariant automatically.",
          ],
        };
      }

      const problem =
        payload.problem;

      let output: SolverResult;
      try {
        output =
          boundedBehaviorSolver.solve(
            problem,
          );
      } catch (error) {
        return {
          status: "blocked",
          reasons: [
            "Formal contradiction solver failed.",
            error instanceof Error
              ? error.message
              : String(error),
          ],
        };
      }

      if (
        output.disposition === "unknown"
      ) {
        return {
          status: "blocked",
          output,
          reasons: [
            "Formal search is inconclusive; truncated or otherwise unknown solver output is not contradiction proof.",
            output.reason,
          ],
        };
      }

      if (
        output.disposition === "proved"
      ) {
        return {
          status: "blocked",
          output,
          reasons: [
            "The supplied invariant was proved over the explored reachable state space; no contradiction was established.",
            output.reason,
          ],
        };
      }

      if (
        output.trace === undefined ||
        output.trace.length === 0
      ) {
        return {
          status: "blocked",
          output,
          reasons: [
            "Solver reported an invariant violation without a counterexample trace; contradiction evidence is incomplete.",
          ],
        };
      }

      return {
        status: "completed",
        output,
        evidence: [{
          level: "formal",
          quality: "usable",
          traits: ["contradiction"],
          evidenceIds: [
            evidenceId(
              problem,
              output,
            ),
          ],
        }],
        reasons: [
          "Explicit invariant was disproved by a reachable counterexample trace.",
          output.reason,
        ],
      };
    },
  };
}
