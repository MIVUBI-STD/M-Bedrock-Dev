export const INTERACTION_RUNTIME_KNOWLEDGE = [
  "input.before-use-can-cancel",
  "input.cooldown-category-shared",
  "input.cooldown-runtime-query",
  "input.relation-before-gates-use",
  "input.relation-cooldown-gates-action",
  "input.release-use-carries-duration",
  "input.start-stop-release-distinct",
  "input.start-use-on-first-block",
  "input.stop-use-can-fire-on-dimension-change",
  "interaction.entity-interact-exposes-before-after-item",
  "interaction.form-show-restricted-illegal",
  "interaction.input-permission-change-observable"
] as const;

export function interactionRuntimeValidationCoverage() {
  return {
    total: INTERACTION_RUNTIME_KNOWLEDGE.length,
    experimentReady: INTERACTION_RUNTIME_KNOWLEDGE.length,
    probeRequired: 0,
  };
}
