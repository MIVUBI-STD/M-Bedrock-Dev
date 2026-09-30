import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
  KnowledgeFact,
  KnowledgeRelation,
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

function applicabilityMatches(
  applicability: KnowledgeFact["applicability"],
  profile: EffectiveKnowledgeProfile,
): boolean {
  if (!applicability.editions.includes(profile.edition)) return false;

  for (const experiment of applicability.experiments ?? []) {
    if (!profile.experiments?.includes(experiment)) return false;
  }

  return versionMatches(profile, applicability.versions);
}

export function knowledgeFactApplies(
  fact: KnowledgeFact,
  profile: EffectiveKnowledgeProfile,
): boolean {
  return applicabilityMatches(fact.applicability, profile);
}

export function knowledgeRelationApplies(
  relation: KnowledgeRelation,
  profile: EffectiveKnowledgeProfile,
): boolean {
  return applicabilityMatches(relation.applicability, profile);
}

export function effectiveKnowledge(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): KnowledgeFact[] {
  return catalog.facts
    .filter((fact) => knowledgeFactApplies(fact, profile))
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
}

export function effectiveRelations(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): KnowledgeRelation[] {
  return (catalog.relations ?? [])
    .filter((relation) => knowledgeRelationApplies(relation, profile))
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
}
