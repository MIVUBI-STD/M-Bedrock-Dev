import {
  runtimeExperimentDefinitionRevision,
} from "./revision.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentTrial,
} from "./types.js";

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const output = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) output.add(value);
    seen.add(value);
  }
  return [...output].sort();
}

export function validateRuntimeExperimentDefinition(
  definition: RuntimeExperimentDefinition,
): string[] {
  const errors: string[] = [];

  if (definition.schemaVersion !== 1) {
    errors.push("Runtime experiment schemaVersion must be 1.");
  }
  if (!definition.id.trim()) {
    errors.push("Runtime experiment id must be non-empty.");
  }
  if (!definition.title.trim()) {
    errors.push("Runtime experiment title must be non-empty.");
  }
  if (!definition.targetProfileFingerprint.trim()) {
    errors.push("Runtime experiment targetProfileFingerprint is required.");
  }
  if (!definition.fixtureFingerprint.trim()) {
    errors.push("Runtime experiment fixtureFingerprint is required.");
  }
  if (
    !Number.isInteger(definition.minimumRunsPerArm) ||
    definition.minimumRunsPerArm < 1
  ) {
    errors.push("Runtime experiment minimumRunsPerArm must be a positive integer.");
  }
  if (definition.protocol.length === 0) {
    errors.push("Runtime experiment requires an explicit protocol.");
  }
  for (const duplicate of duplicates(
    definition.protocol.map((step) => step.id),
  )) {
    errors.push("Duplicate runtime experiment protocol step id: " + duplicate);
  }
  for (const step of definition.protocol) {
    if (!step.id.trim() || !step.actionId.trim()) {
      errors.push(
        "Runtime experiment protocol step id/actionId must be non-empty.",
      );
    }
  }

  if (!definition.protocol.some((step) => step.phase === "observe")) {
    errors.push("Runtime experiment protocol requires at least one observe step.");
  }
  if (
    definition.mutationRisk === "read-only" &&
    definition.protocol.some((step) => step.phase !== "observe")
  ) {
    errors.push(
      "Read-only runtime experiment may contain observe steps only.",
    );
  }
  if (
    definition.protocol.some((step) => step.phase !== "observe") &&
    definition.requiredContext !== "LIVE_MINECRAFT"
  ) {
    errors.push(
      "Runtime experiment with setup/stimulus/teardown steps requires LIVE_MINECRAFT.",
    );
  }

  if (definition.arms.length < 2) {
    errors.push("Runtime experiment requires at least one control and one treatment arm.");
  }
  if (!definition.arms.some((arm) => arm.role === "control")) {
    errors.push("Runtime experiment requires a control arm.");
  }
  if (!definition.arms.some((arm) => arm.role === "treatment")) {
    errors.push("Runtime experiment requires a treatment arm.");
  }
  if (definition.outcomePredicateIds.length === 0) {
    errors.push("Runtime experiment requires at least one outcome predicate.");
  }

  for (const duplicate of duplicates(
    definition.factors.map((factor) => factor.id),
  )) {
    errors.push("Duplicate runtime experiment factor id: " + duplicate);
  }
  for (const duplicate of duplicates(
    definition.arms.map((arm) => arm.id),
  )) {
    errors.push("Duplicate runtime experiment arm id: " + duplicate);
  }
  for (const duplicate of duplicates(definition.outcomePredicateIds)) {
    errors.push("Duplicate runtime experiment outcome predicate: " + duplicate);
  }

  for (const duplicate of duplicates(
    (definition.expectedContrasts ?? []).map((item) => item.predicateId),
  )) {
    errors.push(
      "Duplicate runtime experiment expected contrast predicate: " +
        duplicate,
    );
  }

  for (const duplicate of duplicates(
    (definition.evidenceRequirements ?? []).map(
      (item) => item.id,
    ),
  )) {
    errors.push(
      "Duplicate runtime experiment evidence requirement id: " +
        duplicate,
    );
  }

  const outcomePredicates = new Set(
    definition.outcomePredicateIds,
  );
  for (const expected of definition.expectedContrasts ?? []) {
    if (!outcomePredicates.has(expected.predicateId)) {
      errors.push(
        "Runtime experiment expected contrast references undeclared outcome predicate " +
          expected.predicateId +
          ".",
      );
    }
    if (expected.controlState === expected.treatmentState) {
      errors.push(
        "Runtime experiment expected contrast requires different control and treatment states for " +
          expected.predicateId +
          ".",
      );
    }
  }

  const armIds = new Set(
    definition.arms.map((arm) => arm.id),
  );
  for (const requirement of definition.evidenceRequirements ?? []) {
    if (!requirement.id.trim()) {
      errors.push(
        "Runtime experiment evidence requirement id must be non-empty.",
      );
    }
    if (!requirement.predicateId.trim()) {
      errors.push(
        "Runtime experiment evidence requirement predicateId must be non-empty.",
      );
    }
    for (const armId of requirement.armIds ?? []) {
      if (!armIds.has(armId)) {
        errors.push(
          "Runtime experiment evidence requirement " +
            requirement.id +
            " references unknown arm " +
            armId +
            ".",
        );
      }
    }

    if (
      requirement.minimumProofAuthority !== undefined &&
      requirement.minimumProofAuthority !== "server-simulated" &&
      requirement.minimumProofAuthority !== "live-runtime"
    ) {
      errors.push(
        "Runtime experiment evidence requirement " +
          requirement.id +
          " has invalid minimumProofAuthority.",
      );
    }

    for (const [measurement, rule] of Object.entries(
      requirement.measurements ?? {},
    )) {
      if (!measurement.trim()) {
        errors.push(
          "Runtime experiment evidence requirement " +
            requirement.id +
            " contains an empty measurement key.",
        );
      }
      if (
        rule.equals === undefined &&
        rule.min === undefined &&
        rule.max === undefined
      ) {
        errors.push(
          "Runtime experiment evidence requirement " +
            requirement.id +
            " measurement " +
            measurement +
            " must declare equals, min, or max.",
        );
      }
      for (const [label, value] of Object.entries(rule)) {
        if (
          value !== undefined &&
          (
            typeof value !== "number" ||
            !Number.isFinite(value)
          )
        ) {
          errors.push(
            "Runtime experiment evidence requirement " +
              requirement.id +
              " measurement " +
              measurement +
              " " +
              label +
              " must be finite.",
          );
        }
      }
      if (
        rule.min !== undefined &&
        rule.max !== undefined &&
        rule.min > rule.max
      ) {
        errors.push(
          "Runtime experiment evidence requirement " +
            requirement.id +
            " measurement " +
            measurement +
            " min cannot exceed max.",
        );
      }
      if (
        rule.equals !== undefined &&
        (
          (rule.min !== undefined &&
            rule.equals < rule.min) ||
          (rule.max !== undefined &&
            rule.equals > rule.max)
        )
      ) {
        errors.push(
          "Runtime experiment evidence requirement " +
            requirement.id +
            " measurement " +
            measurement +
            " equals must satisfy its min/max bounds.",
        );
      }
    }
  }

  const factors = new Set(definition.factors.map((factor) => factor.id));
  for (const arm of definition.arms) {
    if (!arm.id.trim()) {
      errors.push("Runtime experiment arm id must be non-empty.");
    }
    for (const factorId of Object.keys(arm.factorValues)) {
      if (!factors.has(factorId)) {
        errors.push(
          "Runtime experiment arm " + arm.id +
            " references undeclared factor " + factorId + ".",
        );
      }
    }
    for (const factorId of factors) {
      if (!(factorId in arm.factorValues)) {
        errors.push(
          "Runtime experiment arm " + arm.id +
            " is missing controlled factor " + factorId + ".",
        );
      }
    }
  }

  const controls = definition.arms.filter(
    (arm) => arm.role === "control",
  );
  const treatments = definition.arms.filter(
    (arm) => arm.role === "treatment",
  );
  const factorContrast = controls.some((control) =>
    treatments.some((treatment) =>
      [...factors].some(
        (factorId) =>
          control.factorValues[factorId] !==
            treatment.factorValues[factorId],
      )
    )
  );
  if (
    factors.size > 0 &&
    controls.length > 0 &&
    treatments.length > 0 &&
    !factorContrast
  ) {
    errors.push(
      "Runtime experiment control and treatment arms must differ on at least one declared factor.",
    );
  }

  return errors;
}

