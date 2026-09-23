import { deriveEntityStateGraph } from "./state-graph.js";
import { extractSensorSemantics } from "./sensors.js";
import type { ParsedEntityDefinition } from "./types.js";

export interface EntityTransitionReachability {
  sensorRootEvents: string[];
  reachableEvents: string[];
  undefinedSensorEvents: string[];
  undefinedTriggeredEvents: string[];
  missingComponentGroups: Array<{
    event: string;
    group: string;
    operation: "add" | "remove";
  }>;
  internallyUnreachedEvents: string[];
}

export function analyzeEntityTransitionReachability(
  entity: ParsedEntityDefinition,
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

  const reachable = new Set<string>();
  const queue = [...sensorRootEvents].filter((event) => definedEvents.has(event));

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

  const internallyUnreachedEvents = [...definedEvents]
    .filter((event) => !reachable.has(event))
    .sort();

  return {
    sensorRootEvents: [...sensorRootEvents].sort(),
    reachableEvents: [...reachable].sort(),
    undefinedSensorEvents,
    undefinedTriggeredEvents: [...undefinedTriggeredEvents].sort(),
    missingComponentGroups: missingComponentGroups.sort((a, b) =>
      a.event.localeCompare(b.event) ||
      a.group.localeCompare(b.group) ||
      a.operation.localeCompare(b.operation)
    ),
    internallyUnreachedEvents,
  };
}
