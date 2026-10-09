import type {
  KnowledgeApplicability,
  KnowledgeFact,
  KnowledgeRelation,
} from "./types.js";
import {
  compareDottedNumericVersions,
  compareScriptSemver,
  type MinecraftProductEdition,
  type MinecraftRuntimeHost,
  type MinecraftRuntimeProfile,
  type ScriptModuleTrack,
} from "../../runtime-profile/src/index.js";

export interface KnowledgeRuntimeConstraint {
  editions?: readonly MinecraftProductEdition[];
  hosts?: readonly MinecraftRuntimeHost[];
  experimentsAll?: readonly string[];
  minProductVersion?: string;
  maxProductVersionInclusive?: string;
  scriptModules?: Readonly<Record<string, {
    minVersion?: string;
    maxVersionExclusive?: string;
    tracks?: readonly ScriptModuleTrack[];
  }>>;
  educationFeatures?: boolean;
}

export type KnowledgeApplicabilityState =
  | "applies"
  | "does-not-apply"
  | "unknown";

export interface KnowledgeApplicabilityDecision {
  state: KnowledgeApplicabilityState;
  reasons: readonly string[];
  missing: readonly string[];
}

function unknownDecision(
  reasons: string[],
  missing: string[],
): KnowledgeApplicabilityDecision {
  return {
    state: "unknown",
    reasons,
    missing: [...new Set(missing)].sort(),
  };
}

export function evaluateKnowledgeApplicabilityV2(
  constraint: KnowledgeRuntimeConstraint,
  profile: MinecraftRuntimeProfile,
): KnowledgeApplicabilityDecision {
  const reasons: string[] = [];
  const missing: string[] = [];

  if (
    constraint.editions &&
    !constraint.editions.includes(profile.product.edition)
  ) {
    return {
      state: "does-not-apply",
      reasons: ["Target product edition is outside the claim scope."],
      missing: [],
    };
  }

  if (constraint.hosts && !constraint.hosts.includes(profile.host)) {
    return {
      state: "does-not-apply",
      reasons: ["Target runtime host is outside the claim scope."],
      missing: [],
    };
  }

  if (constraint.minProductVersion) {
    const comparison = compareDottedNumericVersions(
      profile.product.version,
      constraint.minProductVersion,
    );
    if (comparison === undefined) {
      missing.push("comparable-product-version");
      reasons.push("Product version cannot be compared safely.");
    } else if (comparison < 0) {
      return {
        state: "does-not-apply",
        reasons: ["Target product version predates the claim scope."],
        missing: [],
      };
    }
  }

  if (constraint.maxProductVersionInclusive) {
    const comparison = compareDottedNumericVersions(
      profile.product.version,
      constraint.maxProductVersionInclusive,
    );
    if (comparison === undefined) {
      missing.push("comparable-product-version");
      reasons.push("Product version cannot be compared safely.");
    } else if (comparison > 0) {
      return {
        state: "does-not-apply",
        reasons: ["Target product version exceeds the claim scope."],
        missing: [],
      };
    }
  }

  for (const experiment of constraint.experimentsAll ?? []) {
    if (profile.experiments.includes(experiment)) continue;

    if (profile.inventory.experiments === "complete") {
      return {
        state: "does-not-apply",
        reasons: ["Required experiment is absent: " + experiment],
        missing: [],
      };
    }

    missing.push("experiment:" + experiment);
    reasons.push(
      "Required experiment is not observed, but experiment inventory is not complete.",
    );
  }

  for (const [moduleName, moduleConstraint] of Object.entries(
    constraint.scriptModules ?? {},
  )) {
    const actual = profile.scriptModules[moduleName];
    if (!actual) {
      if (profile.inventory.scriptModules === "complete") {
        return {
          state: "does-not-apply",
          reasons: ["Required Script API module is absent: " + moduleName],
          missing: [],
        };
      }
      missing.push("script-module:" + moduleName);
      reasons.push(
        "Required Script API module is not observed, but module inventory is not complete.",
      );
      continue;
    }

    if (
      moduleConstraint.tracks &&
      !moduleConstraint.tracks.includes(actual.track)
    ) {
      return {
        state: "does-not-apply",
        reasons: [
          "Script API track is outside the claim scope for " + moduleName + ".",
        ],
        missing: [],
      };
    }

    if (moduleConstraint.minVersion) {
      const comparison = compareScriptSemver(
        actual.version,
        moduleConstraint.minVersion,
      );
      if (comparison === undefined) {
        missing.push("comparable-script-version:" + moduleName);
        reasons.push(
          "Script API version cannot be compared safely for " + moduleName + ".",
        );
      } else if (comparison < 0) {
        return {
          state: "does-not-apply",
          reasons: [
            "Script API module predates the claim scope: " + moduleName,
          ],
          missing: [],
        };
      }
    }

    if (moduleConstraint.maxVersionExclusive) {
      const comparison = compareScriptSemver(
        actual.version,
        moduleConstraint.maxVersionExclusive,
      );
      if (comparison === undefined) {
        missing.push("comparable-script-version:" + moduleName);
        reasons.push(
          "Script API version cannot be compared safely for " + moduleName + ".",
        );
      } else if (comparison >= 0) {
        return {
          state: "does-not-apply",
          reasons: [
            "Script API module exceeds the claim scope: " + moduleName,
          ],
          missing: [],
        };
      }
    }
  }

  if (constraint.educationFeatures !== undefined) {
    const actual = profile.world?.educationFeatures;
    if (actual === undefined) {
      if (profile.inventory.worldSettings === "complete") {
        return {
          state: "does-not-apply",
          reasons: [
            "Education-features state is absent from a complete world-settings inventory.",
          ],
          missing: [],
        };
      }
      missing.push("world.educationFeatures");
      reasons.push(
        "Education-features state is unknown for the target world.",
      );
    } else if (actual !== constraint.educationFeatures) {
      return {
        state: "does-not-apply",
        reasons: [
          "Education-features state is outside the claim scope.",
        ],
        missing: [],
      };
    }
  }

  if (missing.length > 0) {
    return unknownDecision(reasons, missing);
  }

  return {
    state: "applies",
    reasons: ["All declared runtime constraints match the target profile."],
    missing: [],
  };
}

