import type {
  BehavioralWorldModel,
  BehaviorCondition,
  BehaviorPredicate,
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
  if (
    condition.scopeKey !== undefined &&
    !condition.scopeKey.trim()
  ) {
    errors.push(
      label +
        " scopeKey must be non-empty when provided.",
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

function validatePredicate(
  predicate: BehaviorPredicate,
  variables: ReadonlySet<string>,
  label: string,
  errors: string[],
): void {
  switch (predicate.kind) {
    case "condition":
      validateCondition(
        predicate.condition,
        variables,
        label,
        errors,
      );
      break;
    case "all":
    case "any":
      if (predicate.predicates.length === 0) {
        errors.push(
          label +
            " " +
            predicate.kind +
            " predicate must not be empty.",
        );
      }
      predicate.predicates.forEach((item, index) =>
        validatePredicate(
          item,
          variables,
          label + "[" + index + "]",
          errors,
        )
      );
      break;
    case "not":
      validatePredicate(
        predicate.predicate,
        variables,
        label + ".not",
        errors,
      );
      break;
    case "implies":
      validatePredicate(
        predicate.if,
        variables,
        label + ".if",
        errors,
      );
      validatePredicate(
        predicate.then,
        variables,
        label + ".then",
        errors,
      );
      break;
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
      validatePredicate(
        property.predicate,
        variables,
        "Temporal property " + property.id,
        errors,
      );
      break;
    case "leads-to":
      validatePredicate(
        property.trigger,
        variables,
        "Temporal property " +
          property.id +
          " trigger",
        errors,
      );
      validatePredicate(
        property.consequence,
        variables,
        "Temporal property " +
          property.id +
          " consequence",
        errors,
      );
      break;
    case "until":
      validatePredicate(
        property.hold,
        variables,
        "Temporal property " +
          property.id +
          " hold",
        errors,
      );
      validatePredicate(
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
    for (const predicate of transition.preconditions) {
      validatePredicate(
        predicate,
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
        effect.scopeKey !== undefined &&
        !effect.scopeKey.trim()
      ) {
        errors.push(
          "Transition " +
            transition.id +
            " effect scopeKey must be non-empty when provided.",
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
