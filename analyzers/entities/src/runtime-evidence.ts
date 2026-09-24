import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import { deriveEntityStateGraph } from "./state-graph.js";
import { extractNavigationCapabilities } from "./navigation.js";
import { extractTargetingSemantics } from "./targeting.js";
import { extractAttackSemantics } from "./attack.js";
import { analyzeEntityTransitionReachability } from "./reachability.js";
import type { ParsedEntityDefinition } from "./types.js";

export function entityRuntimeKey(entity: ParsedEntityDefinition): string {
  return entity.identifier ?? entity.runtimeIdentifier ?? entity.source.relativePath;
}

export function entityHasNavigation(entity: ParsedEntityDefinition): boolean {
  return deriveEntityStateGraph(entity).candidates.some(
    (state) => extractNavigationCapabilities(state).navigationComponent !== undefined,
  );
}

export function entityHasConfiguredTargeting(
  entity: ParsedEntityDefinition,
): boolean {
  return deriveEntityStateGraph(entity).candidates.some(
    (state) => extractTargetingSemantics(state).some(
      (item) => item.configuredTargetTypes > 0,
    ),
  );
}

export function entityRuntimeEvidence(
  entity: ParsedEntityDefinition,
  externalRootEvents: readonly string[] = [],
): RuntimeEvidenceRecord[] {
  const entityKey = entityRuntimeKey(entity);
  const scope = { entityKey };
  const records: RuntimeEvidenceRecord[] = [{
    predicate: "entity-definition",
    state: "present",
    confidence: "observed",
    scope,
    sourceRefs: [entity.source],
    note: entityKey,
  }];

  const reachability = analyzeEntityTransitionReachability(entity, { externalRootEvents });
  const brokenTransitions =
    reachability.undefinedSensorEvents.length +
    reachability.undefinedTriggeredEvents.length +
    reachability.missingComponentGroups.length;

  records.push({
    predicate: "entity-transition-integrity",
    state: brokenTransitions === 0 ? "present" : "absent",
    confidence: "derived",
    scope,
    sourceRefs: [entity.source],
    note: brokenTransitions === 0
      ? "No definite broken event/group transitions found."
      : "Definite broken transitions: " + brokenTransitions,
  });

  if (entity.runtimeIdentifier) {
    records.push({
      predicate: "runtime-identifier-engine-behavior",
      state: "present",
      confidence: "observed",
      scope,
      sourceRefs: [entity.source],
      note: entity.runtimeIdentifier,
    });
  }

  for (const state of deriveEntityStateGraph(entity).candidates) {
    const stateScope = { entityKey, operationId: entityKey + ":" + state.id };
    const navigation = extractNavigationCapabilities(state);
    const targeting = extractTargetingSemantics(state);
    const attacks = extractAttackSemantics(state);

    records.push({
      predicate: "entity-state-candidate",
      state: "present",
      confidence: "derived",
      scope: stateScope,
      sourceRefs: [entity.source],
      note: state.id,
    });

    if (navigation.navigationComponent) {
      records.push({
        predicate: "navigation-component-present",
        state: "present",
        confidence: "derived",
        scope: stateScope,
        sourceRefs: [entity.source],
        note: navigation.navigationComponent,
      });
    }
    if (targeting.some((item) => item.configuredTargetTypes > 0)) {
      records.push({
        predicate: "targeting-provider-present",
        state: "present",
        confidence: "derived",
        scope: stateScope,
        sourceRefs: [entity.source],
      });
    }
    if (attacks.length > 0) {
      records.push({
        predicate: "attack-behavior-present",
        state: "present",
        confidence: "derived",
        scope: stateScope,
        sourceRefs: [entity.source],
      });
    }
  }

  return records;
}