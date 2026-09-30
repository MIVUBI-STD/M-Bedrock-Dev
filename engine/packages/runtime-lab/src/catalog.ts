import {
  validateRuntimeExperimentDefinition,
} from "./validate.js";
import type {
  RuntimeExperimentDefinition,
} from "./types.js";

export interface RuntimeExperimentCatalog {
  schemaVersion: 1;
  experiments: readonly RuntimeExperimentDefinition[];
}

export function validateRuntimeExperimentCatalog(
  catalog: RuntimeExperimentCatalog,
): string[] {
  const errors: string[] = [];
  if (catalog.schemaVersion !== 1) {
    errors.push("Runtime experiment catalog schemaVersion must be 1.");
  }

  const ids = new Set<string>();
  for (const experiment of catalog.experiments) {
    if (ids.has(experiment.id)) {
      errors.push(
        "Duplicate runtime experiment id: " +
          experiment.id +
          ".",
      );
    }
    ids.add(experiment.id);
    errors.push(
      ...validateRuntimeExperimentDefinition(experiment).map(
        (error) => experiment.id + ": " + error,
      ),
    );
  }
  return errors;
}

export function runtimeExperimentById(
  catalog: RuntimeExperimentCatalog,
  id: string,
): RuntimeExperimentDefinition | undefined {
  return catalog.experiments.find(
    (experiment) => experiment.id === id,
  );
}
