import type {
  ScriptSafeConfigAnalysis,
} from "./script-safe-config-analysis.js";

export type GameplayBoundaryKind =
  | "maximum"
  | "minimum"
  | "count"
  | "timer"
  | "threshold"
  | "limit";

export interface GameplayBoundaryRecord {
  readonly id: string;
  readonly name: string;
  readonly kind: GameplayBoundaryKind;
  readonly value: number;
  readonly cases: readonly number[];
  readonly sourcePath: string;
}

export interface GameplayBoundaryRegistry {
  readonly records: readonly GameplayBoundaryRecord[];
  readonly unresolvedNames: readonly string[];
}

const BOUNDARY_NAME =
  /(?:MAX|MIN|COUNT|LIMIT|CAPACITY|RETRY|RETRIES|LEVEL|WAVE|ROUND|TIMER|TIME|SECONDS|PLAYER|PLAYERS|ARENA|SCORE|COIN|CURRENCY|HEALTH)/i;

function kindFor(name: string): GameplayBoundaryKind {
  if (/MAX/i.test(name)) return "maximum";
  if (/MIN/i.test(name)) return "minimum";
  if (/(TIMER|TIME|SECONDS)/i.test(name)) return "timer";
  if (/COUNT/i.test(name)) return "count";
  if (/(LIMIT|CAPACITY)/i.test(name)) return "limit";
  return "threshold";
}

function casesFor(
  kind: GameplayBoundaryKind,
  value: number,
): readonly number[] {
  if (!Number.isFinite(value)) return [];

  if (
    Number.isInteger(value) &&
    value >= 0 &&
    (
      kind === "maximum" ||
      kind === "count" ||
      kind === "limit"
    )
  ) {
    return [
      ...new Set([
        0,
        1,
        Math.max(0, value - 1),
        value,
        value + 1,
      ]),
    ].sort((a, b) => a - b);
  }

  return [
    ...new Set([
      Math.max(0, value - 1),
      value,
      value + 1,
    ]),
  ].sort((a, b) => a - b);
}

export function buildGameplayBoundaryRegistry(
  analysis: ScriptSafeConfigAnalysis,
): GameplayBoundaryRegistry {
  const records =
    analysis.resolvedBindings
      .filter(
        (binding) =>
          BOUNDARY_NAME.test(binding.name) &&
          typeof binding.value === "number" &&
          Number.isFinite(binding.value),
      )
      .map((binding) => {
        const kind = kindFor(binding.name);
        const value = binding.value as number;
        return {
          id:
            "boundary:" +
            binding.scriptId +
            ":" +
            binding.name,
          name: binding.name,
          kind,
          value,
          cases: casesFor(kind, value),
          sourcePath:
            binding.source.relativePath,
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name) ||
        a.sourcePath.localeCompare(b.sourcePath)
      );

  const unresolvedNames =
    analysis.failedBindings
      .filter((binding) =>
        BOUNDARY_NAME.test(binding.name)
      )
      .map((binding) => binding.name)
      .filter(
        (name, index, values) =>
          values.indexOf(name) === index,
      )
      .sort();

  return {
    records,
    unresolvedNames,
  };
}
