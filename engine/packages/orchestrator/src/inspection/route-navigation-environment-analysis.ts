import type {
  RouteDoorRequirement,
  RouteNavigationEnvironmentContract,
} from "../../../project-model/src/index.js";
import type {
  EntityAiStackAnalysis,
  EntityAiStackStateAssessment,
} from "../inspection/entity-ai-stack-analysis.js";

export type RouteNavigationCompatibilityStatus =
  | "compatible"
  | "incompatible"
  | "state-dependent"
  | "unresolved";

export interface RouteNavigationStateCompatibility {
  stateId: string;
  compatible: boolean;
  missingCapabilities: readonly string[];
}

export interface RouteNavigationEnvironmentAssessment {
  contractId: string;
  routeId: string;
  entityKey: string;
  status: RouteNavigationCompatibilityStatus;
  states: readonly RouteNavigationStateCompatibility[];
  reasons: readonly string[];
}

export interface RouteNavigationEnvironmentAnalysis {
  contracts: number;
  assessments: readonly RouteNavigationEnvironmentAssessment[];
  compatible: number;
  incompatible: number;
  stateDependent: number;
  unresolved: number;
}

function requiredCapabilities(
  contract: RouteNavigationEnvironmentContract,
): string[] {
  const required = new Set<string>();

  if (
    contract.medium === "ground" ||
    contract.requiresWalking === true
  ) {
    required.add("navigation:walk");
  }
  if (
    contract.medium === "water" ||
    contract.requiresSwimming === true
  ) {
    required.add("navigation:swim");
  }
  if (contract.requiresPathOverWater === true) {
    required.add("navigation:path-over-water");
  }
  if (contract.avoidWaterRequired === true) {
    required.add("navigation:avoid-water");
  }
  if (contract.avoidDamageBlocksRequired === true) {
    required.add("navigation:avoid-damage-blocks");
  }

  const door = contract.doorRequirement;
  if (door && door !== "none") {
    required.add(
      doorCapability(door),
    );
  }

  return [...required].sort();
}

function doorCapability(
  requirement: Exclude<RouteDoorRequirement, "none">,
): string {
  switch (requirement) {
    case "pass":
      return "navigation:path-through-doors";
    case "open":
      return "navigation:can-open-doors";
    case "open-iron":
      return "navigation:can-open-iron-doors";
    case "break":
      return "navigation:can_break_doors";
  }
}

function relevantStates(
  analysis: EntityAiStackAnalysis,
  entityKey: string,
): EntityAiStackStateAssessment[] {
  return analysis.assessments.filter(
    (item) =>
      item.entityKey === entityKey &&
      item.navigationPresent,
  );
}

function assessEntity(
  contract: RouteNavigationEnvironmentContract,
  entityKey: string,
  analysis: EntityAiStackAnalysis,
): RouteNavigationEnvironmentAssessment {
  const required =
    requiredCapabilities(contract);
  const states =
    relevantStates(analysis, entityKey);

  if (states.length === 0) {
    return {
      contractId: contract.id,
      routeId: contract.routeId,
      entityKey,
      status: "unresolved",
      states: [],
      reasons: [
        "No statically discovered navigation-capable state is available for this entity.",
      ],
    };
  }

  const stateAssessments =
    states.map((state) => {
      const available =
        new Set(state.navigationCapabilities);
      const missing = required.filter(
        (capability) =>
          !available.has(capability),
      );
      return {
        stateId: state.stateId,
        compatible: missing.length === 0,
        missingCapabilities: missing,
      };
    });

  const compatibleStates =
    stateAssessments.filter(
      (item) => item.compatible,
    ).length;

  const status:
    RouteNavigationCompatibilityStatus =
      compatibleStates ===
      stateAssessments.length
        ? "compatible"
        : compatibleStates === 0
          ? "incompatible"
          : "state-dependent";

  return {
    contractId: contract.id,
    routeId: contract.routeId,
    entityKey,
    status,
    states: stateAssessments,
    reasons:
      status === "compatible"
        ? [
            "Every discovered navigation-capable state satisfies the authored route environment requirements.",
          ]
        : status === "incompatible"
          ? [
              "No discovered navigation-capable state satisfies all authored route environment requirements.",
            ]
          : [
              "Route compatibility depends on which entity state is active at runtime.",
            ],
  };
}

export function analyzeRouteNavigationEnvironments(
  contracts: readonly RouteNavigationEnvironmentContract[],
  analysis: EntityAiStackAnalysis,
): RouteNavigationEnvironmentAnalysis {
  const assessments =
    contracts.flatMap((contract) => {
      const entityKeys =
        contract.entityKeys ??
        [
          ...new Set(
            analysis.assessments
              .filter(
                (item) =>
                  item.navigationPresent,
              )
              .map((item) => item.entityKey),
          ),
        ].sort();

      return entityKeys.map((entityKey) =>
        assessEntity(
          contract,
          entityKey,
          analysis,
        )
      );
    }).sort((a, b) =>
      a.routeId.localeCompare(b.routeId) ||
      a.entityKey.localeCompare(b.entityKey) ||
      a.contractId.localeCompare(b.contractId)
    );

  return {
    contracts: contracts.length,
    assessments,
    compatible: assessments.filter(
      (item) =>
        item.status === "compatible",
    ).length,
    incompatible: assessments.filter(
      (item) =>
        item.status === "incompatible",
    ).length,
    stateDependent: assessments.filter(
      (item) =>
        item.status === "state-dependent",
    ).length,
    unresolved: assessments.filter(
      (item) =>
        item.status === "unresolved",
    ).length,
  };
}
