import type {
  GameDesignIntentRule,
  GameDesignSpec,
} from "./types.js";

function nonEmptyStringArray(
  value: unknown,
): value is readonly string[] {
  return Array.isArray(value) &&
    value.every((item) =>
      typeof item === "string" &&
      item.trim().length > 0
    );
}

function validateIntentRules(
  value: unknown,
): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    return ["Game Design intentRules must be an array when provided."];
  }

  const errors: string[] = [];
  const ids = new Set<string>();

  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push("Game Design intent rule must be an object.");
      continue;
    }
    const rule = raw as Partial<GameDesignIntentRule>;
    if (typeof rule.id !== "string" || !rule.id.trim()) {
      errors.push("Game Design intent rule id is required.");
      continue;
    }
    if (ids.has(rule.id)) {
      errors.push("Duplicate Game Design intent rule id: " + rule.id + ".");
    }
    ids.add(rule.id);

    if (typeof rule.statement !== "string" || !rule.statement.trim()) {
      errors.push("Game Design intent rule " + rule.id + " requires a statement.");
    }
    if (!["required", "forbidden", "allowed", "unspecified"].includes(String(rule.outcome))) {
      errors.push("Game Design intent rule " + rule.id + " has invalid outcome.");
    }
    if (
      rule.subjectIds !== undefined &&
      !nonEmptyStringArray(rule.subjectIds)
    ) {
      errors.push("Game Design intent rule " + rule.id + " subjectIds must contain non-empty strings.");
    }
    if (
      rule.determinism !== undefined &&
      !["deterministic", "bounded-random", "unspecified"].includes(rule.determinism)
    ) {
      errors.push("Game Design intent rule " + rule.id + " has invalid determinism.");
    }
    if (rule.appliesWhen !== undefined) {
      const scope = rule.appliesWhen as Record<string, unknown>;
      for (const key of ["modes", "phases", "stateTags"] as const) {
        const value = scope[key];
        if (value !== undefined && !nonEmptyStringArray(value)) {
          errors.push(
            "Game Design intent rule " + rule.id +
              " appliesWhen." + key +
              " must contain non-empty strings.",
          );
        }
      }
      const actorTypes = scope.actorTypes;
      if (
        actorTypes !== undefined &&
        (
          !Array.isArray(actorTypes) ||
          actorTypes.some((value) =>
            !["player", "entity", "system"].includes(String(value))
          )
        )
      ) {
        errors.push(
          "Game Design intent rule " + rule.id +
            " appliesWhen.actorTypes is invalid.",
        );
      }
    }

    const exceptionIds = new Set<string>();
    for (const exception of rule.exceptions ?? []) {
      if (
        !exception.id?.trim() ||
        !exception.statement?.trim() ||
        !nonEmptyStringArray(exception.stateTags)
      ) {
        errors.push("Game Design intent rule " + rule.id + " has an invalid exception.");
        continue;
      }
      if (exceptionIds.has(exception.id)) {
        errors.push(
          "Game Design intent rule " + rule.id +
            " has duplicate exception id: " + exception.id + ".",
        );
      }
      exceptionIds.add(exception.id);
    }
  }

  return errors;
}

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
  errors.push(...validateIntentRules(item.intentRules));
  if (!Array.isArray(item.invariants)) errors.push("Game Design invariants must be an array.");
  if (item.behaviorConstraints !== undefined && (!item.behaviorConstraints || typeof item.behaviorConstraints !== "object" || Array.isArray(item.behaviorConstraints))) errors.push("Game Design behaviorConstraints must be an object when provided.");
  return errors;
}

export function assertGameDesignSpec(value: unknown): GameDesignSpec {
  const errors=validateGameDesignSpec(value);
  if (errors.length) throw new Error("Invalid Game Design specification: "+errors.join(" "));
  return value as GameDesignSpec;
}
