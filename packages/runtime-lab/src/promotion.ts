import type {
  KnowledgeEvidenceRef,
} from "../../knowledge/src/index.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentQualification,
} from "./types.js";

export function experimentKnowledgeEvidence(
  definition: RuntimeExperimentDefinition,
  qualification: RuntimeExperimentQualification,
): KnowledgeEvidenceRef | undefined {
  if (
    qualification.state !== "repeatable" &&
    qualification.state !== "intervention-supported"
  ) {
    return undefined;
  }
  if (qualification.evidenceIds.length === 0) {
    return undefined;
  }

  return {
    id:
      "runtime-experiment:" +
      definition.id +
      ":" +
      qualification.state,
    kind: "controlled-experiment",
    experimentId: definition.id,
    specificity: "version",
    reproducibility: "repeatable",
    targetMatch: "exact",
  };
}
