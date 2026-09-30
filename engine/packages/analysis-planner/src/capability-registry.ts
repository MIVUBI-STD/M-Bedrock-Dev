import type {
  AnalysisCapability,
  AnalysisExecutionContext,
} from "./types.js";

export interface AnalysisCapabilityRegistry {
  schemaVersion: 1;
  capabilities: readonly AnalysisCapability[];
}

function duplicates(
  values: readonly string[],
): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

export function validateAnalysisCapabilityRegistry(
  registry: AnalysisCapabilityRegistry,
): string[] {
  const errors: string[] = [];

  if (registry.schemaVersion !== 1) {
    errors.push(
      "Unsupported analysis capability registry schemaVersion.",
    );
  }

  const ids = new Set<string>();

  for (const capability of registry.capabilities) {
    if (!capability.id.trim()) {
      errors.push(
        "Analysis capability id must be non-empty.",
      );
      continue;
    }

    if (ids.has(capability.id)) {
      errors.push(
        "Duplicate analysis capability id: " +
          capability.id +
          ".",
      );
    }
    ids.add(capability.id);

    if (capability.contexts.length === 0) {
      errors.push(
        "Analysis capability " +
          capability.id +
          " must declare at least one execution context.",
      );
    }

    if (capability.tags.length === 0) {
      errors.push(
        "Analysis capability " +
          capability.id +
          " must declare at least one relevance tag.",
      );
    }

    if (
      (capability.producesTraits ?? []).length === 0
    ) {
      errors.push(
        "Analysis capability " +
          capability.id +
          " must declare at least one produced evidence trait.",
      );
    }

    for (const label of [
      ["tag", capability.tags],
      [
        "prerequisite",
        capability.prerequisites ?? [],
      ],
      [
        "evidence trait",
        capability.producesTraits ?? [],
      ],
      ["context", capability.contexts],
    ] as const) {
      const repeated = duplicates(
        label[1] as readonly string[],
      );
      if (repeated.length > 0) {
        errors.push(
          "Analysis capability " +
            capability.id +
            " has duplicate " +
            label[0] +
            "(s): " +
            repeated.join(", ") +
            ".",
        );
      }
    }
  }

  const byId = new Map(
    registry.capabilities.map((item) => [
      item.id,
      item,
    ]),
  );

  for (const capability of registry.capabilities) {
    for (const prerequisiteId of
      capability.prerequisites ?? []) {
      if (prerequisiteId === capability.id) {
        errors.push(
          "Analysis capability " +
            capability.id +
            " cannot depend on itself.",
        );
      } else if (!byId.has(prerequisiteId)) {
        errors.push(
          "Analysis capability " +
            capability.id +
            " references unknown prerequisite " +
            prerequisiteId +
            ".",
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const cycleKeys = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      const cycle = [
        ...stack.slice(index),
        id,
      ];
      const key = cycle.join(" -> ");
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        errors.push(
          "Analysis capability prerequisite cycle: " +
            key +
            ".",
        );
      }
      return;
    }

    visiting.add(id);
    stack.push(id);

    const capability = byId.get(id);
    for (const prerequisiteId of
      capability?.prerequisites ?? []) {
      if (byId.has(prerequisiteId)) {
        visit(prerequisiteId);
      }
    }

    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of [...byId.keys()].sort()) {
    visit(id);
  }

  return errors;
}

export function createAnalysisCapabilityRegistry(
  capabilities: readonly AnalysisCapability[],
): AnalysisCapabilityRegistry {
  const registry: AnalysisCapabilityRegistry = {
    schemaVersion: 1,
    capabilities: [...capabilities]
      .map((item) => ({
        ...item,
        tags: [...item.tags].sort(),
        contexts: [...item.contexts].sort(),
        ...(item.producesTraits === undefined
          ? {}
          : {
              producesTraits:
                [...item.producesTraits].sort(),
            }),
        ...(item.prerequisites === undefined
          ? {}
          : {
              prerequisites:
                [...item.prerequisites].sort(),
            }),
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      ),
  };

  const errors =
    validateAnalysisCapabilityRegistry(registry);

  if (errors.length > 0) {
    throw new Error(
      "Invalid analysis capability registry: " +
        errors.join("; "),
    );
  }

  return registry;
}

export function analysisCapabilitiesFor(
  registry: AnalysisCapabilityRegistry,
  tags: readonly string[],
  context: AnalysisExecutionContext,
): AnalysisCapability[] {
  const wanted = new Set(tags);

  return registry.capabilities
    .filter(
      (capability) =>
        capability.contexts.includes(context) &&
        (
          tags.length === 0 ||
          capability.tags.some((tag) =>
            wanted.has(tag)
          )
        ),
    )
    .map((item) => ({ ...item }));
}
