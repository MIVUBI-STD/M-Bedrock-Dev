import type {
  BehavioralWorldModel,
  BehaviorCondition,
  TemporalProperty,
} from "./types.js";

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate].sort();
}

function validateCondition(
  condition: BehaviorCondition,
  variables: ReadonlySet<string>,
  label: string,
  errors: string[],
): void {
  if (!variables.has(condition.variableId)) {
    errors.push(
      label +
        " references unknown variable: " +
        condition.variableId +
        ".",
    );
  }

  const needsValue = ![
    "exists",
    "missing",
  ].includes(condition.operator);

  if (
    needsValue &&
    condition.value === undefined
  ) {
    errors.push(
      label +
        " requires a comparison value for operator " +
        condition.operator +
        ".",
    );
  }

  if (
    !needsValue &&
    condition.value !== undefined
  ) {
    errors.push(
      label +
        " must not provide a value for operator " +
        condition.operator +
        ".",
    );
  }
}

function validateTemporal(
  property: TemporalProperty,
  variables: ReadonlySet<string>,
  errors: string[],
): void {
  if (
    property.kind !== "always" &&
    property.withinTicks !== undefined &&
    (
      !Number.isInteger(property.withinTicks) ||
      property.withinTicks < 0
    )
  ) {
    errors.push(
      "Temporal property " +
        property.id +
        " withinTicks must be a non-negative integer.",
    );
  }

  switch (property.kind) {
    case "always":
    case "eventually":
      validateCondition(
        property.condition,
        variables,
        "Temporal property " + property.id,
        errors,
      );
      break;
    case "leads-to":
      validateCondition(
        property.trigger,
        variables,
        "Temporal property " +
          property.id +
          " trigger",
        errors,
      );
      validateCondition(
        property.consequence,
        variables,
        "Temporal property " +
          property.id +
          " consequence",
        errors,
      );
      break;
    case "until":
      validateCondition(
        property.hold,
        variables,
        "Temporal property " +
          property.id +
          " hold",
        errors,
      );
      validateCondition(
        property.until,
        variables,
        "Temporal property " +
          property.id +
          " until",
        errors,
      );
      break;
  }
}

export function validateBehavioralWorldModel(
  model: BehavioralWorldModel,
): string[] {
  const errors: string[] = [];

  if (model.schemaVersion !== 1) {
    errors.push(
      "Behavioral world model schemaVersion must be 1.",
    );
  }
  if (!model.id.trim()) {
    errors.push(
      "Behavioral world model id must be non-empty.",
    );
  }

  for (const id of duplicates(
    model.variables.map((item) => item.id),
  )) {
    errors.push(
      "Duplicate behavior variable id: " + id + ".",
    );
  }
  for (const id of duplicates(
    model.transitions.map((item) => item.id),
  )) {
    errors.push(
      "Duplicate behavior transition id: " +
        id +
        ".",
    );
  }
  for (const id of duplicates(
    model.properties.map((item) => item.id),
  )) {
    errors.push(
      "Duplicate temporal property id: " +
        id +
        ".",
    );
  }

  const variables = new Set(
    model.variables.map((item) => item.id),
  );

  for (const transition of model.transitions) {
    for (const condition of transition.preconditions) {
      validateCondition(
        condition,
        variables,
        "Transition " + transition.id,
        errors,
      );
    }
    for (const effect of transition.effects) {
      if (!variables.has(effect.variableId)) {
        errors.push(
          "Transition " +
            transition.id +
            " effect references unknown variable: " +
            effect.variableId +
            ".",
        );
      }
      if (
        effect.kind === "increment" &&
        !Number.isFinite(effect.amount)
      ) {
        errors.push(
          "Transition " +
            transition.id +
            " increment amount must be finite.",
        );
      }
    }
  }

  for (const property of model.properties) {
    validateTemporal(
      property,
      variables,
      errors,
    );
  }

  return errors;
}
