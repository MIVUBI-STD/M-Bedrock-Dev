import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export interface TitleLifecycleEvidence {
  target: string;
  hasTimes: boolean;
  hasClear: boolean;
  hasReset: boolean;
  titleWrites: number;
}

export function analyzeTitleLifecycle(
  scripts: readonly ParsedScriptFile[],
): TitleLifecycleEvidence[] {
  const byTarget = new Map<string, TitleLifecycleEvidence>();
  for (const script of scripts) {
    for (const literal of script.commandLiterals) {
      const match = /^\/?title\s+(\S+)\s+(\S+)/i.exec(literal.command.trim());
      if (!match) continue;
      const target = match[1]!;
      const operation = match[2]!.toLowerCase();
      const current = byTarget.get(target) ?? {
        target,
        hasTimes: false,
        hasClear: false,
        hasReset: false,
        titleWrites: 0,
      };
      if (operation === "times") current.hasTimes = true;
      if (operation === "clear") current.hasClear = true;
      if (operation === "reset") current.hasReset = true;
      if (operation === "title" || operation === "subtitle" || operation === "actionbar") {
        current.titleWrites += 1;
      }
      byTarget.set(target, current);
    }
  }
  return [...byTarget.values()].sort((a, b) => a.target.localeCompare(b.target));
}
