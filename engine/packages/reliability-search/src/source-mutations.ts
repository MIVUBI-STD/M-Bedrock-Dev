import type { SourceMutation } from "./mutation-types.js";

function unique(mutations: SourceMutation[]): SourceMutation[] {
  const seen = new Set<string>();
  return mutations.filter((mutation) => {
    const key = `${mutation.descriptor.operator}\u0000${mutation.mutated}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mutateSelectorScope(command: string): SourceMutation[] {
  const mutations: SourceMutation[] = [];

  const selectorPattern = /@(a|e|p|r|s)\[([^\]]+)\]/g;
  for (const match of command.matchAll(selectorPattern)) {
    const full = match[0];
    const selectorType = match[1];
    const args = match[2] ?? "";
    const scoped = args
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const dangerousFilters = scoped.filter((part) =>
      part.startsWith("tag=") ||
      part.startsWith("scores=") ||
      part.startsWith("name=") ||
      part.startsWith("type=")
    );

    if (dangerousFilters.length === 0) continue;

    mutations.push({
      descriptor: {
        id: `selector-broaden-${match.index ?? 0}`,
        operator: "selector-broaden",
        domain: "command-selector",
        description: `Remove selector filters from ${full}.`,
      },
      original: command,
      mutated:
        command.slice(0, match.index) +
        `@${selectorType}` +
        command.slice((match.index ?? 0) + full.length),
    });
  }

  return unique(mutations);
}

export function mutateTagFilterOmission(command: string): SourceMutation[] {
  const mutations: SourceMutation[] = [];
  const selectorPattern = /@(a|e|p|r|s)\[([^\]]+)\]/g;

  for (const match of command.matchAll(selectorPattern)) {
    const full = match[0];
    const selectorType = match[1]!;
    const args = (match[2] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const filtered = args.filter((part) => !part.startsWith("tag="));
    if (filtered.length === args.length) continue;

    const replacement = filtered.length > 0
      ? `@${selectorType}[${filtered.join(",")}]`
      : `@${selectorType}`;

    mutations.push({
      descriptor: {
        id: `tag-filter-omit-${match.index ?? 0}`,
        operator: "tag-filter-omit",
        domain: "command-selector",
        description: `Remove tag filter from selector ${full}.`,
      },
      original: command,
      mutated:
        command.slice(0, match.index) +
        replacement +
        command.slice((match.index ?? 0) + full.length),
    });
  }

  return unique(mutations);
}

export function mutateAbsoluteCoordinates(command: string): SourceMutation[] {
  const tokens = command.trim().split(/\s+/);
  const commandName = tokens[0]?.toLowerCase();
  const coordinateIndexes =
    commandName === "fill" ? [1, 2, 3, 4, 5, 6] :
    commandName === "setblock" ? [1, 2, 3] :
    commandName === "tp" || commandName === "teleport" ? [2, 3, 4] :
    [];

  const mutations: SourceMutation[] = [];

  for (const index of coordinateIndexes) {
    const token = tokens[index];
    if (!token || token.startsWith("~") || token.startsWith("^")) continue;
    const value = Number(token);
    if (!Number.isFinite(value)) continue;

    for (const delta of [-1, 1]) {
      const copy = [...tokens];
      copy[index] = String(value + delta);
      mutations.push({
        descriptor: {
          id: `coordinate-shift-${index}-${delta > 0 ? "plus" : "minus"}1`,
          operator: "coordinate-shift",
          domain: "command-coordinate",
          description: `Shift absolute coordinate token ${index} by ${delta}.`,
        },
        original: command,
        mutated: copy.join(" "),
      });
    }
  }

  return unique(mutations);
}

export function mutateStructureReference(command: string): SourceMutation[] {
  const match = command.match(/^\s*structure\s+load\s+(\S+)/i);
  if (!match) return [];

  const target = match[1]!;
  const mutatedTarget = target.includes(":")
    ? target.replace(/:([^:]+)$/, ":__mutation_missing__$1")
    : `__mutation_missing__${target}`;

  return [{
    descriptor: {
      id: "structure-reference-redirect",
      operator: "structure-reference-redirect",
      domain: "command-reference",
      description: `Redirect structure reference ${target} to a non-canonical identifier.`,
    },
    original: command,
    mutated: command.replace(target, mutatedTarget),
  }];
}

export function mutateFunctionReference(command: string): SourceMutation[] {
  const match = command.match(/^\s*function\s+(\S+)/i);
  if (!match) return [];

  const target = match[1]!;
  return [{
    descriptor: {
      id: "function-reference-redirect",
      operator: "function-reference-redirect",
      domain: "command-reference",
      description: `Redirect function reference ${target} to a non-canonical identifier.`,
    },
    original: command,
    mutated: command.replace(target, `__mutation_missing__/${target}`),
  }];
}

export function mutateScoreboardObjective(command: string): SourceMutation[] {
  const tokens = command.trim().split(/\s+/);
  if (tokens[0]?.toLowerCase() !== "scoreboard" || tokens[1]?.toLowerCase() !== "players") {
    return [];
  }

  // Bedrock player operations place the first objective after the target.
  const operation = tokens[2]?.toLowerCase();
  if (!operation) return [];
  const objectiveIndex =
    ["set", "add", "remove", "test", "random", "reset"].includes(operation)
      ? 4
      : operation === "operation"
        ? 4
        : undefined;

  if (objectiveIndex === undefined || !tokens[objectiveIndex]) return [];
  const originalObjective = tokens[objectiveIndex]!;
  const copy = [...tokens];
  copy[objectiveIndex] = `__mutation_missing__${originalObjective}`;

  return [{
    descriptor: {
      id: "scoreboard-objective-substitution",
      operator: "scoreboard-objective-substitution",
      domain: "command-reference",
      description: `Substitute scoreboard objective ${originalObjective}.`,
    },
    original: command,
    mutated: copy.join(" "),
  }];
}

export function mutateCommandSource(command: string): SourceMutation[] {
  return unique([
    ...mutateSelectorScope(command),
    ...mutateTagFilterOmission(command),
    ...mutateAbsoluteCoordinates(command),
    ...mutateStructureReference(command),
    ...mutateFunctionReference(command),
    ...mutateScoreboardObjective(command),
  ]);
}
