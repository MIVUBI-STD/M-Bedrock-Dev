export type WorkSessionStage =
  | "new"
  | "understood"
  | "evidence-ready"
  | "diagnosed"
  | "repair-planned"
  | "patched"
  | "validated"
  | "deliverable"
  | "blocked";

export interface WorkSessionArtifactRef {
  artifactId: string;
  artifactFingerprint: string;
  label?: string;
  version?: string;
}

export interface WorkSessionReferences {
  completedCapabilityIds: readonly string[];
  evidenceIds: readonly string[];
  semanticNodeIds: readonly string[];
  proofClaimIds: readonly string[];
  validationScenarioIds: readonly string[];
}

export interface WorkSessionCheckpoint {
  schemaVersion: 1;
  sessionId: string;
  goal: string;
  artifact: WorkSessionArtifactRef;
  stage: WorkSessionStage;
  revision: number;
  references: WorkSessionReferences;
  nextActions: readonly string[];
  blockers: readonly string[];
}

const ALLOWED_STAGE_TRANSITIONS:
  Readonly<Record<WorkSessionStage, readonly WorkSessionStage[]>> = {
  new: ["understood", "blocked"],
  understood: ["evidence-ready", "blocked"],
  "evidence-ready": ["diagnosed", "blocked"],
  diagnosed: ["repair-planned", "validated", "blocked"],
  "repair-planned": ["patched", "blocked"],
  patched: ["validated", "blocked"],
  validated: ["deliverable", "repair-planned", "blocked"],
  deliverable: [],
  blocked: [
    "understood",
    "evidence-ready",
    "diagnosed",
    "repair-planned",
    "patched",
    "validated",
  ],
};

function normalized(
  values: readonly string[] = [],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value) => value.trim().length > 0,
      ),
    ),
  ].sort();
}

export function createWorkSessionCheckpoint(
  input: {
    sessionId: string;
    goal: string;
    artifact: WorkSessionArtifactRef;
    stage?: WorkSessionStage;
    references?: Partial<WorkSessionReferences>;
    nextActions?: readonly string[];
    blockers?: readonly string[];
  },
): WorkSessionCheckpoint {
  if (!input.sessionId.trim()) {
    throw new Error(
      "Work session id must be non-empty.",
    );
  }
  if (!input.goal.trim()) {
    throw new Error(
      "Work session goal must be non-empty.",
    );
  }
  if (
    !input.artifact.artifactId.trim() ||
    !input.artifact.artifactFingerprint.trim()
  ) {
    throw new Error(
      "Work session artifact identity and fingerprint must be non-empty.",
    );
  }

  return {
    schemaVersion: 1,
    sessionId: input.sessionId,
    goal: input.goal,
    artifact: {
      ...input.artifact,
    },
    stage: input.stage ?? "new",
    revision: 1,
    references: {
      completedCapabilityIds:
        normalized(
          input.references
            ?.completedCapabilityIds,
        ),
      evidenceIds:
        normalized(
          input.references?.evidenceIds,
        ),
      semanticNodeIds:
        normalized(
          input.references
            ?.semanticNodeIds,
        ),
      proofClaimIds:
        normalized(
          input.references
            ?.proofClaimIds,
        ),
      validationScenarioIds:
        normalized(
          input.references
            ?.validationScenarioIds,
        ),
    },
    nextActions:
      normalized(input.nextActions),
    blockers:
      normalized(input.blockers),
  };
}

export function advanceWorkSessionCheckpoint(
  current: WorkSessionCheckpoint,
  update: {
    stage: WorkSessionStage;
    artifactFingerprint?:
      string;
    completedCapabilityIds?:
      readonly string[];
    evidenceIds?:
      readonly string[];
    semanticNodeIds?:
      readonly string[];
    proofClaimIds?:
      readonly string[];
    validationScenarioIds?:
      readonly string[];
    nextActions?: readonly string[];
    blockers?: readonly string[];
  },
): WorkSessionCheckpoint {
  const allowed =
    ALLOWED_STAGE_TRANSITIONS[
      current.stage
    ];

  if (
    update.stage !== current.stage &&
    !allowed.includes(update.stage)
  ) {
    throw new Error(
      "Invalid work session stage transition: " +
        current.stage +
        " -> " +
        update.stage +
        ".",
    );
  }

  const nextFingerprint =
    update.artifactFingerprint ??
    current.artifact
      .artifactFingerprint;

  if (
    nextFingerprint !==
    current.artifact
      .artifactFingerprint
  ) {
    throw new Error(
      "Work session artifact fingerprint changed. Start a new session or explicitly rebase evidence; stale evidence must not be silently carried forward.",
    );
  }

  const references = {
    completedCapabilityIds:
      normalized([
        ...current.references
          .completedCapabilityIds,
        ...(update
          .completedCapabilityIds ??
          []),
      ]),
    evidenceIds:
      normalized([
        ...current.references
          .evidenceIds,
        ...(update.evidenceIds ??
          []),
      ]),
    semanticNodeIds:
      normalized([
        ...current.references
          .semanticNodeIds,
        ...(update.semanticNodeIds ??
          []),
      ]),
    proofClaimIds:
      normalized([
        ...current.references
          .proofClaimIds,
        ...(update.proofClaimIds ??
          []),
      ]),
    validationScenarioIds:
      normalized([
        ...current.references
          .validationScenarioIds,
        ...(update
          .validationScenarioIds ??
          []),
      ]),
  };

  return {
    ...current,
    stage: update.stage,
    revision:
      current.revision + 1,
    references,
    nextActions:
      update.nextActions === undefined
        ? [...current.nextActions]
        : normalized(
            update.nextActions,
          ),
    blockers:
      update.blockers === undefined
        ? [...current.blockers]
        : normalized(
            update.blockers,
          ),
  };
}
