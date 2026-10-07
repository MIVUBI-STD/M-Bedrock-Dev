import type { RuntimeActionCapability } from "../../core/action-capability.js";
import type { RuntimeExperimentDefinition } from "../../core/types.js";

export interface DomainValidationInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  minimumRunsPerArm?: number;
}

export const DOMAIN_VALIDATION_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "domain.reset-fixture",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: { fixtureId: "string" },
  }, {
    id: "domain.run-ai-version-fixture",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: { variant: "string" },
  }, {
    id: "domain.run-loot-fixture",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: { restrictedContext: "boolean", loadedLocation: "boolean" },
  }, {
    id: "domain.run-physics-fixture",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: { variant: "string" },
  }, {
    id: "domain.run-state-handle-fixture",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: { staleHandle: "boolean" },
  }, {
    id: "domain.cleanup-fixture",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: { fixtureId: "string" },
  }];

function make(
  input: DomainValidationInput,
  actionId: string,
  parameters: Readonly<Record<string,string|number|boolean>>,
  factorId: string,
  control: string|number|boolean,
  treatment: string|number|boolean,
  predicates: readonly string[],
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1, id: input.id, title: input.title,
    domain: "compatibility", requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id:"reset",phase:"setup",actionId:"domain.reset-fixture",
      parameters:{fixtureId:input.id},
    },{
      id:"stimulus",phase:"stimulus",actionId,
      parameters,
    },...predicates.map(predicate=>({
      id:"probe-"+predicate,phase:"observe" as const,
      actionId:"probe.scoreboard-value",
      parameters:{objectiveId:input.objectiveId,participant:input.participant,expected:1,predicate},
    })),{
      id:"cleanup",phase:"teardown",actionId:"domain.cleanup-fixture",
      parameters:{fixtureId:input.id},
    }],
    factors:[{id:factorId,description:"Controlled domain validation factor."}],
    arms:[
      {id:"control",role:"control",factorValues:{[factorId]:control}},
      {id:"treatment",role:"treatment",factorValues:{[factorId]:treatment}},
    ],
    outcomePredicateIds:predicates,
    minimumRunsPerArm:input.minimumRunsPerArm??2,
  };
}

export function createAiCompatibilityExperiment(input:DomainValidationInput){
 return make(input,"domain.run-ai-version-fixture",{variant:"$factor.variant"},"variant","baseline","alternate",[
  "ai-schema-behavior-observed","ai-search-cost-observed","cross-entity-order-observed","entity-effects-tick-deferral-observed"
 ]);
}
export function createLootRuntimeExperiment(input:DomainValidationInput){
 return make(input,"domain.run-loot-fixture",{restrictedContext:"$factor.restricted",loadedLocation:"$factor.restricted"},"restricted",false,true,[
  "loot-restricted-mutation-observed","loot-loaded-location-requirement-observed"
 ]);
}
export function createPhysicsCompatibilityExperiment(input:DomainValidationInput){
 return make(input,"domain.run-physics-fixture",{variant:"$factor.variant"},"variant","baseline","alternate",[
  "projectile-block-destruction-observed","knockback-version-behavior-observed","pushability-version-behavior-observed"
 ]);
}
export function createStateHandleValidityExperiment(input:DomainValidationInput){
 return make(input,"domain.run-state-handle-fixture",{staleHandle:"$factor.stale"},"stale",false,true,[
  "inventory-slot-validity-observed","scoreboard-identity-validity-observed","scoreboard-objective-validity-observed"
 ]);
}
