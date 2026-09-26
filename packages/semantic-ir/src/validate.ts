import type { SemanticIr } from "./types.js";

function duplicateIds(values: readonly { id: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) duplicates.add(value.id);
    seen.add(value.id);
  }
  return [...duplicates].sort();
}

export function validateSemanticIr(ir: SemanticIr): string[] {
  const errors: string[] = [];
  if (ir.schemaVersion !== 1) {
    errors.push("Semantic IR schemaVersion must be 1.");
  }

  const regions = new Set(ir.execution.regions.map((item) => item.id));
  const surfaces = new Set(ir.state.surfaces.map((item) => item.id));

  for (const duplicate of duplicateIds(ir.execution.regions)) {
    errors.push("Duplicate execution region id: " + duplicate);
  }
  for (const duplicate of duplicateIds(ir.execution.edges)) {
    errors.push("Duplicate execution edge id: " + duplicate);
  }
  for (const duplicate of duplicateIds(ir.state.surfaces)) {
    errors.push("Duplicate state surface id: " + duplicate);
  }
  for (const duplicate of duplicateIds(ir.state.operations)) {
    errors.push("Duplicate state operation id: " + duplicate);
  }
  for (const duplicate of duplicateIds(ir.temporal.relations)) {
    errors.push("Duplicate temporal relation id: " + duplicate);
  }

  for (const edge of ir.execution.edges) {
    if (!regions.has(edge.from)) {
      errors.push("Execution edge source does not exist: " + edge.id);
    }
    if (edge.resolution === "resolved") {
      if (!edge.to || !regions.has(edge.to)) {
        errors.push("Resolved execution edge target does not exist: " + edge.id);
      }
    } else if (edge.to !== undefined) {
      errors.push("Unresolved execution edge must not have a resolved target: " + edge.id);
    }
  }

  for (const operation of ir.state.operations) {
    if (!regions.has(operation.executionRegionId)) {
      errors.push("State operation execution region does not exist: " + operation.id);
    }
    if (!surfaces.has(operation.surfaceId)) {
      errors.push("State operation surface does not exist: " + operation.id);
    }
  }

  for (const binding of ir.state.authorityBindings) {
    if (!surfaces.has(binding.authoritySurfaceId)) {
      errors.push("Authority binding references missing authority surface: " + binding.contract.id);
    }
    for (const mirror of binding.mirrorSurfaceIds) {
      if (!surfaces.has(mirror)) {
        errors.push("Authority binding references missing mirror surface: " + binding.contract.id);
      }
    }
  }

  for (const relation of ir.temporal.relations) {
    if (!regions.has(relation.from)) {
      errors.push("Temporal relation source does not exist: " + relation.id);
    }
    if (relation.resolution === "resolved") {
      if (!relation.to || !regions.has(relation.to)) {
        errors.push("Resolved temporal relation target does not exist: " + relation.id);
      }
    } else if (relation.to !== undefined) {
      errors.push("Unresolved temporal relation must not have a resolved target: " + relation.id);
    }
  }

  return errors;
}
