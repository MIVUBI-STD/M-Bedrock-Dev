import type {
  DiagnosticHypothesisSet,
  DiagnosticProbeCandidate,
} from "./types.js";

function duplicateIds(
  values: readonly string[],
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function validateDiagnosticHypothesisSet(
  set: DiagnosticHypothesisSet,
): string[] {
  const errors: string[] = [];

  if (set.schemaVersion !== 1) {
    errors.push(
      "Diagnostic hypothesis set schemaVersion must be 1.",
    );
  }
  if (!set.id.trim()) {
    errors.push(
      "Diagnostic hypothesis set id must be non-empty.",
    );
  }

  for (
    const id of duplicateIds(
      set.hypotheses.map((item) => item.id),
    )
  ) {
    errors.push(
      "Duplicate diagnostic hypothesis id: " +
        id +
        ".",
    );
  }

  for (const hypothesis of set.hypotheses) {
    if (!hypothesis.id.trim()) {
      errors.push(
        "Diagnostic hypothesis id must be non-empty.",
      );
    }
    if (!hypothesis.statement.trim()) {
      errors.push(
        "Diagnostic hypothesis statement must be non-empty: " +
          hypothesis.id +
          ".",
      );
    }

    const required = new Set(
      hypothesis.requiredPredicates ?? [],
    );
    for (
      const falsifier of
        hypothesis.falsifierPredicates ?? []
    ) {
      if (required.has(falsifier)) {
        errors.push(
          "Diagnostic hypothesis " +
            hypothesis.id +
            " cannot require and falsify the same predicate: " +
            falsifier +
            ".",
        );
      }
    }
  }

  return errors;
}

export function validateDiagnosticProbeCandidates(
  set: DiagnosticHypothesisSet,
  probes: readonly DiagnosticProbeCandidate[],
): string[] {
  const errors: string[] = [];
  const hypotheses = new Set(
    set.hypotheses.map((item) => item.id),
  );

  for (
    const id of duplicateIds(
      probes.map((item) => item.id),
    )
  ) {
    errors.push(
      "Duplicate diagnostic probe id: " +
        id +
        ".",
    );
  }

  for (const probe of probes) {
    if (!probe.id.trim()) {
      errors.push(
        "Diagnostic probe id must be non-empty.",
      );
    }
    if (!probe.predicate.trim()) {
      errors.push(
        "Diagnostic probe predicate must be non-empty: " +
          probe.id +
          ".",
      );
    }
    if (!Number.isFinite(probe.cost) || probe.cost < 0) {
      errors.push(
        "Diagnostic probe cost must be finite and non-negative: " +
          probe.id +
          ".",
      );
    }
    if (!Number.isFinite(probe.risk) || probe.risk < 0) {
      errors.push(
        "Diagnostic probe risk must be finite and non-negative: " +
          probe.id +
          ".",
      );
    }

    const predictionIds = new Set<string>();
    for (const prediction of probe.predictions) {
      if (
        !hypotheses.has(
          prediction.hypothesisId,
        )
      ) {
        errors.push(
          "Diagnostic probe " +
            probe.id +
            " references unknown hypothesis: " +
            prediction.hypothesisId +
            ".",
        );
      }
      if (
        predictionIds.has(
          prediction.hypothesisId,
        )
      ) {
        errors.push(
          "Diagnostic probe " +
            probe.id +
            " has duplicate prediction for hypothesis: " +
            prediction.hypothesisId +
            ".",
        );
      }
      predictionIds.add(
        prediction.hypothesisId,
      );
    }
  }

  return errors;
}
