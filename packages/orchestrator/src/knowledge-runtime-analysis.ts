import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import {
  assessKnowledgeRelations,
  validationPlanFromAssessments,
  type EffectiveKnowledgeProfile,
  type KnowledgeCatalog,
  type ValidationCase,
} from "../../knowledge/src/index.js";
import {
  groupRuntimeEvidenceByScope,
  type RuntimeEvidenceRecord,
  type RuntimeEvidenceSnapshot,
} from "../../project-model/src/runtime-evidence.js";
import type { ManifestModel } from "../../../analyzers/manifest/src/types.js";
import { manifestRuntimeEvidence } from "../../../analyzers/manifest/src/runtime-evidence.js";
import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import { functionRuntimeEvidence } from "../../../analyzers/functions/src/runtime-evidence.js";
import {
  knowledgeRuntimeDiagnostics,
} from "../../../analyzers/diagnostics/src/knowledge-runtime-findings.js";
import { mergeRuntimeEvidenceRecords } from "../../../analyzers/diagnostics/src/runtime-evidence-merge.js";
import type { InspectTargetProfile } from "./types.js";

export interface InspectionKnowledgeProfileResolution {
  profile?: EffectiveKnowledgeProfile;
  conflicts: readonly string[];
  source: "target" | "education-metadata" | "unresolved";
}

export interface KnowledgeRuntimeAnalysis {
  enabled: boolean;
  profileResolved: boolean;
  profileSource: InspectionKnowledgeProfileResolution["source"];
  profileConflicts: readonly string[];
  evidenceRecords: number;
  violations: number;
  evidenceGaps: number;
  validationCases: readonly ValidationCase[];
  diagnostics: readonly DiagnosticFinding[];
}

export function resolveInspectionKnowledgeProfile(
  target: InspectTargetProfile,
  manifests: readonly ManifestModel[],
): InspectionKnowledgeProfileResolution {
  const conflicts: string[] = [];
  const modules = new Map<string, string>();
  let educationMetadata = false;

  for (const manifest of manifests) {
    const evidence = manifestRuntimeEvidence(manifest);
    if (evidence.records.some((record) => record.predicate === "education-metadata")) {
      educationMetadata = true;
    }
    for (const [name, version] of Object.entries(evidence.scriptModules)) {
      const existing = modules.get(name);
      if (existing !== undefined && existing !== version) {
        conflicts.push(
          "Conflicting script module versions for " + name + ": " + existing + " vs " + version,
        );
        continue;
      }
      modules.set(name, version);
    }
  }

  const edition = target.edition ?? (educationMetadata ? "education" : undefined);
  if (!edition) {
    return {
      conflicts: [...new Set(conflicts)].sort(),
      source: "unresolved",
    };
  }

  const scriptModules = Object.fromEntries(
    [...modules.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  const profile: EffectiveKnowledgeProfile = {
    edition,
    ...(target.version === undefined ? {} : { minecraftVersion: target.version }),
    ...(target.experiments === undefined ? {} : { experiments: target.experiments }),
    ...(Object.keys(scriptModules).length === 0 ? {} : { scriptModules }),
  };

  return {
    profile,
    conflicts: [...new Set(conflicts)].sort(),
    source: target.edition !== undefined ? "target" : "education-metadata",
  };
}

function validationCasesForSnapshot(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
  snapshot: RuntimeEvidenceSnapshot,
): ValidationCase[] {
  const cases: ValidationCase[] = [];
  for (const records of groupRuntimeEvidenceByScope(snapshot).values()) {
    const { map } = mergeRuntimeEvidenceRecords(records);
    cases.push(...validationPlanFromAssessments(
      assessKnowledgeRelations(catalog, profile, map),
    ));
  }

  const deduped = new Map<string, ValidationCase>();
  for (const item of cases) {
    const existing = deduped.get(item.id);
    if (!existing || (existing.priority !== "high" && item.priority === "high")) {
      deduped.set(item.id, item);
    }
  }
  return [...deduped.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function analyzeKnowledgeRuntime(
  catalog: KnowledgeCatalog | undefined,
  target: InspectTargetProfile,
  manifests: readonly ManifestModel[],
  functions: readonly ParsedFunction[],
): KnowledgeRuntimeAnalysis {
  if (!catalog) {
    return {
      enabled: false,
      profileResolved: false,
      profileSource: "unresolved",
      profileConflicts: [],
      evidenceRecords: 0,
      violations: 0,
      evidenceGaps: 0,
      validationCases: [],
      diagnostics: [],
    };
  }

  const resolution = resolveInspectionKnowledgeProfile(target, manifests);
  const records: RuntimeEvidenceRecord[] = [
    ...manifests.flatMap((manifest) => manifestRuntimeEvidence(manifest).records),
    ...functions.flatMap(functionRuntimeEvidence),
  ];

  if (!resolution.profile) {
    return {
      enabled: true,
      profileResolved: false,
      profileSource: resolution.source,
      profileConflicts: resolution.conflicts,
      evidenceRecords: records.length,
      violations: 0,
      evidenceGaps: 0,
      validationCases: [],
      diagnostics: [],
    };
  }

  const snapshot: RuntimeEvidenceSnapshot = { schemaVersion: 1, records };
  const diagnostics = knowledgeRuntimeDiagnostics({
    catalog,
    profile: resolution.profile,
    snapshot,
  });
  const validationCases = validationCasesForSnapshot(
    catalog,
    resolution.profile,
    snapshot,
  );

  return {
    enabled: true,
    profileResolved: true,
    profileSource: resolution.source,
    profileConflicts: resolution.conflicts,
    evidenceRecords: records.length,
    violations: diagnostics.filter((item) => item.code === "KNOWLEDGE_RELATION_VIOLATION").length,
    evidenceGaps: diagnostics.filter((item) => item.code === "KNOWLEDGE_EVIDENCE_GAP").length,
    validationCases,
    diagnostics,
  };
}