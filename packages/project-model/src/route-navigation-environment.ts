export type RouteNavigationMedium =
  | "ground"
  | "water"
  | "mixed";

export type RouteDoorRequirement =
  | "none"
  | "pass"
  | "open"
  | "open-iron"
  | "break";

export interface RouteNavigationEnvironmentContract {
  id: string;
  routeId: string;
  entityKeys?: readonly string[];
  medium?: RouteNavigationMedium;
  doorRequirement?: RouteDoorRequirement;
  requiresWalking?: boolean;
  requiresSwimming?: boolean;
  requiresPathOverWater?: boolean;
  avoidWaterRequired?: boolean;
  avoidDamageBlocksRequired?: boolean;
  purpose?: string;
}

export function validateRouteNavigationEnvironmentContract(
  contract: RouteNavigationEnvironmentContract,
): string[] {
  const errors: string[] = [];

  if (!contract.id.trim()) {
    errors.push(
      "Route navigation environment contract id must be non-empty.",
    );
  }
  if (!contract.routeId.trim()) {
    errors.push(
      "Route navigation environment contract routeId must be non-empty.",
    );
  }
  if (
    contract.entityKeys?.some(
      (key) => !key.trim(),
    )
  ) {
    errors.push(
      "Route navigation environment contract entityKeys must be non-empty.",
    );
  }
  if (
    contract.requiresSwimming === true &&
    contract.medium === "ground"
  ) {
    errors.push(
      "Ground-only route cannot require swimming.",
    );
  }
  if (
    contract.requiresWalking === true &&
    contract.medium === "water"
  ) {
    errors.push(
      "Water-only route cannot require walking.",
    );
  }
  if (
    contract.avoidWaterRequired === true &&
    (
      contract.medium === "water" ||
      contract.requiresSwimming === true
    )
  ) {
    errors.push(
      "Water traversal and avoid-water requirement conflict.",
    );
  }

  return errors;
}

export function routeNavigationEnvironmentApplies(
  contract: RouteNavigationEnvironmentContract,
  routeId: string,
  entityKey: string,
): boolean {
  return (
    contract.routeId === routeId &&
    (
      contract.entityKeys === undefined ||
      contract.entityKeys.includes(entityKey)
    )
  );
}
