import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { EntityEventMutation, EntityEventProgram, ParsedEntityDefinition } from "./types.js";

export const ENTITY_PARSER_REVISION = "m-bedrock-entity-parser:2";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function componentData(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}

function componentKeys(value: unknown): string[] {
  return Object.keys(componentData(value)).sort();
}

function collectGroups(value: unknown): string[] {
  const groups = asRecord(value)?.component_groups;
  return Array.isArray(groups)
    ? groups.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/** MAY source references. Recursive alternatives are never one group state. */
function scanEventNode(value: unknown, output: EntityEventMutation): void {
  if (Array.isArray(value)) {
    for (const item of value) scanEventNode(item, output);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  output.addGroups.push(...collectGroups(record.add));
  output.removeGroups.push(...collectGroups(record.remove));
  if (typeof record.trigger === "string") output.triggerEvents.push(record.trigger);
  const trigger = asRecord(record.trigger);
  if (typeof trigger?.event === "string" &&
      (trigger.target === undefined || trigger.target === "self")) {
    output.triggerEvents.push(trigger.event);
  }
  for (const key of ["sequence", "randomize"]) {
    if (record[key] !== undefined) scanEventNode(record[key], output);
  }
}

const EVENT_KEYS = new Set([
  "add", "remove", "trigger", "sequence", "randomize", "filters", "weight",
]);
const MAX_PROGRAM_DEPTH = 24;

function parseEventProgram(
  value: unknown,
  path: string,
  depth = 0,
): EntityEventProgram {
  const unknown = (reason: string): EntityEventProgram =>
    ({ kind: "unsupported", path, reason });
  if (depth >= MAX_PROGRAM_DEPTH) return unknown("Nested event exceeds bounded source depth.");
  const record = asRecord(value);
  if (!record) return unknown("Event node is not an object.");
  const other = Object.keys(record).filter(key => !EVENT_KEYS.has(key));
  if (other.length > 0) return unknown("Unsupported entity event operators: " + other.sort().join(", "));
  const hasSequence = record.sequence !== undefined;
  const hasRandomize = record.randomize !== undefined;
  const hasDirect = record.add !== undefined ||
    record.remove !== undefined || record.trigger !== undefined;
  if ([hasSequence, hasRandomize, hasDirect].filter(Boolean).length > 1) {
    return unknown("Combined direct/sequence/randomize execution order is unresolved.");
  }
  if (record.weight !== undefined &&
      (typeof record.weight !== "number" ||
       !Number.isFinite(record.weight) || record.weight < 0)) {
    return unknown("Randomize weight is invalid.");
  }
  const guard = record.filters === undefined ? {} : { filters: record.filters };
  const weight = typeof record.weight === "number" ? { weight: record.weight } : {};
  if (hasSequence || hasRandomize) {
    const kind = hasSequence ? "sequence" as const : "randomize" as const;
    const rawSteps = hasSequence ? record.sequence : record.randomize;
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
      return unknown(kind + " must contain a nonempty array.");
    }
    return {
      kind, path, ...guard, ...weight,
      steps: rawSteps.map((step, index) =>
        parseEventProgram(step, path + "/" + kind + "/" + index, depth + 1)),
    };
  }
  if ((record.add !== undefined && !Array.isArray(asRecord(record.add)?.component_groups)) ||
      (record.remove !== undefined && !Array.isArray(asRecord(record.remove)?.component_groups))) {
    return unknown("Add/remove component_groups must be arrays.");
  }
  const triggerObj = asRecord(record.trigger);
  const trigger = typeof record.trigger === "string" ? record.trigger : triggerObj?.event;
  if (record.trigger !== undefined &&
      (typeof trigger !== "string" ||
       (triggerObj !== undefined && triggerObj.target !== undefined &&
        triggerObj.target !== "self"))) {
    return unknown("Event trigger target or name is not a statically local event.");
  }
  if (triggerObj && Object.keys(triggerObj).some(key => key !== "event" && key !== "target")) {
    return unknown("Event trigger has unsupported options.");
  }
  return {
    kind: "mutation", path, ...guard, ...weight,
    addGroups: collectGroups(record.add),
    removeGroups: collectGroups(record.remove),
    triggerEvents: typeof trigger === "string" ? [trigger] : [],
  };
}

function normalizeEvent(value: unknown, path: string): EntityEventMutation {
  const output: EntityEventMutation = {
    addGroups: [], removeGroups: [], triggerEvents: [],
    program: parseEventProgram(value, path),
  };
  scanEventNode(value, output);
  output.addGroups = [...new Set(output.addGroups)].sort();
  output.removeGroups = [...new Set(output.removeGroups)].sort();
  output.triggerEvents = [...new Set(output.triggerEvents)].sort();
  return output;
}

function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function parseEntityDefinition(
  raw: unknown,
  source: SourceRef,
): ParsedEntityDefinition {
  const root = asRecord(raw) ?? {};
  const entity = asRecord(root["minecraft:entity"]) ?? {};
  const description = asRecord(entity.description) ?? {};
  const groups = asRecord(entity.component_groups) ?? {};
  const events = asRecord(entity.events) ?? {};
  const componentGroups: Record<string, string[]> = {};
  const componentGroupData: Record<string, Record<string, unknown>> = {};
  for (const [groupId, groupValue] of Object.entries(groups)) {
    const data = componentData(groupValue);
    componentGroups[groupId] = Object.keys(data).sort();
    componentGroupData[groupId] = data;
  }
  const normalizedEvents: Record<string, EntityEventMutation> = {};
  for (const [eventId, eventValue] of Object.entries(events)) {
    normalizedEvents[eventId] = normalizeEvent(
      eventValue, "/minecraft:entity/events/" + pointerToken(eventId));
  }
  return {
    ...(typeof description.identifier === "string" ? { identifier: description.identifier } : {}),
    ...(typeof description.runtime_identifier === "string" ? { runtimeIdentifier: description.runtime_identifier } : {}),
    ...(
      typeof root.format_version === "string" ||
      typeof root.format_version === "number"
        ? { formatVersion: String(root.format_version) } : {}
    ),
    source,
    baseComponents: componentKeys(entity.components),
    baseComponentData: componentData(entity.components),
    componentGroups,
    componentGroupData,
    events: normalizedEvents,
  };
}
