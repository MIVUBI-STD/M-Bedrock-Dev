import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";
import type {
  StateAuthorityContract,
  StateValueObservation,
} from "../../project-model/src/index.js";
import {
  correlateStateAuthority,
  stateAuthorityRuntimeEvidence,
  type StateMirrorCorrelation,
} from "./state-authority-analysis.js";

export interface KnowledgeEvidenceOverlayInput {
  records?: readonly RuntimeEvidenceRecord[];
  stateAuthorityContracts?: readonly StateAuthorityContract[];
  stateObservations?: readonly StateValueObservation[];
}

export interface KnowledgeEvidenceOverlay {
  records: RuntimeEvidenceRecord[];
  stateMirrorCorrelations: StateMirrorCorrelation[];
}

export function buildKnowledgeEvidenceOverlay(
  input: KnowledgeEvidenceOverlayInput,
): KnowledgeEvidenceOverlay {
  const stateMirrorCorrelations =
    input.stateAuthorityContracts && input.stateObservations
      ? correlateStateAuthority(
          input.stateAuthorityContracts,
          input.stateObservations,
        )
      : [];

  return {
    records: [
      ...(input.records ?? []),
      ...stateAuthorityRuntimeEvidence(stateMirrorCorrelations),
    ],
    stateMirrorCorrelations,
  };
}
