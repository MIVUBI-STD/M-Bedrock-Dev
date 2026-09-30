import { readFile } from "node:fs/promises";
import {
  validateRouteNavigationEnvironmentContract,
  type RouteDoorRequirement,
  type RouteNavigationEnvironmentContract,
  type RouteNavigationMedium,
} from "../../project-model/src/index.js";

const MEDIA = new Set<RouteNavigationMedium>([
  "ground",
  "water",
  "mixed",
]);

const DOORS = new Set<RouteDoorRequirement>([
  "none",
  "pass",
  "open",
  "open-iron",
  "break",
]);

function nonEmptyString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      "Route navigation environment " +
        field +
        " must be a non-empty string.",
    );
  }
  return value;
}

function optionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(
      "Route navigation environment " +
        field +
        " must be boolean when provided.",
    );
  }
  return value;
}

function parseContract(
  value: unknown,
  index: number,
): RouteNavigationEnvironmentContract {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Route navigation environment at index " +
        index +
        " must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;

  const medium =
    item.medium === undefined
      ? undefined
      : item.medium as RouteNavigationMedium;
  if (
    medium !== undefined &&
    !MEDIA.has(medium)
  ) {
    throw new Error(
      "Route navigation environment " +
        String(item.id ?? index) +
        " has invalid medium.",
    );
  }

  const doorRequirement =
    item.doorRequirement === undefined
      ? undefined
      : item.doorRequirement as RouteDoorRequirement;
  if (
    doorRequirement !== undefined &&
    !DOORS.has(doorRequirement)
  ) {
    throw new Error(
      "Route navigation environment " +
        String(item.id ?? index) +
        " has invalid doorRequirement.",
    );
  }

  let entityKeys: string[] | undefined;
  if (item.entityKeys !== undefined) {
    if (
      !Array.isArray(item.entityKeys) ||
      item.entityKeys.some(
        (key) =>
          typeof key !== "string" ||
          key.trim().length === 0,
      )
    ) {
      throw new Error(
        "Route navigation environment entityKeys must be non-empty strings.",
      );
    }
    entityKeys = [
      ...new Set(item.entityKeys as string[]),
    ].sort();
  }

  const contract: RouteNavigationEnvironmentContract = {
    id: nonEmptyString(item.id, "id"),
    routeId: nonEmptyString(
      item.routeId,
      "routeId",
    ),
    ...(entityKeys === undefined
      ? {}
      : { entityKeys }),
    ...(medium === undefined
      ? {}
      : { medium }),
    ...(doorRequirement === undefined
      ? {}
      : { doorRequirement }),
    ...(optionalBoolean(
      item.requiresWalking,
      "requiresWalking",
    ) === undefined
      ? {}
      : {
          requiresWalking:
            item.requiresWalking as boolean,
        }),
    ...(optionalBoolean(
      item.requiresSwimming,
      "requiresSwimming",
    ) === undefined
      ? {}
      : {
          requiresSwimming:
            item.requiresSwimming as boolean,
        }),
    ...(optionalBoolean(
      item.requiresPathOverWater,
      "requiresPathOverWater",
    ) === undefined
      ? {}
      : {
          requiresPathOverWater:
            item.requiresPathOverWater as boolean,
        }),
    ...(optionalBoolean(
      item.avoidWaterRequired,
      "avoidWaterRequired",
    ) === undefined
      ? {}
      : {
          avoidWaterRequired:
            item.avoidWaterRequired as boolean,
        }),
    ...(optionalBoolean(
      item.avoidDamageBlocksRequired,
      "avoidDamageBlocksRequired",
    ) === undefined
      ? {}
      : {
          avoidDamageBlocksRequired:
            item.avoidDamageBlocksRequired as boolean,
        }),
    ...(typeof item.purpose === "string" &&
    item.purpose.trim().length > 0
      ? { purpose: item.purpose }
      : {}),
  };

  const errors =
    validateRouteNavigationEnvironmentContract(
      contract,
    );
  if (errors.length > 0) {
    throw new Error(
      "Invalid route navigation environment " +
        contract.id +
        ": " +
        errors.join(" "),
    );
  }

  return contract;
}

export function parseRouteNavigationEnvironmentContracts(
  value: unknown,
): RouteNavigationEnvironmentContract[] {
  const entries =
    Array.isArray(value)
      ? value
      : (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          Array.isArray(
            (value as Record<string, unknown>)
              .contracts,
          )
        )
        ? (
            value as {
              contracts: unknown[];
            }
          ).contracts
        : undefined;

  if (!entries) {
    throw new Error(
      "Route navigation environment JSON must be an array or an object with a contracts array.",
    );
  }

  const contracts =
    entries.map(parseContract);
  const ids = new Set<string>();
  for (const contract of contracts) {
    if (ids.has(contract.id)) {
      throw new Error(
        "Duplicate route navigation environment id: " +
          contract.id +
          ".",
      );
    }
    ids.add(contract.id);
  }

  return contracts;
}

export async function loadRouteNavigationEnvironmentContractsFile(
  path: string,
): Promise<RouteNavigationEnvironmentContract[]> {
  const value = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;
  return parseRouteNavigationEnvironmentContracts(
    value,
  );
}
