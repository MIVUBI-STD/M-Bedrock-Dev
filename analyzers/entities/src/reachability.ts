import { deriveEntityStateGraph } from "./state-graph.js";
import { extractSensorSemantics } from "./sensors.js";
import type { ParsedEntityDefinition } from "./types.js";

export interface EntityTransitionReachability {
  sensorRootEvents: string[];
  externalRootEvents: string[];
  reachableEvents: string[];
  externallyReachableEvents: string[];
  undefinedSensorEvents: string[];
  undefinedTriggeredEvents: string[];
  missingComponentGroups: Array<{
    event: string;
    group: string;
    operation: "add" | "remove";
  }>;
  internallyUnreachedEvents: string[];
  unresolvedReachabilityEvents: string[];
}

export interface EntityTransitionReachabilityOptions {
  externalRootEvents?: readonly string[];
}

const ENGINE_ROOT_EVENTS = new Set([
  "minecraft:entity_born",
  "minecraft:entity_spawned",
  "minecraft:entity_transformed",
  "minecraft:on_prime",
]);

function followEvents(
  roots: readonly string[],
  definedEvents: ReadonlySet<string>,
  entity: ParsedEntityDefinition,
): Set<string> {
  const reachable = new Set<string>();
  const queue = roots.filter((event) => definedEvents.has(event));

  while (queue.length > 0) {
    const event = queue.shift()!;
    if (reachable.has(event)) continue;
    reachable.add(event);
    const mutation = entity.events[event];
    if (!mutation) continue;
    for (const next of mutation.triggerEvents) {
      if (definedEvents.has(next) && !reachable.has(next)) queue.push(next);
    }
  }

  return reachable;
}

export function analyzeEntityTransitionReachability(
  entity: ParsedEntityDefinition,
  options: EntityTransitionReachabilityOptions = {},
): EntityTransitionReachability {
  const graph = deriveEntityStateGraph(entity);
  const definedEvents = new Set(Object.keys(entity.events));
  const definedGroups = new Set(Object.keys(entity.componentGroups));

  const sensorRootEvents = new Set<string>();
  for (const state of graph.candidates) {
    for (const sensor of extractSensorSemantics(state)) {
      for (const event of sensor.emittedEvents) sensorRootEvents.add(event);
    }
  }

  const undefinedSensorEvents = [...sensorRootEvents]
    .filter((event) => !definedEvents.has(event))
    .sort();

  const undefinedTriggeredEvents = new Set<string>();
  const missingComponentGroups: EntityTransitionReachability["missingComponentGroups"] = [];

  for (const [eventId, mutation] of Object.entries(entity.events)) {
    for (const event of mutation.triggerEvents) {
      if (!definedEvents.has(event)) undefinedTriggeredEvents.add(event);
    }
    for (const group of mutation.addGroups) {
      if (!definedGroups.has(group)) {
        missingComponentGroups.push({ event: eventId, group, operation: "add" });
      }
    }
    for (const group of mutation.removeGroups) {
      if (!definedGroups.has(group)) {
        missingComponentGroups.push({ event: eventId, group, operation: "remove" });
      }
    }
  }

  const reachable = followEvents(
    [...sensorRootEvents],
    definedEvents,
    entity,
  );

  const externalRootEvents = new Set<string>(
    (options.externalRootEvents ?? []).filter((event) => definedEvents.has(event)),
  );
  for (const event of definedEvents) {
    if (ENGINE_ROOT_EVENTS.has(event)) externalRootEvents.add(event);
  }

  const externallyReachable = followEvents(
    [...externalRootEvents],
    definedEvents,
    entity,
  );

  const internallyUnreachedEvents = [...definedEvents]
    .filter((event) => !reachable.has(event))
    .sort();

  const unresolvedReachabilityEvents = internallyUnreachedEvents
    .filter((event) => !externallyReachable.has(event))
    .sort();

  return {
    sensorRootEvents: [...sensorRootEvents].sort(),
    externalRootEvents: [...externalRootEvents].sort(),
    reachableEvents: [...reachable].sort(),
    externallyReachableEvents: [...externallyReachable].sort(),
    undefinedSensorEvents,
    undefinedTriggeredEvents: [...undefinedTriggeredEvents].sort(),
    missingComponentGroups: missingComponentGroups.sort((a, b) =>
      a.event.localeCompare(b.event) ||
      a.group.localeCompare(b.group) ||
      a.operation.localeCompare(b.operation)
    ),
    internallyUnreachedEvents,
    unresolvedReachabilityEvents,
  };
}