export function validateRuntimeExperimentTrial(
  definition: RuntimeExperimentDefinition,
  trial: RuntimeExperimentTrial,
): string[] {
  const errors: string[] = [];
  if (trial.schemaVersion !== 1) {
    errors.push("Runtime experiment trial schemaVersion must be 1.");
  }
  if (trial.identity.experimentId !== definition.id) {
    errors.push("Runtime experiment trial belongs to another experiment.");
  }
  if (
    trial.identity.definitionRevision !==
      runtimeExperimentDefinitionRevision(definition)
  ) {
    errors.push("Runtime experiment trial definition revision is stale.");
  }
  if (!definition.arms.some((arm) => arm.id === trial.identity.armId)) {
    errors.push("Runtime experiment trial references an unknown arm.");
  }
  if (
    !Number.isInteger(trial.identity.runIndex) ||
    trial.identity.runIndex < 0
  ) {
    errors.push("Runtime experiment trial runIndex must be a non-negative integer.");
  }
  if (
    trial.identity.targetProfileFingerprint !==
      definition.targetProfileFingerprint
  ) {
    errors.push("Runtime experiment trial target profile does not match definition.");
  }
  if (
    trial.identity.fixtureFingerprint !==
      definition.fixtureFingerprint
  ) {
    errors.push("Runtime experiment trial fixture does not match definition.");
  }
  if (!trial.identity.environmentFingerprint.trim()) {
    errors.push("Runtime experiment trial environmentFingerprint is required.");
  }
  if (trial.status === "completed" && trial.evidence.length === 0) {
    errors.push("Completed runtime experiment trial requires evidence.");
  }
  if (
    trial.status !== "completed" &&
    !trial.error?.trim()
  ) {
    errors.push("Non-completed runtime experiment trial requires an error.");
  }
  return errors;
}
