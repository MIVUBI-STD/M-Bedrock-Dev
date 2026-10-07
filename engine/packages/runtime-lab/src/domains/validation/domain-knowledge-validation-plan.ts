export const DOMAIN_RUNTIME_KNOWLEDGE = [
  "ai.schema-version-can-break-behavior",
  "ai.search-cost-can-scale",
  "combat.projectile-block-destruction-separate-gamerule",
  "entity.event.cross-entity-tick-order",
  "entity.event.effects-deferred-to-tick",
  "loot.before-pickup-restricted-mutation",
  "loot.spawn-requires-loaded-location",
  "physics.knockback-rules-version-sensitive",
  "physics.pushability-version-sensitive",
  "state.inventory-slot-has-own-validity",
  "state.scoreboard-identity-can-be-invalid",
  "state.scoreboard-objective-reference-validity"
] as const;
export function domainRuntimeValidationCoverage(){return{total:DOMAIN_RUNTIME_KNOWLEDGE.length,experimentReady:DOMAIN_RUNTIME_KNOWLEDGE.length,probeRequired:0};}
