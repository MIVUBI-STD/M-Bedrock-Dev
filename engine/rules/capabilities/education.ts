import type { CapabilityRule } from "../../packages/compatibility/src/types.js";

export const EDUCATION_CAPABILITY_RULES: Readonly<Record<string, readonly CapabilityRule[]>> = {
  "education.feature-set": [
    {
      id: "education-feature-set-education-edition",
      editions: ["education"],
      track: "education-only",
      source: "Microsoft Minecraft Education / Creator documentation",
      note: "Minecraft Education exposes its education feature set by product edition.",
    },
  ],

  "education.chemistry": [
    {
      id: "education-chemistry-feature-set",
      editions: ["education"],
      track: "education-only",
      source: "Microsoft Learn Minecraft Education chemistry training",
      note: "Chemistry tools and workflows are part of the Minecraft Education feature set.",
    },
  ],
};
