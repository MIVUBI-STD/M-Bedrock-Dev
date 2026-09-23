import type { ParsedScriptFile } from "../../../analyzers/scripts/src/types.js";
import {
  findScriptEventRule,
  scriptEventSymbol,
} from "../../compatibility/src/script-event-matrix.js";
import { findScriptMethodRule } from "../../compatibility/src/script-method-matrix.js";
import type { ScriptSymbolLifecycle } from "../../compatibility/src/script-lifecycle.js";
import { findScriptPropertyRule } from "../../compatibility/src/script-property-matrix.js";
import {
  findScriptEnumMemberRule,
  isKnownScriptEnum,
} from "../../compatibility/src/script-enum-matrix.js";

export type ScriptApiUsageKind = "event" | "method" | "property" | "enum";
export type ScriptApiKnowledgeState = "known" | "unclassified";

export interface ScriptApiUsageSymbol {
  kind: ScriptApiUsageKind;
  symbol: string;
  occurrences: number;
  files: string[];
  knowledge: ScriptApiKnowledgeState;
  ruleId?: string;
  stability?: "stable" | "pre-release";
  introducedIn?: string;
  lifecycle?: ScriptSymbolLifecycle;
  directOccurrences?: number;
  boundedOccurrences?: number;
  receiverTypes?: string[];
}

export interface ScriptApiUsageInventory {
  totalOccurrences: number;
  uniqueSymbols: number;
  knownSymbols: number;
  unclassifiedSymbols: number;
  symbols: ScriptApiUsageSymbol[];
}

export interface ScriptApiUsageMapEntry {
  mapId: string;
  label?: string;
  usage: ScriptApiUsageInventory;
}

export interface ScriptApiPortfolioSymbol extends ScriptApiUsageSymbol {
  mapCount: number;
  maps: string[];
}

export interface ScriptApiUsagePortfolio {
  schemaVersion: 1;
  maps: Array<{ mapId: string; label?: string }>;
  totalOccurrences: number;
  uniqueSymbols: number;
  knownSymbols: number;
  unclassifiedSymbols: number;
  symbols: ScriptApiPortfolioSymbol[];
  promotionCandidates: ScriptApiPortfolioSymbol[];
}

interface MutableUsage {
  kind: ScriptApiUsageKind;
  symbol: string;
  occurrences: number;
  files: Set<string>;
  knowledge: ScriptApiKnowledgeState;
  ruleId?: string;
  stability?: "stable" | "pre-release";
  introducedIn?: string;
  lifecycle?: ScriptSymbolLifecycle;
  directOccurrences: number;
  boundedOccurrences: number;
  receiverTypes: Set<string>;
}

function usageKey(kind: ScriptApiUsageKind, symbol: string): string {
  return `${kind}\0${symbol}`;
}

function compareUsage(
  left: Pick<ScriptApiUsageSymbol, "occurrences" | "kind" | "symbol">,
  right: Pick<ScriptApiUsageSymbol, "occurrences" | "kind" | "symbol">,
): number {
  return (
    right.occurrences - left.occurrences ||
    left.kind.localeCompare(right.kind) ||
    left.symbol.localeCompare(right.symbol)
  );
}

function materialize(item: MutableUsage): ScriptApiUsageSymbol {
  return {
    kind: item.kind,
    symbol: item.symbol,
    occurrences: item.occurrences,
    files: [...item.files].sort(),
    knowledge: item.knowledge,
    ...(item.ruleId ? { ruleId: item.ruleId } : {}),
    ...(item.stability ? { stability: item.stability } : {}),
    ...(item.introducedIn ? { introducedIn: item.introducedIn } : {}),
    ...(item.lifecycle ? { lifecycle: item.lifecycle } : {}),
    ...(item.kind === "method" || item.kind === "property"
      ? {
          directOccurrences: item.directOccurrences,
          boundedOccurrences: item.boundedOccurrences,
          receiverTypes: [...item.receiverTypes].sort(),
        }
      : {}),
  };
}

