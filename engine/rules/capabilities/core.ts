import type { CapabilityRule } from "../../packages/compatibility/src/types.js";

export const CORE_CAPABILITY_RULES: Readonly<Record<string, readonly CapabilityRule[]>> = {
  "manifest.format-v2": [
    {
      id: "manifest-format-v2-bedrock",
      editions: ["bedrock", "education"],
      track: "stable",
      source: "Microsoft Creator manifest documentation",
      note: "Behavior/resource pack manifests use format version 2 for modern content.",
    },
  ],

  "script-api.beta": [
    {
      id: "script-api-beta-experiment",
      editions: ["bedrock", "education"],
      track: "beta",
      requiresExperiment: "Beta APIs",
      source: "Microsoft Creator Script Module Versioning",
      note: "Beta Script API modules require the Beta APIs experiment.",
    },
  ],
};
