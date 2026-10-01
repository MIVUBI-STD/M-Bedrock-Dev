import { readFile } from "node:fs/promises";
import type { ArenaRegionContract } from "../../../project-model/src/index.js";

function isFinitePoint(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.x === "number" && Number.isFinite(point.x) &&
    typeof point.y === "number" && Number.isFinite(point.y) &&
    typeof point.z === "number" && Number.isFinite(point.z)
  );
}

function parseContract(value: unknown, index: number): ArenaRegionContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Arena region contract at index ${index} must be an object.`);
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || item.id.trim().length === 0) {
    throw new Error(`Arena region contract at index ${index} requires a non-empty id.`);
  }
  if (
    item.role !== "static" &&
    item.role !== "mutable" &&
    item.role !== "ignore"
  ) {
    throw new Error(`Arena region contract ${item.id} has an invalid role.`);
  }
  if (
    item.coordinateSpace !== "absolute" &&
    item.coordinateSpace !== "canonical-relative"
  ) {
    throw new Error(
      `Arena region contract ${item.id} requires coordinateSpace absolute or canonical-relative.`,
    );
  }

  const volume =
    item.volume &&
    typeof item.volume === "object" &&
    !Array.isArray(item.volume)
      ? item.volume as Record<string, unknown>
      : undefined;
  if (!volume || !isFinitePoint(volume.min) || !isFinitePoint(volume.max)) {
    throw new Error(`Arena region contract ${item.id} requires finite min/max coordinates.`);
  }

  return {
    id: item.id,
    role: item.role,
    coordinateSpace: item.coordinateSpace,
    volume: {
      min: volume.min,
      max: volume.max,
    },
    ...(typeof item.purpose === "string"
      ? { purpose: item.purpose }
      : {}),
  };
}

export function parseArenaRegionContracts(
  value: unknown,
): ArenaRegionContract[] {
  const entries =
    Array.isArray(value)
      ? value
      : (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          Array.isArray((value as Record<string, unknown>).contracts)
        )
        ? (value as { contracts: unknown[] }).contracts
        : undefined;

  if (!entries) {
    throw new Error(
      "Arena region contracts JSON must be an array or an object with a contracts array.",
    );
  }

  const contracts = entries.map(parseContract);
  const ids = new Set<string>();
  for (const contract of contracts) {
    if (ids.has(contract.id)) {
      throw new Error(`Duplicate arena region contract id: ${contract.id}.`);
    }
    ids.add(contract.id);
  }
  return contracts;
}

export async function loadArenaRegionContractsFile(
  path: string,
): Promise<ArenaRegionContract[]> {
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  return parseArenaRegionContracts(raw);
}
