import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import {
  assessEntityKnowledge,
  type EntityKnowledgeFinding,
} from "../../knowledge/src/entity-reasoning.js";
import type { EffectiveKnowledgeProfile } from "../../knowledge/src/types.js";
import type { ParsedEntityDefinition } from "../../../analyzers/entities/src/types.js";
import { deriveEntityStateGraph } from "../../../analyzers/entities/src/state-graph.js";
import { extractNavigationCapabilities } from "../../../analyzers/entities/src/navigation.js";

export interface EntityStateKnowledgeFinding extends EntityKnowledgeFinding {
  stateId: string;
  activeGroups: string[];
  viaEvent?: string;
}

export interface EntityKnowledgeAnalysis {
  identifier?: string;
  runtimeIdentifier?: string;
  states: number;
  eventEdges: number;
  findings: EntityStateKnowledgeFinding[];
  staticAnalysisLimits: string[];
}

export function analyzeEntityWithKnowledge(
  entity: ParsedEntityDefinition,
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): EntityKnowledgeAnalysis {
  const graph = deriveEntityStateGraph(entity);
  const findings: EntityStateKnowledgeFinding[] = [];

  for (const state of graph.candidates) {
    const navigation = extractNavigationCapabilities(state);
    for (const finding of assessEntityKnowledge(catalog, profile, {
      activeComponents: state.activeComponents,
      availableCapabilities: navigation.capabilities,
    })) {
      findings.push({
        ...finding,
        stateId: state.id,
        activeGroups: [...state.activeGroups],
        ...(state.viaEvent ? { viaEvent: state.viaEvent } : {}),
      });
    }
  }

  const staticAnalysisLimits: string[] = [];
  if (entity.runtimeIdentifier) {
    staticAnalysisLimits.push(
      `runtime_identifier=${entity.runtimeIdentifier} may add engine-code behavior not represented in entity JSON.`,
    );
  }

  return {
    ...(entity.identifier ? { identifier: entity.identifier } : {}),
    ...(entity.runtimeIdentifier ? { runtimeIdentifier: entity.runtimeIdentifier } : {}),
    states: graph.candidates.length,
    eventEdges: graph.eventEdges.length,
    findings,
    staticAnalysisLimits,
  };
}
