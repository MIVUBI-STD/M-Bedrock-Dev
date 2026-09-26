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
