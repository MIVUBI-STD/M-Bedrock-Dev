import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
  KnowledgeFact,
  VersionScope,
} from "./types.js";
import { compareVersions } from "./version.js";

function versionMatches(
  profile: EffectiveKnowledgeProfile,
  scope: VersionScope | undefined,
): boolean {
  if (!scope) return true;

  if (
    scope.minMinecraftVersion &&
    (!profile.minecraftVersion ||
      compareVersions(profile.minecraftVersion, scope.minMinecraftVersion) < 0)
  ) return false;

  if (
    scope.maxMinecraftVersion &&
    (!profile.minecraftVersion ||
      compareVersions(profile.minecraftVersion, scope.maxMinecraftVersion) > 0)
  ) return false;

  if (
    scope.minFormatVersion &&
    (!profile.formatVersion ||
      compareVersions(profile.formatVersion, scope.minFormatVersion) < 0)
  ) return false;

  if (
    scope.maxFormatVersion &&
    (!profile.formatVersion ||
      compareVersions(profile.formatVersion, scope.maxFormatVersion) > 0)
  ) return false;

  if (scope.scriptModule) {
    const actual = profile.scriptModules?.[scope.scriptModule];
    if (!actual) return false;
    if (
      scope.scriptModuleVersion &&
      compareVersions(actual, scope.scriptModuleVersion) < 0
    ) return false;
  }

  return true;
}

export function knowledgeFactApplies(
  fact: KnowledgeFact,
  profile: EffectiveKnowledgeProfile,
): boolean {
  if (!fact.applicability.editions.includes(profile.edition)) return false;

  for (const experiment of fact.applicability.experiments ?? []) {
    if (!profile.experiments?.includes(experiment)) return false;
  }

  return versionMatches(profile, fact.applicability.versions);
}

export function effectiveKnowledge(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): KnowledgeFact[] {
  return catalog.facts
    .filter((fact) => knowledgeFactApplies(fact, profile))
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
}
