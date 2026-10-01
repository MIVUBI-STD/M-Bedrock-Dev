import type { GameDesignSpec } from "./types.js";

export function validateGameDesignSpec(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Game Design specification must be an object."];
  const item=value as Record<string,unknown>;
  const errors:string[]=[];
  if (item.schemaVersion!==1) errors.push("Game Design schemaVersion must be 1.");
  if (typeof item.id!=="string" || !item.id.trim()) errors.push("Game Design id is required.");
  if (item.status!=="draft" && item.status!=="approved") errors.push("Game Design status must be draft or approved.");
  if (!item.source || typeof item.source!=="object" || Array.isArray(item.source)) errors.push("Game Design source is required.");
  else {
    const source=item.source as Record<string,unknown>;
    if (!["authored-spec","client-brief","approved-reconstruction"].includes(String(source.kind))) errors.push("Game Design source kind is invalid.");
    if (typeof source.reference!=="string" || !source.reference.trim()) errors.push("Game Design source reference is required.");
  }
  if (!Array.isArray(item.mechanics)) errors.push("Game Design mechanics must be an array.");
  if (!Array.isArray(item.invariants)) errors.push("Game Design invariants must be an array.");
  if (item.behaviorConstraints !== undefined && (!item.behaviorConstraints || typeof item.behaviorConstraints !== "object" || Array.isArray(item.behaviorConstraints))) errors.push("Game Design behaviorConstraints must be an object when provided.");
  return errors;
}

export function assertGameDesignSpec(value: unknown): GameDesignSpec {
  const errors=validateGameDesignSpec(value);
  if (errors.length) throw new Error("Invalid Game Design specification: "+errors.join(" "));
  return value as GameDesignSpec;
}
