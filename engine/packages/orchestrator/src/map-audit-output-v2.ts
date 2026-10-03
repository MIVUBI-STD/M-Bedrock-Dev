import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
} from "../../gameplay-intent/src/index.js";
import type {
  InspectArtifactResult,
} from "./inspection/inspect-artifact.js";
import type {
  SelectedMapAuditIdentity,
} from "./map-audit-identity.js";
import type {
  AuditIssueProjection,
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";
import type {
  AuditValidationTestGroup,
} from "./map-audit-validation-plan.js";
import type {
  AuditHonestyAssessment,
} from "./map-audit-honesty.js";
import type {
  FullMapReplicaReceipt,
} from "./arena/full-map-replica-receipt.js";

export interface MapAuditOutputV2Finding {
  readonly id: string;
  readonly status: "PROVEN" | "NEED_VALIDATION";
  readonly issueType: "BUG" | "DESIGN_MISMATCH";
  readonly gameplayFlow: string;
  readonly failureDomain: string;
  readonly contributingDomains: readonly string[];
  readonly informationMismatch: boolean;
  readonly playerFacingEvidenceIds: readonly string[];
  readonly issue: string;
  readonly playerImpact: string;
  readonly reproduceSteps: readonly string[];
  readonly expected: string;
  readonly actual: string;
  readonly evidenceIds: readonly string[];
  readonly proofCeiling: "UNKNOWN";
  readonly counterEvidence:
    | "cleared"
    | "unresolved";
  readonly testerTriggerReady: boolean;
  readonly validationReason?: string;
  readonly missingProof?: string;
  readonly validationTest?: string;
  readonly validationGroupKey?: string;
  readonly proofNavigation?:
    NeedValidationAuditIssueProjection["proofNavigation"];
}

export interface MapAuditOutputControl {
  readonly status: "READY_FOR_REVIEW" | "BLOCKED";
  readonly currentStage:
    | "TARGET"
    | "DISCOVERY"
    | "UNDERSTAND"
    | "MODEL"
    | "STRESS"
    | "PROVE"
    | "REPORT"
    | "COMPLETE";
  readonly allowedNextAction:
    | "RESOLVE_BLOCKING_STAGE"
    | "RESOLVE_DEFECTS"
    | "PREPARE_REVIEW";
  readonly continuationOwner:
    | "ENGINE_OR_EVIDENCE"
    | "DEFECT_RESOLUTION"
    | "REVIEW";
  readonly requiresNewAuditRun: boolean;
  readonly blockingCheckpointIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface MapAuditOutputV2 {
  readonly schemaVersion: 2;
  readonly artifactId: string;
  readonly mapVersion: string;
  readonly control: MapAuditOutputControl;
  readonly evidenceScope: {
    readonly mode: "selected-map-version-only";
    readonly selectedArtifact: string;
    readonly archiveSourcesUsed: false;
  };
  readonly gameDesign: {
    readonly objective: string;
    readonly winCondition: string;
    readonly loseCondition: string;
    readonly resetRules: readonly string[];
    readonly preserveRules: readonly string[];
    readonly progressionRules: readonly string[];
  };
  readonly gameplayFlow: readonly string[];
  readonly stateTransitions: readonly {
    readonly from: string;
    readonly event: string;
    readonly to: string;
    readonly notes?: string;
  }[];
  readonly multiArena: {
    readonly supported: boolean;
    readonly visibleArenaCount: number | null;
    readonly concurrentArenaLimit: number | null;
    readonly queueBehavior: string;
    readonly isolationRules: readonly string[];
  };
  readonly coverage: {
    readonly disposition: "accounted";
    readonly records: readonly {
      readonly surface: string;
      readonly status:
        | "checked"
        | "blocked"
        | "not-applicable";
      readonly reason?: string;
      readonly evidenceIds: readonly string[];
    }[];
  };
  readonly gameplayClosure: {
    readonly status: "CLOSED" | "PARTIAL" | "OPEN";
    readonly surfaceInventory: readonly {
      readonly id: string;
      readonly label: string;
      readonly kind: string;
      readonly status:
        | "understood"
        | "blocked"
        | "unknown"
        | "not-applicable";
      readonly reason?: string;
      readonly boundaries: readonly string[];
    }[];
    readonly stateModelComplete: boolean;
    readonly boundariesExtracted: boolean;
    readonly unaccountedSurfaceIds: readonly string[];
    readonly notes: string;
  };
  readonly bugs: readonly MapAuditOutputV2Finding[];
  readonly designMismatches:
    readonly MapAuditOutputV2Finding[];
  readonly validationTests:
    readonly AuditValidationTestGroup[];
  readonly honesty: AuditHonestyAssessment;
  readonly fullMapReplica?: FullMapReplicaReceipt;
}

const PLAYER_FLOW = [
  "ENTRY_JOIN",
  "READY_START",
  "SETUP",
  "ACTIVE_GAMEPLAY",
  "PROGRESSION",
  "TERMINAL",
  "CLEANUP_REPLAY",
  "RECOVERY",
] as const;

function nodeText(
  node: GameplayIntentNode | undefined,
): string | undefined {
  const value =
    node?.description?.trim() ||
    node?.label.trim();
  return value || undefined;
}

function preferredNode(
  model: GameplayIntentModel,
  kind: GameplayIntentNode["kind"],
): GameplayIntentNode | undefined {
  return model.nodes
    .filter((node) => node.kind === kind)
    .sort((a, b) => {
      const rank = (value: GameplayIntentNode["status"]) =>
        value === "authored"
          ? 0
          : value === "inferred"
            ? 1
            : 2;
      return rank(a.status) - rank(b.status) ||
        a.id.localeCompare(b.id);
    })[0];
}

function edgeStatement(
  edge: GameplayIntentEdge,
  nodes: ReadonlyMap<string, GameplayIntentNode>,
): string {
  if (edge.description?.trim()) {
    return edge.description.trim();
  }
  const from =
    nodeText(nodes.get(edge.from)) ?? edge.from;
  const to =
    nodeText(nodes.get(edge.to)) ?? edge.to;
  return from + " " + edge.kind + " " + to;
}

function outcomeFor(
  model: GameplayIntentModel,
  kind: "wins-by" | "loses-by",
): string | undefined {
  const nodes = new Map(
    model.nodes.map((node) => [node.id, node]),
  );
  const edge = model.edges
    .filter((item) =>
      item.kind === kind &&
      item.status !== "hypothesis"
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  return edge === undefined
    ? undefined
    : edgeStatement(edge, nodes);
}

function projectFinding(
  finding: AuditIssueProjection,
): MapAuditOutputV2Finding {
  const base = {
    id: finding.causalLinkId,
    status: finding.status,
    issueType: finding.issueType,
    gameplayFlow: finding.gameplayFlow,
    failureDomain: finding.failureDomain,
    contributingDomains:
      [...finding.contributingDomains],
    informationMismatch:
      finding.informationMismatch,
    playerFacingEvidenceIds:
      [...finding.playerFacingEvidenceIds],
    issue: finding.gameplayConsequence,
    playerImpact: finding.gameplayConsequence,
    reproduceSteps: [
      finding.gameplayTrigger,
      "Observe whether: " + finding.actualOutcome,
    ],
    expected: finding.expectedOutcome,
    actual: finding.actualOutcome,
    evidenceIds: [...finding.evidenceIds],
    proofCeiling: "UNKNOWN" as const,
    counterEvidence:
      finding.status === "PROVEN"
        ? "cleared" as const
        : "unresolved" as const,
    testerTriggerReady:
      finding.status === "PROVEN",
  };

  if (finding.status === "PROVEN") {
    return base;
  }

  if (finding.proofNavigation === undefined) {
    throw new Error(
      "NEED_VALIDATION finding is missing proofNavigation: " +
        finding.causalLinkId +
        ".",
    );
  }

  return {
    ...base,
    validationReason:
      finding.validationReason,
    missingProof:
      finding.missingProof,
    validationTest:
      finding.validationTest,
    validationGroupKey:
      finding.validationGroupKey,
    proofNavigation:
      finding.proofNavigation,
  };
}

export function projectMapAuditOutputV2(input: {
  readonly inspection: InspectArtifactResult;
  readonly identity: SelectedMapAuditIdentity;
  readonly issueLanes: {
    readonly BUG: readonly AuditIssueProjection[];
    readonly DESIGN_MISMATCH:
      readonly AuditIssueProjection[];
  };
  readonly validationTests:
    readonly AuditValidationTestGroup[];
  readonly honesty: AuditHonestyAssessment;
  readonly control: MapAuditOutputControl;
  readonly fullMapReplica?: FullMapReplicaReceipt;
}): MapAuditOutputV2 {
  const model =
    input.inspection.gameplayIntent.model;
  const nodes = new Map(
    model.nodes.map((node) => [node.id, node]),
  );
  const objective =
    nodeText(preferredNode(model, "objective")) ??
    "Unresolved from selected artifact.";
  const winCondition =
    outcomeFor(model, "wins-by") ??
    "Unresolved from selected artifact.";
  const loseCondition =
    outcomeFor(model, "loses-by") ??
    "Unresolved from selected artifact.";

  const resetRules = model.edges
    .filter((edge) =>
      edge.kind === "resets" &&
      edge.status !== "hypothesis"
    )
    .map((edge) => edgeStatement(edge, nodes))
    .sort();
  const preserveRules = model.edges
    .filter((edge) =>
      edge.kind === "persists" &&
      edge.status !== "hypothesis"
    )
    .map((edge) => edgeStatement(edge, nodes))
    .sort();
  const progressionRules = [
    ...model.edges
      .filter((edge) =>
        (
          edge.kind === "transitions-to" ||
          edge.kind === "produces" ||
          edge.kind === "consumes"
        ) &&
        edge.status !== "hypothesis"
      )
      .map((edge) => edgeStatement(edge, nodes)),
    ...model.invariants
      .filter((item) =>
        item.status !== "hypothesis"
      )
      .map((item) => item.statement.trim())
      .filter(Boolean),
  ].filter(
    (value, index, all) =>
      all.indexOf(value) === index,
  ).sort();

  const stateTransitions = model.edges
    .filter((edge) =>
      (
        edge.kind === "transitions-to" ||
        edge.kind === "recovers-to"
      ) &&
      edge.status !== "hypothesis"
    )
    .map((edge) => ({
      from:
        nodeText(nodes.get(edge.from)) ??
        edge.from,
      event: edge.kind,
      to:
        nodeText(nodes.get(edge.to)) ??
        edge.to,
      ...(edge.description?.trim()
        ? { notes: edge.description.trim() }
        : {}),
    }));

  const world = input.inspection.gameplayWorld;
  const closure = world.gameplayClosure;
  const coverageRecords = closure.surfaces.map(
    (surface) => ({
      surface: surface.id,
      status:
        surface.status === "understood"
          ? "checked" as const
          : surface.status === "not-applicable"
            ? "not-applicable" as const
            : "blocked" as const,
      ...(surface.reason === undefined
        ? {}
        : { reason: surface.reason }),
      evidenceIds:
        [...(surface.evidenceIds ?? [])],
    }),
  );

  return {
    schemaVersion: 2,
    artifactId: input.identity.artifactId,
    control: input.control,
    mapVersion:
      input.identity.releaseVersion ??
      "UNRESOLVED",
    evidenceScope: {
      mode: "selected-map-version-only",
      selectedArtifact:
        input.identity.levelName ??
        input.identity.artifactId,
      archiveSourcesUsed: false,
    },
    gameDesign: {
      objective,
      winCondition,
      loseCondition,
      resetRules,
      preserveRules,
      progressionRules,
    },
    gameplayFlow: PLAYER_FLOW,
    stateTransitions,
    multiArena: {
      supported: world.arenas.detected,
      visibleArenaCount:
        world.arenas.count ?? null,
      concurrentArenaLimit:
        world.arenas.safeConcurrentArenas ??
        world.arenas.declaredConcurrentArenaLimit ??
        null,
      queueBehavior:
        world.arenas.detected
          ? "Unresolved from selected artifact."
          : "not-applicable",
      isolationRules:
        world.arenas.isolation.observations
          .map((item) =>
            item.key + "=" + item.status
          )
          .sort(),
    },
    coverage: {
      disposition: "accounted",
      records: coverageRecords,
    },
    gameplayClosure: {
      status: closure.status,
      surfaceInventory:
        closure.surfaces.map((surface) => ({
          id: surface.id,
          label: surface.label,
          kind: surface.kind,
          status: surface.status,
          ...(surface.reason === undefined
            ? {}
            : { reason: surface.reason }),
          boundaries:
            [...(surface.boundaries ?? [])],
        })),
      stateModelComplete:
        closure.stateModelComplete,
      boundariesExtracted:
        closure.boundariesExtracted,
      unaccountedSurfaceIds:
        [...closure.unaccountedSurfaceIds],
      notes: closure.reasons.join(" "),
    },
    bugs:
      input.issueLanes.BUG.map(projectFinding),
    designMismatches:
      input.issueLanes.DESIGN_MISMATCH.map(
        projectFinding,
      ),
    validationTests:
      [...input.validationTests],
    honesty: input.honesty,
    ...(input.fullMapReplica === undefined
      ? {}
      : {
          fullMapReplica:
            input.fullMapReplica,
        }),
  };
}
