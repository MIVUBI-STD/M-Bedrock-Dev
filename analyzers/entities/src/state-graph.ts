import type {
  EntityStateCandidate,
  EntityStateGraph,
  ParsedEntityDefinition,
} from "./types.js";

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function deriveEntityStateGraph(
  entity: ParsedEntityDefinition,
): EntityStateGraph {
  const candidates: EntityStateCandidate[] = [{
    id: "base",
    activeComponents: [...entity.baseComponents],
    activeGroups: [],
  }];

  for (const [groupId, components] of Object.entries(entity.componentGroups)) {
    candidates.push({
      id: `group:${groupId}`,
      activeComponents: sortedUnique([...entity.baseComponents, ...components]),
      activeGroups: [groupId],
    });
  }

  for (const [eventId, event] of Object.entries(entity.events)) {
    if (event.addGroups.length === 0) continue;
    const components = event.addGroups.flatMap(
      (groupId) => entity.componentGroups[groupId] ?? [],
    );
    candidates.push({
      id: `event:${eventId}`,
      activeComponents: sortedUnique([...entity.baseComponents, ...components]),
      activeGroups: [...event.addGroups],
      viaEvent: eventId,
    });
  }

  const unique = new Map<string, EntityStateCandidate>();
  for (const candidate of candidates) {
    const key = JSON.stringify({
      components: candidate.activeComponents,
      groups: candidate.activeGroups,
    });
    if (!unique.has(key)) unique.set(key, candidate);
  }

  return {
    candidates: [...unique.values()],
    eventEdges: Object.entries(entity.events).map(([event, mutation]) => ({
      event,
      adds: [...mutation.addGroups],
      removes: [...mutation.removeGroups],
      triggers: [...mutation.triggerEvents],
    })),
  };
}