export function runtimeConstraintFromLegacyKnowledgeApplicability(
  applicability: KnowledgeApplicability,
): KnowledgeRuntimeConstraint {
  const editions = new Set<MinecraftProductEdition>();
  for (const edition of applicability.editions) {
    if (edition === "bedrock") {
      editions.add("bedrock-retail");
      editions.add("bedrock-preview");
    } else {
      editions.add("education");
    }
  }

  const versions = applicability.versions;
  const scriptModules =
    versions?.scriptModule === undefined
      ? undefined
      : {
          [versions.scriptModule]: {
            ...(versions.scriptModuleVersion === undefined
              ? {}
              : { minVersion: versions.scriptModuleVersion }),
          },
        };

  return {
    editions: [...editions],
    ...(applicability.experiments === undefined
      ? {}
      : { experimentsAll: applicability.experiments }),
    ...(versions?.minMinecraftVersion === undefined
      ? {}
      : { minProductVersion: versions.minMinecraftVersion }),
    ...(versions?.maxMinecraftVersion === undefined
      ? {}
      : { maxProductVersionInclusive: versions.maxMinecraftVersion }),
    ...(scriptModules === undefined ? {} : { scriptModules }),
  };
}

export function evaluateLegacyKnowledgeApplicabilityV2(
  item: KnowledgeFact | KnowledgeRelation,
  profile: MinecraftRuntimeProfile,
): KnowledgeApplicabilityDecision {
  return evaluateKnowledgeApplicabilityV2(
    runtimeConstraintFromLegacyKnowledgeApplicability(item.applicability),
    profile,
  );
}
