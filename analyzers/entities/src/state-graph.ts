import type {
  EntityStateCandidate,
  EntityStateGraph,
  ParsedEntityDefinition,
} from "./types.js";

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function mergeComponentData(
  base: Record<string, unknown>,
  groups: readonly Record<string, unknown>[],
): Record<string, unknown> {
  return Object.assign({}, base, ...groups);
}

export function deriveEntityStateGraph(
  entity: ParsedEntityDefinition,
): EntityStateGraph {
  const candidates: EntityStateCandidate[] = [{
    id: "base",
    activeComponents: [...entity.baseComponents],
    activeComponentData: { ...entity.baseComponentData },
    activeGroups: [],
  }];

  for (const [groupId, components] of Object.entries(entity.componentGroups)) {
    candidates.push({
      id: `group:${groupId}`,
      activeComponents: sortedUnique([...entity.baseComponents, ...components]),
      activeComponentData: mergeComponentData(
        entity.baseComponentData,
        [entity.componentGroupData[groupId] ?? {}],
      ),
      activeGroups: [groupId],
    });
  }

  for (const [eventId, event] of Object.entries(entity.events)) {
    if (event.addGroups.length === 0) continue;
    const groupData = event.addGroups.map(
      (groupId) => entity.componentGroupData[groupId] ?? {},
    );
    const components = groupData.flatMap((data) => Object.keys(data));
    candidates.push({
      id: `event:${eventId}`,
      activeComponents: sortedUnique([...entity.baseComponents, ...components]),
      activeComponentData: mergeComponentData(entity.baseComponentData, groupData),
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
