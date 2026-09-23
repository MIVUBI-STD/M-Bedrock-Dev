import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import {
  assessEntityKnowledge,
  type EntityKnowledgeFinding,
} from "../../knowledge/src/entity-reasoning.js";
import type { EffectiveKnowledgeProfile } from "../../knowledge/src/types.js";
import type { ParsedEntityDefinition } from "../../../analyzers/entities/src/types.js";
import { deriveEntityStateGraph } from "../../../analyzers/entities/src/state-graph.js";
import { extractNavigationCapabilities } from "../../../analyzers/entities/src/navigation.js";
import { extractTargetingSemantics } from "../../../analyzers/entities/src/targeting.js";
import { extractAttackSemantics } from "../../../analyzers/entities/src/attack.js";
import { extractSensorSemantics } from "../../../analyzers/entities/src/sensors.js";
import { analyzeEntityTransitionReachability } from "../../../analyzers/entities/src/reachability.js";

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
  targetingProviders: number;
  configuredTargetProviders: number;
  attackBehaviors: number;
  sensors: number;
  configuredSensorEvents: number;
  reachableEvents: number;
  brokenTransitions: number;
  internallyUnreachedEvents: number;
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
  let targetingProviders = 0;
  let configuredTargetProviders = 0;
  let attackBehaviors = 0;
  let sensors = 0;
  let configuredSensorEvents = 0;

  for (const state of graph.candidates) {
    const navigation = extractNavigationCapabilities(state);
    const targeting = extractTargetingSemantics(state);
    targetingProviders += targeting.length;
    configuredTargetProviders += targeting.filter(
      (item) => item.configuredTargetTypes > 0,
    ).length;

    const targetingCapabilities = targeting.flatMap((item) => item.capabilities);
    const attacks = extractAttackSemantics(state);
    const sensorSemantics = extractSensorSemantics(state);
    attackBehaviors += attacks.length;
    sensors += sensorSemantics.length;
    configuredSensorEvents += sensorSemantics.filter((item) => item.emittedEvents.length > 0).length;
    const attackCapabilities = attacks.flatMap((item) => item.capabilities);
    const sensorCapabilities = sensorSemantics.flatMap((item) => item.capabilities);

    for (const finding of assessEntityKnowledge(catalog, profile, {
      activeComponents: state.activeComponents,
      availableCapabilities: [
        ...navigation.capabilities,
        ...targetingCapabilities,
        ...attackCapabilities,
        ...sensorCapabilities,
      ],
    })) {
      findings.push({
        ...finding,
        stateId: state.id,
        activeGroups: [...state.activeGroups],
        ...(state.viaEvent ? { viaEvent: state.viaEvent } : {}),
      });
    }
  }

  const reachability = analyzeEntityTransitionReachability(entity);
  const brokenTransitions =
    reachability.undefinedSensorEvents.length +
    reachability.undefinedTriggeredEvents.length +
    reachability.missingComponentGroups.length;

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
    targetingProviders,
    configuredTargetProviders,
    attackBehaviors,
    sensors,
    configuredSensorEvents,
    reachableEvents: reachability.reachableEvents.length,
    brokenTransitions,
    internallyUnreachedEvents: reachability.internallyUnreachedEvents.length,
    findings,
    staticAnalysisLimits,
  };
}
