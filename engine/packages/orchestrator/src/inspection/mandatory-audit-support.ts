import type { SemanticIr } from "../../../semantic-ir/src/index.js";
import type { GameplayIntentModel } from "../../../gameplay-intent/src/index.js";
import type { GameplayDiscoveryClosure } from "./gameplay-discovery-closure.js";

export type MandatoryAuditBlock =
  | "UNDERSTAND"
  | "MODEL"
  | "STRESS"
  | "PROVE"
  | "REPORT";

export type MandatoryAuditCheckpointStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN"
  | "NOT_APPLICABLE";

export type MandatoryAuditCheckpointReasonCode =
  | "COMPLETE"
  | "NOT_APPLICABLE_PROVEN"
  | "RUNTIME_PROOF_REQUIRED"
  | "DISCOVERY_INCOMPLETE"
  | "SCOPE_INCOMPLETE"
  | "OBLIGATION_INCOMPLETE"
  | "KNOWLEDGE_GAP"
  | "CAPABILITY_GAP"
  | "PROCEDURE_BLOCKED";

export interface MandatoryAuditObligation {
  readonly id: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export interface MandatoryAuditCheckpointReceipt {
  readonly id: string;
  readonly block: MandatoryAuditBlock;
  readonly label: string;
  readonly status: MandatoryAuditCheckpointStatus;
  readonly reasonCode: MandatoryAuditCheckpointReasonCode;
  readonly blocksPublication: boolean;
  readonly obligations: readonly MandatoryAuditObligation[];
  readonly evidenceIds: readonly string[];
  readonly outputIds: readonly string[];
  readonly reason: string;
}

export interface MandatoryAuditBlockClosure {
  readonly block: MandatoryAuditBlock;
  readonly status: Exclude<
    MandatoryAuditCheckpointStatus,
    "NOT_APPLICABLE"
  >;
  readonly checkpointIds: readonly string[];
  readonly openCheckpointIds: readonly string[];
  readonly partialCheckpointIds: readonly string[];
}

export interface MandatoryAuditStateRecord {
  readonly surfaceId: string;
  readonly readRegions: readonly string[];
  readonly writeRegions: readonly string[];
  readonly clearRegions: readonly string[];
  readonly authorityContractIds: readonly string[];
}

export interface MandatoryAuditOwnershipRecord {
  readonly authorityContractId: string;
  readonly authoritySurfaceId: string;
  readonly mirrorSurfaceIds: readonly string[];
}

export interface MandatoryAuditProgressionRecord {
  readonly subjectId: string;
  readonly kind: "objective" | "phase" | "outcome";
  readonly inboundEdgeIds: readonly string[];
  readonly outboundEdgeIds: readonly string[];
}

export interface MandatoryAuditProcedureReceipt {
  readonly schemaVersion: 1;
  readonly policy: "mandatory-gameplay-audit-procedure";
  readonly checkpoints: readonly MandatoryAuditCheckpointReceipt[];
  readonly blocks: readonly MandatoryAuditBlockClosure[];
  readonly status: "CLOSED" | "PARTIAL" | "OPEN";
  readonly stateRegistry: readonly MandatoryAuditStateRecord[];
  readonly ownershipRegistry: readonly MandatoryAuditOwnershipRecord[];
  readonly progressionContracts: readonly MandatoryAuditProgressionRecord[];
  readonly blockingCheckpointIds: readonly string[];
  readonly reasons: readonly string[];
}

export function mandatoryAuditReceipt(
  id: string,
  block: MandatoryAuditBlock,
  label: string,
  status: MandatoryAuditCheckpointStatus,
  reason: string,
  evidenceIds: readonly string[] = [],
  outputIds: readonly string[] = [],
  options: {
    readonly reasonCode?: MandatoryAuditCheckpointReasonCode;
    readonly blocksPublication?: boolean;
    readonly obligations?: readonly MandatoryAuditObligation[];
  } = {},
): MandatoryAuditCheckpointReceipt {
  const obligations = options.obligations ?? [];
  const unsatisfiedRequired = obligations.some(
    (item) => item.required && !item.satisfied,
  );
  const effectiveStatus =
    status === "CLOSED" && unsatisfiedRequired
      ? "PARTIAL"
      : status;
  return {
    id,
    block,
    label,
    status: effectiveStatus,
    reasonCode:
      options.reasonCode ??
      (effectiveStatus === "NOT_APPLICABLE"
        ? "NOT_APPLICABLE_PROVEN"
        : effectiveStatus === "CLOSED"
          ? "COMPLETE"
          : "OBLIGATION_INCOMPLETE"),
    blocksPublication:
      options.blocksPublication ??
      (
        effectiveStatus === "OPEN" ||
        (
          effectiveStatus === "PARTIAL" &&
          (options.reasonCode ?? "OBLIGATION_INCOMPLETE") !==
            "RUNTIME_PROOF_REQUIRED"
        )
      ),
    obligations,
    reason,
    evidenceIds: [...new Set(evidenceIds)].sort(),
    outputIds: [...new Set(outputIds)].sort(),
  };
}

export function mandatoryAuditObligation(
  id: string,
  required: boolean,
  satisfied: boolean,
  reason: string,
  evidenceIds: readonly string[] = [],
): MandatoryAuditObligation {
  return {
    id,
    required,
    satisfied,
    reason,
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

export function positiveNotApplicable(
  discovery: GameplayDiscoveryClosure,
  hasSemanticDemand: boolean,
  hasRuntimeSignal: boolean,
): boolean {
  return (
    discovery.status === "COMPLETE" &&
    !hasSemanticDemand &&
    !hasRuntimeSignal
  );
}

export function deriveMandatoryStateRegistry(
  ir: SemanticIr,
): readonly MandatoryAuditStateRecord[] {
  return ir.state.surfaces.map((surface) => {
    const operations = ir.state.operations.filter(
      (operation) => operation.surfaceId === surface.id,
    );
    const regionsFor = (...kinds: string[]) =>
      [...new Set(
        operations
          .filter((operation) =>
            kinds.includes(operation.operation)
          )
          .map((operation) => operation.executionRegionId),
      )].sort();
    const authorityContractIds =
      ir.state.authorityBindings
        .filter((binding) =>
          binding.authoritySurfaceId === surface.id ||
          binding.mirrorSurfaceIds.includes(surface.id)
        )
        .map((binding) => binding.contract.id)
        .sort();
    return {
      surfaceId: surface.id,
      readRegions: regionsFor("read", "enumerate", "size"),
      writeRegions: regionsFor("write"),
      clearRegions: regionsFor("clear", "delete"),
      authorityContractIds,
    };
  });
}

export function deriveMandatoryOwnershipRegistry(
  ir: SemanticIr,
): readonly MandatoryAuditOwnershipRecord[] {
  return ir.state.authorityBindings.map((binding) => ({
    authorityContractId: binding.contract.id,
    authoritySurfaceId: binding.authoritySurfaceId,
    mirrorSurfaceIds: [...binding.mirrorSurfaceIds].sort(),
  }));
}

export function deriveMandatoryProgressionContracts(
  intent: GameplayIntentModel,
): readonly MandatoryAuditProgressionRecord[] {
  return intent.nodes
    .filter((node) =>
      node.kind === "objective" ||
      node.kind === "phase" ||
      node.kind === "outcome"
    )
    .map((node) => ({
      subjectId: node.id,
      kind: node.kind as "objective" | "phase" | "outcome",
      inboundEdgeIds: intent.edges
        .filter((edge) => edge.to === node.id)
        .map((edge) => edge.id)
        .sort(),
      outboundEdgeIds: intent.edges
        .filter((edge) => edge.from === node.id)
        .map((edge) => edge.id)
        .sort(),
    }));
}

export function mandatoryAuditBlockClosure(
  block: MandatoryAuditBlock,
  checkpoints: readonly MandatoryAuditCheckpointReceipt[],
): MandatoryAuditBlockClosure {
  const relevant = checkpoints.filter((item) => item.block === block);
  const open = relevant.filter((item) => item.status === "OPEN");
  const partial = relevant.filter((item) => item.status === "PARTIAL");
  return {
    block,
    status:
      open.length > 0
        ? "OPEN"
        : partial.length > 0
          ? "PARTIAL"
          : "CLOSED",
    checkpointIds: relevant.map((item) => item.id),
    openCheckpointIds: open.map((item) => item.id),
    partialCheckpointIds: partial.map((item) => item.id),
  };
}
