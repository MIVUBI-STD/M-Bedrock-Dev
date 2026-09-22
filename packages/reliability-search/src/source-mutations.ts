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

    const mutatedSelector = `@${selectorType}`;
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
        mutatedSelector +
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

export function mutateCommandSource(command: string): SourceMutation[] {
  return unique([
    ...mutateSelectorScope(command),
    ...mutateAbsoluteCoordinates(command),
    ...mutateStructureReference(command),
  ]);
}
