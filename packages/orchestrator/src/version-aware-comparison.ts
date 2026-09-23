import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import {
  loadCoverageCatalog,
  loadRegressionCatalog,
  loadUpdateDeltaCatalog,
} from "../../reliability/src/catalog-loader.js";
import { planRetest } from "../../reliability/src/retest-planner.js";
import type {
  RegressionCase,
  RetestPlan,
  UpdateDeltaEntry,
} from "../../reliability/src/types.js";
import { compareArtifacts, type ArtifactComparisonResult } from "./compare-artifacts.js";
import { inspectArtifact } from "./inspect-artifact.js";
import type { InspectTargetProfile } from "./types.js";

export interface VersionAwareEvidenceLink {
  updateEntryId: string;
  domain: string;
  overlappingCapabilities: string[];
  historicalRegressionIds: string[];
  nativeEvidence: {
    countDeltas: string[];
    changedChunkSignals: number;
  };
}

export interface VersionAwareComparisonResult {
  targetVersion: string;
  comparison: ArtifactComparisonResult;
  retest: {
    before: RetestPlan;
    after: RetestPlan;
  };
  evidenceLinks: VersionAwareEvidenceLink[];
}

function regressionIdsFor(
  entry: UpdateDeltaEntry,
  regressions: readonly RegressionCase[],
): string[] {
  const entryCaps = new Set(entry.capabilityTags);
  return regressions
    .filter((regression) =>
      regression.domain === entry.domain ||
      regression.capabilityTags.some((tag) => entryCaps.has(tag))
    )
    .map((regression) => regression.id)
    .sort();
}

function nativeCountDeltas(comparison: ArtifactComparisonResult): string[] {
  if (!("counts" in comparison.nativeWorld)) return [];
  return Object.entries(comparison.nativeWorld.counts)
    .filter(([, value]) => value.delta !== 0)
    .map(([key, value]) => `${key}:${value.delta > 0 ? "+" : ""}${value.delta}`)
    .sort();
}

export async function compareArtifactsForUpdate(
  beforePath: string,
  afterPath: string,
  targetVersion: string,
  reliabilityCatalogRoot: string,
  target: InspectTargetProfile = {},
  knowledgeCatalog?: KnowledgeCatalog,
): Promise<VersionAwareComparisonResult> {
  const [comparison, before, after, delta, regressions, coverage] = await Promise.all([
    compareArtifacts(beforePath, afterPath, target, knowledgeCatalog),
    inspectArtifact(beforePath, target, knowledgeCatalog),
    inspectArtifact(afterPath, target, knowledgeCatalog),
    loadUpdateDeltaCatalog(reliabilityCatalogRoot, targetVersion),
    loadRegressionCatalog(reliabilityCatalogRoot),
    loadCoverageCatalog(reliabilityCatalogRoot),
  ]);

  const beforePlan = planRetest(
    before.reliability.fingerprint,
    delta,
    regressions,
    coverage,
  );
  const afterPlan = planRetest(
    after.reliability.fingerprint,
    delta,
    regressions,
    coverage,
  );

  const beforeCaps = new Set(before.reliability.fingerprint.capabilityTags);
  const afterCaps = new Set(after.reliability.fingerprint.capabilityTags);
  const countDeltas = nativeCountDeltas(comparison);
  const changedChunkSignals =
    "changedChunkSignals" in comparison.nativeWorld
      ? comparison.nativeWorld.changedChunkSignals.length
      : 0;

  const evidenceLinks = delta.entries
    .map((entry) => {
      const overlappingCapabilities = entry.capabilityTags.filter(
        (tag) => beforeCaps.has(tag) || afterCaps.has(tag),
      );
      const domainOverlap =
        before.reliability.fingerprint.domains.includes(entry.domain) ||
        after.reliability.fingerprint.domains.includes(entry.domain);

      if (overlappingCapabilities.length === 0 && !domainOverlap) return undefined;

      return {
        updateEntryId: entry.id,
        domain: entry.domain,
        overlappingCapabilities,
        historicalRegressionIds: regressionIdsFor(entry, regressions),
        nativeEvidence: {
          countDeltas,
          changedChunkSignals,
        },
      };
    })
    .filter((item): item is VersionAwareEvidenceLink => item !== undefined)
    .sort((a, b) => a.updateEntryId.localeCompare(b.updateEntryId));

  return {
    targetVersion,
    comparison,
    retest: {
      before: beforePlan,
      after: afterPlan,
    },
    evidenceLinks,
  };
}
