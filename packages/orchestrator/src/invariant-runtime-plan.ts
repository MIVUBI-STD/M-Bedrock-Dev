import type { CompiledDiagnosticInvariant } from "../../knowledge/src/invariant-compiler.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type { RuntimeTemporalRequirement } from "../../project-model/src/runtime-temporal.js";

export interface CompiledInvariantRuntimePlan {
  temporalRequirements: readonly RuntimeTemporalRequirement[];
  stateInvariantIds: readonly string[];
  diagnosticOnlyInvariantIds: readonly string[];
}

export function materializeInvariantRuntimePlan(
  invariants: readonly CompiledDiagnosticInvariant[],
  scope?: RuntimeScope,
): CompiledInvariantRuntimePlan {
  const temporalRequirements: RuntimeTemporalRequirement[] = [];
  const stateInvariantIds: string[] = [];
  const diagnosticOnlyInvariantIds: string[] = [];

  for (const invariant of invariants) {
    if (invariant.classification === "open-assumption") {
      diagnosticOnlyInvariantIds.push(invariant.id);
      continue;
    }

    if (invariant.invariantKind === "temporal-order") {
      if (!invariant.beforePredicate || !invariant.afterPredicate) {
        diagnosticOnlyInvariantIds.push(invariant.id);
        continue;
      }
      temporalRequirements.push({
        id: invariant.id,
        beforePredicate: invariant.beforePredicate,
        afterPredicate: invariant.afterPredicate,
        ...(scope === undefined ? {} : { scope }),
      });
      continue;
    }

    stateInvariantIds.push(invariant.id);
  }

  return {
    temporalRequirements: temporalRequirements.sort((a, b) =>
      a.id.localeCompare(b.id)
    ),
    stateInvariantIds: [...stateInvariantIds].sort(),
    diagnosticOnlyInvariantIds: [...diagnosticOnlyInvariantIds].sort(),
  };
}
