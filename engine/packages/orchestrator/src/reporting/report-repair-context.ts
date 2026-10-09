import type {
  ConfirmedDefect,
} from "../../../bug-report/src/index.js";
import type {
  DiagnosticRepairDecision,
  InvariantRegistryEntry,
  InvariantRegistrySnapshot,
} from "../../../project-model/src/index.js";
import type {
  RepairInvariantDerivation,
} from "../repair/repair-invariant-derivation.js";

function invariantText(
  entry: InvariantRegistryEntry,
): readonly string[] {
  const output: string[] = [];

  if (entry.rationale?.trim()) {
    output.push(entry.rationale.trim());
  }

  for (const requirement of entry.stateRequirements) {
    output.push(
      "Preserve " +
        requirement.predicate +
        " as " +
        requirement.expectedState +
        ".",
    );
  }

  for (const requirement of entry.temporalRequirements) {
    output.push(
      "Preserve temporal order: " +
        requirement.beforePredicate +
        " before " +
        requirement.afterPredicate +
        ".",
    );
  }

  return output;
}

export function deriveMustPreserveFromRepairInvariants(
  derivation: RepairInvariantDerivation,
  registry: InvariantRegistrySnapshot,
): readonly string[] {
  if (!derivation.automaticSelectionAllowed) {
    return [];
  }

  const selected = new Set(derivation.invariantIds);
  const values = registry.entries
    .filter((entry) => selected.has(entry.id))
    .flatMap(invariantText)
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(values)].sort();
}

export function applyReportRepairContext(
  defect: ConfirmedDefect,
  options: {
    readonly decision?: DiagnosticRepairDecision;
    readonly invariantDerivation?: RepairInvariantDerivation;
    readonly invariantRegistry?: InvariantRegistrySnapshot;
  },
): ConfirmedDefect {
  const mustPreserve =
    options.invariantDerivation &&
    options.invariantRegistry
      ? deriveMustPreserveFromRepairInvariants(
          options.invariantDerivation,
          options.invariantRegistry,
        )
      : [];

  const suggestedFixAllowed =
    options.decision === undefined ||
    options.decision.disposition !== "observe-only";

  const enriched = {
    ...defect,
    ...(mustPreserve.length === 0
      ? {}
      : { mustPreserve }),
  };

  if (suggestedFixAllowed) {
    return enriched;
  }

  const {
    suggestedFix: _suggestedFix,
    ...withoutSuggestedFix
  } = enriched;
  return withoutSuggestedFix;
}
