import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type {
  EntityEventMutation,
  ParsedEntityDefinition,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function componentKeys(value: unknown): string[] {
  const record = asRecord(value);
  return record ? Object.keys(record).sort() : [];
}

function collectGroups(value: unknown): string[] {
  const record = asRecord(value);
  const groups = record?.component_groups;
  return Array.isArray(groups)
    ? groups.filter((item): item is string => typeof item === "string")
    : [];
}

function scanEventNode(
  value: unknown,
  output: EntityEventMutation,
): void {
  if (Array.isArray(value)) {
    for (const item of value) scanEventNode(item, output);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const add = asRecord(record.add);
  const remove = asRecord(record.remove);
  output.addGroups.push(...collectGroups(add));
  output.removeGroups.push(...collectGroups(remove));

  if (typeof record.trigger === "string") {
    output.triggerEvents.push(record.trigger);
  }

  for (const [key, nested] of Object.entries(record)) {
    if (key === "add" || key === "remove" || key === "trigger") continue;
    scanEventNode(nested, output);
  }
}

function normalizeEvent(value: unknown): EntityEventMutation {
  const output: EntityEventMutation = {
    addGroups: [],
    removeGroups: [],
    triggerEvents: [],
  };
  scanEventNode(value, output);
  output.addGroups = [...new Set(output.addGroups)].sort();
  output.removeGroups = [...new Set(output.removeGroups)].sort();
  output.triggerEvents = [...new Set(output.triggerEvents)].sort();
  return output;
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
  for (const [groupId, groupValue] of Object.entries(groups)) {
    componentGroups[groupId] = componentKeys(groupValue);
  }

  const normalizedEvents: Record<string, EntityEventMutation> = {};
  for (const [eventId, eventValue] of Object.entries(events)) {
    normalizedEvents[eventId] = normalizeEvent(eventValue);
  }

  return {
    ...(typeof description.identifier === "string"
      ? { identifier: description.identifier }
      : {}),
    ...(typeof description.runtime_identifier === "string"
      ? { runtimeIdentifier: description.runtime_identifier }
      : {}),
    ...(
      typeof root.format_version === "string" ||
      typeof root.format_version === "number"
        ? { formatVersion: String(root.format_version) }
        : {}
    ),
    source,
    baseComponents: componentKeys(entity.components),
    componentGroups,
    events: normalizedEvents,
  };
}