export function deriveScriptApiUsage(
  scripts: readonly ParsedScriptFile[],
): ScriptApiUsageInventory {
  const bySymbol = new Map<string, MutableUsage>();

  const getOrCreate = (
    kind: ScriptApiUsageKind,
    symbol: string,
    file: string,
    rule?: {
      id: string;
      stability?: "stable" | "pre-release";
      introducedIn?: string;
      lifecycle?: ScriptSymbolLifecycle;
    },
  ): MutableUsage => {
    const key = usageKey(kind, symbol);
    const existing = bySymbol.get(key);
    if (existing) {
      existing.occurrences += 1;
      existing.files.add(file);
      return existing;
    }

    const created: MutableUsage = {
      kind,
      symbol,
      occurrences: 1,
      files: new Set([file]),
      knowledge: rule ? "known" : "unclassified",
      ...(rule?.id ? { ruleId: rule.id } : {}),
      ...(rule?.stability ? { stability: rule.stability } : {}),
      ...(rule?.introducedIn ? { introducedIn: rule.introducedIn } : {}),
      ...(rule?.lifecycle ? { lifecycle: rule.lifecycle } : {}),
      directOccurrences: 0,
      boundedOccurrences: 0,
      receiverTypes: new Set<string>(),
    };
    bySymbol.set(key, created);
    return created;
  };

  for (const script of scripts) {
    const file = script.source.relativePath;

    for (const event of script.events) {
      const symbol = scriptEventSymbol(event.root, event.phase, event.event);
      const rule = findScriptEventRule(symbol);
      getOrCreate("event", symbol, file, rule);
    }

    for (const method of script.methodCalls) {
      const rule = findScriptMethodRule(method.symbol);
      const item = getOrCreate("method", method.symbol, file, rule);
      if (method.inference === "direct") item.directOccurrences += 1;
      else item.boundedOccurrences += 1;
      item.receiverTypes.add(method.receiverType);
    }

    for (const property of script.propertyAccesses) {
      const rule = findScriptPropertyRule(property.symbol);
      const item = getOrCreate("property", property.symbol, file, rule);
      if (property.inference === "direct") item.directOccurrences += 1;
      else item.boundedOccurrences += 1;
      item.receiverTypes.add(property.receiverType);
    }

    for (const member of script.moduleMemberAccesses) {
      if (
        member.module !== "@minecraft/server" ||
        !isKnownScriptEnum(member.importedName)
      ) {
        continue;
      }
      const rule = findScriptEnumMemberRule(member.symbol);
      getOrCreate("enum", member.symbol, file, rule);
    }
  }

  const symbols = [...bySymbol.values()].map(materialize).sort(compareUsage);
  return {
    totalOccurrences: symbols.reduce((sum, item) => sum + item.occurrences, 0),
    uniqueSymbols: symbols.length,
    knownSymbols: symbols.filter((item) => item.knowledge === "known").length,
    unclassifiedSymbols: symbols.filter((item) => item.knowledge === "unclassified").length,
    symbols,
  };
}

export function aggregateScriptApiUsage(
  entries: readonly ScriptApiUsageMapEntry[],
): ScriptApiUsagePortfolio {
  const bySymbol = new Map<string, {
    item: ScriptApiPortfolioSymbol;
    files: Set<string>;
    receiverTypes: Set<string>;
    maps: Set<string>;
  }>();

  for (const entry of entries) {
    for (const symbol of entry.usage.symbols) {
      const key = usageKey(symbol.kind, symbol.symbol);
      const current = bySymbol.get(key);
      if (!current) {
        bySymbol.set(key, {
          item: {
            ...symbol,
            files: [],
            mapCount: 1,
            maps: [],
          },
          files: new Set(symbol.files),
          receiverTypes: new Set(symbol.receiverTypes ?? []),
          maps: new Set([entry.mapId]),
        });
        continue;
      }

      current.item.occurrences += symbol.occurrences;
      current.maps.add(entry.mapId);
      for (const file of symbol.files) current.files.add(file);
      for (const receiver of symbol.receiverTypes ?? []) {
        current.receiverTypes.add(receiver);
      }
      current.item.directOccurrences =
        (current.item.directOccurrences ?? 0) + (symbol.directOccurrences ?? 0);
      current.item.boundedOccurrences =
        (current.item.boundedOccurrences ?? 0) + (symbol.boundedOccurrences ?? 0);
      if (current.item.knowledge === "unclassified" && symbol.knowledge === "known") {
        current.item.knowledge = "known";
        if (symbol.ruleId) current.item.ruleId = symbol.ruleId;
        if (symbol.stability) current.item.stability = symbol.stability;
        if (symbol.introducedIn) current.item.introducedIn = symbol.introducedIn;
        if (symbol.lifecycle) current.item.lifecycle = symbol.lifecycle;
      }
    }
  }

  const symbols = [...bySymbol.values()].map(({ item, files, receiverTypes, maps }) => ({
    ...item,
    files: [...files].sort(),
    mapCount: maps.size,
    maps: [...maps].sort(),
    ...(item.kind === "method" || item.kind === "property"
      ? { receiverTypes: [...receiverTypes].sort() }
      : {}),
  })).sort((left, right) =>
    right.mapCount - left.mapCount ||
    compareUsage(left, right)
  );

  const promotionCandidates = symbols
    .filter((item) => item.knowledge === "unclassified")
    .sort((left, right) =>
      right.mapCount - left.mapCount ||
      right.occurrences - left.occurrences ||
      left.kind.localeCompare(right.kind) ||
      left.symbol.localeCompare(right.symbol)
    );

  return {
    schemaVersion: 1,
    maps: entries.map((entry) => ({
      mapId: entry.mapId,
      ...(entry.label ? { label: entry.label } : {}),
    })),
    totalOccurrences: symbols.reduce((sum, item) => sum + item.occurrences, 0),
    uniqueSymbols: symbols.length,
    knownSymbols: symbols.filter((item) => item.knowledge === "known").length,
    unclassifiedSymbols: symbols.filter((item) => item.knowledge === "unclassified").length,
    symbols,
    promotionCandidates,
  };
}
