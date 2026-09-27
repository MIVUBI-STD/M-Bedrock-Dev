import type {
  DiagnosticClaimStrength,
} from "../../project-model/src/index.js";
import type {
  GameplayRouteStallRuntimeAssessment,
} from "./gameplay-intent-runtime-stage.js";

export type GameplayRouteCauseCandidateId =
  | "route-context"
  | "target-assignment"
  | "chunk-availability"
  | "route-reachability"
  | "navigation-target"
  | "engine-navigation-runtime";

export type GameplayRouteCauseCandidateStatus =
  | "supported"
  | "rejected"
  | "unresolved";

export interface GameplayRouteCauseCandidate {
  id: GameplayRouteCauseCandidateId;
  label: string;
  status: GameplayRouteCauseCandidateStatus;
  claimStrength: DiagnosticClaimStrength;
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export type GameplayRouteCandidateStopCondition =
  | "continue-evidence-collection"
  | "route-cause-supported"
  | "navigation-runtime-candidate-isolated";

export interface GameplayRouteCauseAnalysis {
  candidates: readonly GameplayRouteCauseCandidate[];
  supportedCandidateIds: readonly GameplayRouteCauseCandidateId[];
  rejectedCandidateIds: readonly GameplayRouteCauseCandidateId[];
  unresolvedCandidateIds: readonly GameplayRouteCauseCandidateId[];
  leadingCandidateId?: GameplayRouteCauseCandidateId;
  stopCondition: GameplayRouteCandidateStopCondition;
  reasons: readonly string[];
}

const ORDER: readonly GameplayRouteCauseCandidateId[] = [
  "route-context",
  "target-assignment",
  "chunk-availability",
  "route-reachability",
  "navigation-target",
  "engine-navigation-runtime",
];

const LABELS: Readonly<
  Record<GameplayRouteCauseCandidateId, string>
> = {
  "route-context": "Route context / authored route resolution",
  "target-assignment": "Route target assignment / progression",
  "chunk-availability": "Route target chunk availability",
  "route-reachability": "Route target reachability",
  "navigation-target": "Engine navigation target alignment",
  "engine-navigation-runtime": "Minecraft navigation runtime behavior",
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function candidate(
  id: GameplayRouteCauseCandidateId,
  status: GameplayRouteCauseCandidateStatus,
  evidenceIds: readonly string[],
  reasons: readonly string[],
  claimStrength: DiagnosticClaimStrength = "hypothesis",
): GameplayRouteCauseCandidate {
  return {
    id,
    label: LABELS[id],
    status,
    claimStrength,
    evidenceIds: unique(evidenceIds),
    reasons,
  };
}

export type GameplayRouteCauseAnalysisInput =
  Pick<
    GameplayRouteStallRuntimeAssessment,
    | "stallObservation"
    | "disposition"
    | "routeAssessment"
    | "motionSeries"
    | "navigationTargetObservation"
    | "reachabilityObservation"
    | "chunkAvailabilityObservation"
    | "navigationTargetDistanceToAuthoredTarget"
    | "navigationTargetRouteMatchesAuthoredTarget"
    | "reasons"
  >;

export function analyzeGameplayRouteCauseCandidates(
  assessment: GameplayRouteCauseAnalysisInput,
): GameplayRouteCauseAnalysis {
  const stallEvidence = [
    assessment.stallObservation.evidenceId,
  ];
  const routeEvidence =
    assessment.routeAssessment === undefined
      ? []
      : [
          assessment.routeAssessment
            .routeObservation.evidenceId,
        ];
  const motionEvidence =
    assessment.motionSeries?.evidenceIds ?? [];
  const navigationEvidence =
    assessment.navigationTargetObservation === undefined
      ? []
      : [
          assessment.navigationTargetObservation
            .evidenceId,
        ];
  const reachabilityEvidence =
    assessment.reachabilityObservation === undefined
      ? []
      : [
          assessment.reachabilityObservation
            .evidenceId,
        ];
  const chunkEvidence =
    assessment.chunkAvailabilityObservation === undefined
      ? []
      : [
          assessment.chunkAvailabilityObservation
            .evidenceId,
        ];

  const candidates: GameplayRouteCauseCandidate[] = [];

  const routeResolved =
    assessment.routeAssessment?.assessment
      .disposition === "resolved";

  candidates.push(
    candidate(
      "route-context",
      routeResolved
        ? "rejected"
        : assessment.disposition ===
            "ambiguous-route-context" ||
          assessment.disposition ===
            "no-route-observation" ||
          assessment.disposition ===
            "unresolved-route-evidence"
        ? "supported"
        : "unresolved",
      [...stallEvidence, ...routeEvidence],
      routeResolved
        ? [
            "Authored route context resolves for the same runtime scope.",
          ]
        : [
            ...assessment.reasons,
            "Route context is not sufficiently resolved to move downstream with confidence.",
          ],
      routeResolved ? "corroborated" : "hypothesis",
    ),
  );

  const targetNearestMatch =
    assessment.disposition ===
    "target-nearest-match";
  const targetNearestDivergence =
    assessment.disposition ===
    "target-nearest-divergence";

  candidates.push(
    candidate(
      "target-assignment",
      targetNearestDivergence
        ? "supported"
        : targetNearestMatch
        ? "rejected"
        : "unresolved",
      [...stallEvidence, ...routeEvidence],
      targetNearestDivergence
        ? [
            "The resolved authored target differs from the nearest authored route point at the observed entity position.",
          ]
        : targetNearestMatch
        ? [
            "The resolved authored target matches the nearest authored route point.",
          ]
        : [
            "Target-to-nearest authored route alignment is not fully resolved.",
          ],
      targetNearestDivergence ||
      targetNearestMatch
        ? "corroborated"
        : "hypothesis",
    ),
  );

  const chunkState =
    assessment.chunkAvailabilityObservation?.state;
  candidates.push(
    candidate(
      "chunk-availability",
      chunkState === "not-loaded"
        ? "supported"
        : chunkState === "loaded"
        ? "rejected"
        : "unresolved",
      chunkEvidence,
      chunkState === "not-loaded"
        ? [
            "The active route-target chunk probe observed the authored target chunk as not loaded.",
          ]
        : chunkState === "loaded"
        ? [
            "The active route-target chunk probe observed the authored target chunk as loaded.",
          ]
        : [
            "Route target chunk availability is not definitively observed.",
          ],
      chunkState === "not-loaded" ||
      chunkState === "loaded"
        ? "corroborated"
        : "hypothesis",
    ),
  );

  const reachable =
    assessment.reachabilityObservation?.reachable;
  candidates.push(
    candidate(
      "route-reachability",
      reachable === false
        ? "supported"
        : reachable === true
        ? "rejected"
        : "unresolved",
      reachabilityEvidence,
      reachable === false
        ? [
            "Runtime instrumentation observed the authored route target as unreachable.",
          ]
        : reachable === true
        ? [
            "Runtime instrumentation observed the authored route target as reachable.",
          ]
        : [
            "Route reachability has not been observed.",
          ],
      reachable === undefined
        ? "hypothesis"
        : "corroborated",
    ),
  );

  const navigationRouteMatches =
    assessment
      .navigationTargetRouteMatchesAuthoredTarget;
  const navigationDistance =
    assessment
      .navigationTargetDistanceToAuthoredTarget;

  const navigationSupported =
    navigationRouteMatches === false;
  const navigationRejected =
    navigationRouteMatches === true &&
    navigationDistance === 0;

  candidates.push(
    candidate(
      "navigation-target",
      navigationSupported
        ? "supported"
        : navigationRejected
        ? "rejected"
        : "unresolved",
      navigationEvidence,
      navigationSupported
        ? [
            "The observed engine navigation target route/index differs from the authored target.",
          ]
        : navigationRejected
        ? [
            "The observed engine navigation target exactly matches the authored target coordinate and route/index.",
          ]
        : navigationRouteMatches === true &&
          navigationDistance !== undefined
        ? [
            "Navigation route/index agrees with authored intent, but the observed target coordinate differs; no arbitrary distance threshold is applied.",
          ]
        : [
            "Engine navigation target alignment is not fully observed.",
          ],
      navigationSupported ||
      navigationRejected
        ? "corroborated"
        : "hypothesis",
    ),
  );

  const upstreamIds: GameplayRouteCauseCandidateId[] =
    [
      "route-context",
      "target-assignment",
      "chunk-availability",
      "route-reachability",
      "navigation-target",
    ];
  const upstream = candidates.filter(
    (item) =>
      upstreamIds.includes(item.id),
  );

  const upstreamAllRejected =
    upstream.length === upstreamIds.length &&
    upstream.every(
      (item) => item.status === "rejected",
    );

  const motionObserved =
    assessment.motionSeries !== undefined;

  const engineSupported =
    assessment.disposition ===
      "target-nearest-match" &&
    motionObserved &&
    upstreamAllRejected;

  candidates.push(
    candidate(
      "engine-navigation-runtime",
      engineSupported
        ? "supported"
        : upstream.some(
            (item) =>
              item.status === "supported",
          )
        ? "rejected"
        : "unresolved",
      [
        ...stallEvidence,
        ...routeEvidence,
        ...motionEvidence,
        ...navigationEvidence,
        ...reachabilityEvidence,
        ...chunkEvidence,
      ],
      engineSupported
        ? [
            "Observed stall persists after route context, target assignment, chunk availability, reachability, and navigation-target divergence candidates are rejected.",
            "This isolates Minecraft navigation runtime behavior as the remaining corroborated candidate; it is not promoted to a confirmed defect without stronger engine/runtime proof.",
          ]
        : upstream.some(
            (item) =>
              item.status === "supported",
          )
        ? [
            "An upstream route/runtime candidate is supported, so engine navigation is not the first wrong owner.",
          ]
        : [
            "Upstream route/runtime evidence remains incomplete, so engine navigation cannot be isolated.",
          ],
      engineSupported
        ? "corroborated"
        : "hypothesis",
    ),
  );

  const supportedCandidateIds =
    ORDER.filter((id) =>
      candidates.some(
        (item) =>
          item.id === id &&
          item.status === "supported",
      ),
    );
  const rejectedCandidateIds =
    ORDER.filter((id) =>
      candidates.some(
        (item) =>
          item.id === id &&
          item.status === "rejected",
      ),
    );
  const unresolvedCandidateIds =
    ORDER.filter((id) =>
      candidates.some(
        (item) =>
          item.id === id &&
          item.status === "unresolved",
      ),
    );

  const leadingCandidateId =
    supportedCandidateIds[0];

  const stopCondition:
    GameplayRouteCandidateStopCondition =
      leadingCandidateId ===
        "engine-navigation-runtime" &&
      unresolvedCandidateIds.length === 0
        ? "navigation-runtime-candidate-isolated"
        : leadingCandidateId !== undefined
        ? "route-cause-supported"
        : "continue-evidence-collection";

  const reasons = [
    leadingCandidateId === undefined
      ? "No route-stall cause candidate is sufficiently supported yet."
      : "Leading candidate follows first-wrong-owner order: " +
        leadingCandidateId +
        ".",
    stopCondition ===
      "navigation-runtime-candidate-isolated"
      ? "All modeled upstream route/runtime candidates are rejected; engine navigation remains corroborated but not confirmed as a defect."
      : stopCondition ===
        "route-cause-supported"
      ? "A modeled upstream route/runtime candidate is supported; investigate that owner before engine-level navigation."
      : "Additional evidence is required before narrowing to one candidate.",
  ];

  return {
    candidates,
    supportedCandidateIds,
    rejectedCandidateIds,
    unresolvedCandidateIds,
    ...(leadingCandidateId === undefined
      ? {}
      : { leadingCandidateId }),
    stopCondition,
    reasons,
  };
}
