import type { UpdateDeltaEntry } from "../../reliability/src/types.js";
import type {
  ScriptApiUsageInventory,
  ScriptApiUsageKind,
  ScriptApiUsageSymbol,
} from "./script-api-usage.js";

export type ScriptUpdateMatchKind = "exact" | "alias";

export interface ScriptUpdateSymbolMatch {
  observedSymbol: string;
  observedKind: ScriptApiUsageKind;
  affectedIdentifier: string;
  matchKind: ScriptUpdateMatchKind;
  beforeOccurrences: number;
  afterOccurrences: number;
  beforeFiles: string[];
  afterFiles: string[];
  knowledge: "known" | "unclassified";
}

export interface ScriptUpdateCorrelation {
  moduleSurfaceOverlap: boolean;
  moduleIdentifiers: string[];
  exactSymbolMatches: ScriptUpdateSymbolMatch[];
  observedSymbols: number;
  unclassifiedObservedSymbols: string[];
}

function rootAlias(symbol: string): string | undefined {
  if (symbol.startsWith("world.beforeEvents.")) {
    return "WorldBeforeEvents." + symbol.slice("world.beforeEvents.".length);
  }
  if (symbol.startsWith("world.afterEvents.")) {
    return "WorldAfterEvents." + symbol.slice("world.afterEvents.".length);
  }
  if (symbol.startsWith("system.beforeEvents.")) {
    return "SystemBeforeEvents." + symbol.slice("system.beforeEvents.".length);
  }
  if (symbol.startsWith("system.afterEvents.")) {
    return "SystemAfterEvents." + symbol.slice("system.afterEvents.".length);
  }
  if (symbol.startsWith("world.")) {
    return "World." + symbol.slice("world.".length);
  }
  if (symbol.startsWith("system.")) {
    return "System." + symbol.slice("system.".length);
  }
  return undefined;
}

function aliases(symbol: string): string[] {
  const alias = rootAlias(symbol);
  return alias && alias !== symbol ? [symbol, alias] : [symbol];
}

function bySymbol(inventory: ScriptApiUsageInventory): Map<string, ScriptApiUsageSymbol> {
  return new Map(inventory.symbols.map((item) => [item.symbol, item]));
}

function isServerModuleIdentifier(identifier: string): boolean {
  return /^@minecraft\/server(?:@|$)/.test(identifier);
}

export function correlateScriptUsageWithUpdate(
  entry: UpdateDeltaEntry,
  before: ScriptApiUsageInventory,
  after: ScriptApiUsageInventory,
): ScriptUpdateCorrelation {
  const affected = new Set(entry.affectedIdentifiers);
  const beforeBySymbol = bySymbol(before);
  const afterBySymbol = bySymbol(after);
  const allSymbols = new Map<string, ScriptApiUsageSymbol>();

  for (const item of before.symbols) allSymbols.set(item.symbol, item);
  for (const item of after.symbols) {
    if (!allSymbols.has(item.symbol)) allSymbols.set(item.symbol, item);
  }

  const exactSymbolMatches: ScriptUpdateSymbolMatch[] = [];
  for (const [symbol, observed] of allSymbols) {
    const candidates = aliases(symbol);
    const matched = candidates.find((candidate) => affected.has(candidate));
    if (!matched) continue;

    const beforeItem = beforeBySymbol.get(symbol);
    const afterItem = afterBySymbol.get(symbol);
    exactSymbolMatches.push({
      observedSymbol: symbol,
      observedKind: observed.kind,
      affectedIdentifier: matched,
      matchKind: matched === symbol ? "exact" : "alias",
      beforeOccurrences: beforeItem?.occurrences ?? 0,
      afterOccurrences: afterItem?.occurrences ?? 0,
      beforeFiles: beforeItem?.files ?? [],
      afterFiles: afterItem?.files ?? [],
      knowledge: observed.knowledge,
    });
  }

  exactSymbolMatches.sort((left, right) =>
    left.observedSymbol.localeCompare(right.observedSymbol)
  );

  const moduleIdentifiers = entry.affectedIdentifiers
    .filter(isServerModuleIdentifier)
    .sort();

  return {
    moduleSurfaceOverlap:
      moduleIdentifiers.length > 0 &&
      (before.totalOccurrences > 0 || after.totalOccurrences > 0),
    moduleIdentifiers,
    exactSymbolMatches,
    observedSymbols: allSymbols.size,
    unclassifiedObservedSymbols: [...allSymbols.values()]
      .filter((item) => item.knowledge === "unclassified")
      .map((item) => item.symbol)
      .sort(),
  };
}
