export type BehaviorProvenanceKind =
  | "source-inference"
  | "official-knowledge"
  | "project-policy"
  | "runtime-evidence"
  | "controlled-experiment";

export type BehaviorEvidenceCeiling =
  | "designed"
  | "inferred"
  | "documented"
  | "observed"
  | "intervention-supported";

export interface BehaviorClaimProvenance {
  kind: BehaviorProvenanceKind;
  evidenceCeiling: BehaviorEvidenceCeiling;
  evidenceIds: readonly string[];
  note?: string;
}

export interface BehaviorProvenanceGap {
  ownerKind: "variable" | "transition" | "property";
  ownerId: string;
  reason: string;
}

export interface BehaviorProvenanceAuditable {
  variables: readonly {
    id: string;
    provenance?: BehaviorClaimProvenance;
  }[];
  transitions: readonly {
    id: string;
    provenance?: BehaviorClaimProvenance;
  }[];
  properties: readonly {
    id: string;
    provenance?: BehaviorClaimProvenance;
  }[];
}

const CEILING_RANK: Readonly<
  Record<BehaviorEvidenceCeiling, number>
> = {
  designed: 0,
  inferred: 1,
  documented: 2,
  observed: 3,
  "intervention-supported": 4,
};

export function behaviorEvidenceCeilingAtLeast(
  actual: BehaviorEvidenceCeiling,
  required: BehaviorEvidenceCeiling,
): boolean {
  return CEILING_RANK[actual] >= CEILING_RANK[required];
}

export function auditBehaviorModelProvenance(
  model: BehaviorProvenanceAuditable,
): BehaviorProvenanceGap[] {
  const gaps: BehaviorProvenanceGap[] = [];

  for (const [ownerKind, items] of [
    ["variable", model.variables],
    ["transition", model.transitions],
    ["property", model.properties],
  ] as const) {
    for (const item of items) {
      if (!item.provenance) {
        gaps.push({
          ownerKind,
          ownerId: item.id,
          reason: "Behavior claim has no provenance binding.",
        });
        continue;
      }
      if (item.provenance.evidenceIds.length === 0) {
        gaps.push({
          ownerKind,
          ownerId: item.id,
          reason:
            "Behavior claim provenance has no evidence identity.",
        });
      }
    }
  }

  return gaps;
}

export function projectPolicyProvenance(
  id: string,
  note?: string,
): BehaviorClaimProvenance {
  return {
    kind: "project-policy",
    evidenceCeiling: "designed",
    evidenceIds: [id],
    ...(note === undefined ? {} : { note }),
  };
}
