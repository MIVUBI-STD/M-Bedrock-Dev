import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  findScriptEventRule,
  scriptEventSymbol,
} from "../../compatibility/src/index.js";
import { findScriptMethodRule } from "../../compatibility/src/index.js";
import type { ScriptSymbolLifecycle } from "../../compatibility/src/index.js";
import { findScriptPropertyRule } from "../../compatibility/src/index.js";
import {
  findScriptEnumMemberRule,
  isKnownScriptEnum,
} from "../../compatibility/src/index.js";
import {
  findScriptSignatureRule,
  type ScriptArgumentKind,
} from "../../compatibility/src/index.js";
import { findScriptReturnContractRule } from "../../compatibility/src/index.js";
import { findScriptTypeRule } from "../../compatibility/src/index.js";
import { findScriptPropertyMutabilityRule } from "../../compatibility/src/index.js";
import { findScriptEnumValueRule } from "../../compatibility/src/index.js";

export type ScriptApiUsageKind = "event" | "method" | "property" | "enum" | "type";
export type ScriptApiKnowledgeState = "known" | "unclassified";

export interface ScriptCallShapeUsage {
  argumentCount: number;
  argumentKinds: ScriptArgumentKind[];
  hasSpreadArgument: boolean;
  occurrences: number;
  files: string[];
}

export interface ScriptEnumLiteralUsage {
  literal: string;
  operator: "==" | "===" | "!=" | "!==";
  occurrences: number;
  files: string[];
}

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
  writeOccurrences?: number;
  writeOperations?: string[];
  callShapes?: ScriptCallShapeUsage[];
  resultUses?: Array<{
    use: "ignored" | "assigned" | "guarded-assigned" | "unguarded-assigned" | "guard-condition" | "returned" | "dereferenced" | "optional-dereferenced" | "non-null-asserted" | "other";
    occurrences: number;
    files: string[];
  }>;
  literalComparisons?: ScriptEnumLiteralUsage[];
}

export interface ScriptLifecycleExposureSummary {
  member: string;
  candidateSymbols: string[];
  occurrences: number;
  exactSymbolOccurrences: number;
  lexicalOnlyOccurrences: number;
  files: string[];
}

export interface ScriptApiUsageInventory {
  totalOccurrences: number;
  uniqueSymbols: number;
  knownSymbols: number;
  unclassifiedSymbols: number;
  symbols: ScriptApiUsageSymbol[];
  lifecycleMemberExposures: ScriptLifecycleExposureSummary[];
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
  lifecycleMemberExposures: Array<ScriptLifecycleExposureSummary & {
    mapCount: number;
    maps: string[];
  }>;
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
  writeOccurrences: number;
  writeOperations: Set<string>;
  callShapes: Map<string, {
    argumentCount: number;
    argumentKinds: ScriptArgumentKind[];
    hasSpreadArgument: boolean;
    occurrences: number;
    files: Set<string>;
  }>;
  resultUses: Map<string, {
    use: "ignored" | "assigned" | "guarded-assigned" | "unguarded-assigned" | "guard-condition" | "returned" | "dereferenced" | "optional-dereferenced" | "non-null-asserted" | "other";
    occurrences: number;
    files: Set<string>;
  }>;
  literalComparisons: Map<string, {
    literal: string;
    operator: "==" | "===" | "!=" | "!==";
    occurrences: number;
    files: Set<string>;
  }>;
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

function callShapeKey(input: {
  argumentCount: number;
  argumentKinds: readonly ScriptArgumentKind[];
  hasSpreadArgument: boolean;
}): string {
  return [
    input.argumentCount,
    input.hasSpreadArgument ? "spread" : "fixed",
    input.argumentKinds.join(","),
  ].join("|");
}

function recordCallShape(
  item: MutableUsage,
  file: string,
  input: {
    argumentCount: number;
    argumentKinds: readonly ScriptArgumentKind[];
    hasSpreadArgument: boolean;
  },
): void {
  const key = callShapeKey(input);
  const current = item.callShapes.get(key);
  if (current) {
    current.occurrences += 1;
    current.files.add(file);
    return;
  }

  item.callShapes.set(key, {
    argumentCount: input.argumentCount,
    argumentKinds: [...input.argumentKinds],
    hasSpreadArgument: input.hasSpreadArgument,
    occurrences: 1,
    files: new Set([file]),
  });
}

function materializeCallShapes(
  item: MutableUsage,
): ScriptCallShapeUsage[] {
  return [...item.callShapes.values()]
    .map((shape) => ({
      argumentCount: shape.argumentCount,
      argumentKinds: shape.argumentKinds,
      hasSpreadArgument: shape.hasSpreadArgument,
      occurrences: shape.occurrences,
      files: [...shape.files].sort(),
    }))
    .sort((left, right) =>
      right.occurrences - left.occurrences ||
      left.argumentCount - right.argumentCount ||
      left.argumentKinds.join(",").localeCompare(right.argumentKinds.join(","))
    );
}

function mergeCallShapes(
  left: readonly ScriptCallShapeUsage[],
  right: readonly ScriptCallShapeUsage[],
): ScriptCallShapeUsage[] {
  const merged = new Map<string, {
    argumentCount: number;
    argumentKinds: ScriptArgumentKind[];
    hasSpreadArgument: boolean;
    occurrences: number;
    files: Set<string>;
  }>();

  for (const shape of [...left, ...right]) {
    const key = callShapeKey(shape);
    const current = merged.get(key);
    if (current) {
      current.occurrences += shape.occurrences;
      for (const file of shape.files) current.files.add(file);
      continue;
    }
    merged.set(key, {
      argumentCount: shape.argumentCount,
      argumentKinds: [...shape.argumentKinds],
      hasSpreadArgument: shape.hasSpreadArgument,
      occurrences: shape.occurrences,
      files: new Set(shape.files),
    });
  }

  return [...merged.values()]
    .map((shape) => ({
      argumentCount: shape.argumentCount,
      argumentKinds: shape.argumentKinds,
      hasSpreadArgument: shape.hasSpreadArgument,
      occurrences: shape.occurrences,
      files: [...shape.files].sort(),
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      a.argumentCount - b.argumentCount ||
      a.argumentKinds.join(",").localeCompare(b.argumentKinds.join(","))
    );
}

function recordResultUse(
  item: MutableUsage,
  file: string,
  use: "ignored" | "assigned" | "guarded-assigned" | "unguarded-assigned" | "guard-condition" | "returned" | "dereferenced" | "optional-dereferenced" | "non-null-asserted" | "other",
): void {
  const current = item.resultUses.get(use);
  if (current) {
    current.occurrences += 1;
    current.files.add(file);
    return;
  }
  item.resultUses.set(use, {
    use,
    occurrences: 1,
    files: new Set([file]),
  });
}

function materializeResultUses(item: MutableUsage) {
  return [...item.resultUses.values()]
    .map((entry) => ({
      use: entry.use,
      occurrences: entry.occurrences,
      files: [...entry.files].sort(),
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      a.use.localeCompare(b.use)
    );
}

function mergeResultUses(
  left: NonNullable<ScriptApiUsageSymbol["resultUses"]>,
  right: NonNullable<ScriptApiUsageSymbol["resultUses"]>,
) {
  const merged = new Map<string, {
    use: NonNullable<ScriptApiUsageSymbol["resultUses"]>[number]["use"];
    occurrences: number;
    files: Set<string>;
  }>();

  for (const entry of [...left, ...right]) {
    const current = merged.get(entry.use);
    if (current) {
      current.occurrences += entry.occurrences;
      for (const file of entry.files) current.files.add(file);
      continue;
    }
    merged.set(entry.use, {
      use: entry.use,
      occurrences: entry.occurrences,
      files: new Set(entry.files),
    });
  }

  return [...merged.values()]
    .map((entry) => ({
      use: entry.use,
      occurrences: entry.occurrences,
      files: [...entry.files].sort(),
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      a.use.localeCompare(b.use)
    );
}

function recordLiteralComparison(
  item: MutableUsage,
  file: string,
  literal: string,
  operator: "==" | "===" | "!=" | "!==",
): void {
  const key = `${operator}\0${literal}`;
  const current = item.literalComparisons.get(key);
  if (current) {
    current.occurrences += 1;
    current.files.add(file);
    return;
  }

  item.literalComparisons.set(key, {
    literal,
    operator,
    occurrences: 1,
    files: new Set([file]),
  });
}

function materializeLiteralComparisons(
  item: MutableUsage,
): ScriptEnumLiteralUsage[] {
  return [...item.literalComparisons.values()]
    .map((entry) => ({
      literal: entry.literal,
      operator: entry.operator,
      occurrences: entry.occurrences,
      files: [...entry.files].sort(),
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      a.literal.localeCompare(b.literal) ||
      a.operator.localeCompare(b.operator)
    );
}

function mergeLiteralComparisons(
  left: readonly ScriptEnumLiteralUsage[],
  right: readonly ScriptEnumLiteralUsage[],
): ScriptEnumLiteralUsage[] {
  const merged = new Map<string, {
    literal: string;
    operator: "==" | "===" | "!=" | "!==";
    occurrences: number;
    files: Set<string>;
  }>();

  for (const entry of [...left, ...right]) {
    const key = `${entry.operator}\0${entry.literal}`;
    const current = merged.get(key);
    if (current) {
      current.occurrences += entry.occurrences;
      for (const file of entry.files) current.files.add(file);
      continue;
    }
    merged.set(key, {
      literal: entry.literal,
      operator: entry.operator,
      occurrences: entry.occurrences,
      files: new Set(entry.files),
    });
  }

  return [...merged.values()]
    .map((entry) => ({
      literal: entry.literal,
      operator: entry.operator,
      occurrences: entry.occurrences,
      files: [...entry.files].sort(),
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      a.literal.localeCompare(b.literal) ||
      a.operator.localeCompare(b.operator)
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
    ...(item.kind === "enum" && item.literalComparisons.size > 0
      ? { literalComparisons: materializeLiteralComparisons(item) }
      : {}),
    ...(item.kind === "method" || item.kind === "property"
      ? {
          directOccurrences: item.directOccurrences,
          boundedOccurrences: item.boundedOccurrences,
          receiverTypes: [...item.receiverTypes].sort(),
          ...(item.kind === "property"
            ? {
                writeOccurrences: item.writeOccurrences,
                writeOperations: [...item.writeOperations].sort(),
              }
            : {}),
          ...(item.kind === "method"
            ? {
                callShapes: materializeCallShapes(item),
                resultUses: materializeResultUses(item),
              }
            : {}),
        }
      : {}),
  };
}

export function deriveScriptApiUsage(
  scripts: readonly ParsedScriptFile[],
): ScriptApiUsageInventory {
  const bySymbol = new Map<string, MutableUsage>();
  const exposureByMember = new Map<string, {
    member: string;
    candidateSymbols: Set<string>;
    occurrences: number;
    exactSymbolOccurrences: number;
    lexicalOnlyOccurrences: number;
    files: Set<string>;
  }>();

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
      writeOccurrences: 0,
      writeOperations: new Set<string>(),
      callShapes: new Map(),
      resultUses: new Map(),
      literalComparisons: new Map(),
    };
    bySymbol.set(key, created);
    return created;
  };

  for (const script of scripts) {
    const file = script.source.relativePath;

    for (const exposure of script.lifecycleMemberExposures) {
      let summary = exposureByMember.get(exposure.member);
      if (!summary) {
        summary = {
          member: exposure.member,
          candidateSymbols: new Set<string>(),
          occurrences: 0,
          exactSymbolOccurrences: 0,
          lexicalOnlyOccurrences: 0,
          files: new Set<string>(),
        };
        exposureByMember.set(exposure.member, summary);
      }
      summary.occurrences += 1;
      summary.files.add(file);
      for (const symbol of exposure.candidateSymbols) {
        summary.candidateSymbols.add(symbol);
      }
      if (exposure.evidence === "exact-symbol") {
        summary.exactSymbolOccurrences += 1;
      } else {
        summary.lexicalOnlyOccurrences += 1;
      }
    }

    for (const event of script.events) {
      const symbol = scriptEventSymbol(event.root, event.phase, event.event);
      const rule = findScriptEventRule(symbol);
      getOrCreate("event", symbol, file, rule);
    }

    for (const method of script.methodCalls) {
      const methodRule = findScriptMethodRule(method.symbol);
      const signatureRule = findScriptSignatureRule(method.symbol);
      const returnRule = findScriptReturnContractRule(method.symbol);
      const rule = methodRule ??
        (signatureRule ? { id: signatureRule.id } : undefined) ??
        (returnRule ? { id: returnRule.id } : undefined);
      const item = getOrCreate("method", method.symbol, file, rule);
      if (method.inference === "direct") item.directOccurrences += 1;
      else item.boundedOccurrences += 1;
      item.receiverTypes.add(method.receiverType);
      recordCallShape(item, file, method);
      recordResultUse(item, file, method.resultUse);
    }

    for (const property of script.propertyAccesses) {
      const propertyRule = findScriptPropertyRule(property.symbol);
      const mutabilityRule = findScriptPropertyMutabilityRule(property.symbol);
      const methodReferenceRule = findScriptMethodRule(property.symbol);
      const rule = propertyRule ??
        (mutabilityRule ? { id: mutabilityRule.id } : undefined) ??
        (methodReferenceRule ? { id: methodReferenceRule.id } : undefined);
      const item = getOrCreate("property", property.symbol, file, rule);
      if (property.inference === "direct") item.directOccurrences += 1;
      else item.boundedOccurrences += 1;
      item.receiverTypes.add(property.receiverType);
    }

    for (const write of script.propertyWrites) {
      const propertyRule = findScriptPropertyRule(write.symbol);
      const mutabilityRule = findScriptPropertyMutabilityRule(write.symbol);
      const rule = propertyRule ??
        (mutabilityRule ? { id: mutabilityRule.id } : undefined);
      const item = getOrCreate("property", write.symbol, file, rule);
      item.writeOccurrences += 1;
      item.writeOperations.add(write.operation);
      item.receiverTypes.add(write.receiverType);
    }

    for (const imported of script.importedSymbols) {
      if (imported.module !== "@minecraft/server") continue;
      const rule = findScriptTypeRule(imported.importedName);
      if (!rule) continue;
      getOrCreate("type", imported.importedName, file, rule);
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

    for (const comparison of script.enumValueComparisons) {
      if (comparison.module !== "@minecraft/server") continue;
      const valueRule = findScriptEnumValueRule(comparison.symbol);
      if (!valueRule) continue;

      const key = usageKey("enum", comparison.symbol);
      let item = bySymbol.get(key);

      if (!item) {
        item = getOrCreate(
          "enum",
          comparison.symbol,
          file,
          { id: valueRule.id },
        );
      } else if (!isKnownScriptEnum(comparison.enumName)) {
        item.occurrences += 1;
        item.files.add(file);
      }

      recordLiteralComparison(
        item,
        file,
        comparison.literal,
        comparison.operator,
      );
    }
  }

  const symbols = [...bySymbol.values()].map(materialize).sort(compareUsage);
  const lifecycleMemberExposures = [...exposureByMember.values()]
    .map((item) => ({
      member: item.member,
      candidateSymbols: [...item.candidateSymbols].sort(),
      occurrences: item.occurrences,
      exactSymbolOccurrences: item.exactSymbolOccurrences,
      lexicalOnlyOccurrences: item.lexicalOnlyOccurrences,
      files: [...item.files].sort(),
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      a.member.localeCompare(b.member)
    );

  return {
    totalOccurrences: symbols.reduce((sum, item) => sum + item.occurrences, 0),
    uniqueSymbols: symbols.length,
    knownSymbols: symbols.filter((item) => item.knowledge === "known").length,
    unclassifiedSymbols: symbols.filter((item) => item.knowledge === "unclassified").length,
    symbols,
    lifecycleMemberExposures,
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
  const exposureByMember = new Map<string, {
    member: string;
    candidateSymbols: Set<string>;
    occurrences: number;
    exactSymbolOccurrences: number;
    lexicalOnlyOccurrences: number;
    files: Set<string>;
    maps: Set<string>;
  }>();

  for (const entry of entries) {
    for (const exposure of entry.usage.lifecycleMemberExposures) {
      let summary = exposureByMember.get(exposure.member);
      if (!summary) {
        summary = {
          member: exposure.member,
          candidateSymbols: new Set<string>(),
          occurrences: 0,
          exactSymbolOccurrences: 0,
          lexicalOnlyOccurrences: 0,
          files: new Set<string>(),
          maps: new Set<string>(),
        };
        exposureByMember.set(exposure.member, summary);
      }
      summary.occurrences += exposure.occurrences;
      summary.exactSymbolOccurrences += exposure.exactSymbolOccurrences;
      summary.lexicalOnlyOccurrences += exposure.lexicalOnlyOccurrences;
      summary.maps.add(entry.mapId);
      for (const file of exposure.files) summary.files.add(file);
      for (const symbol of exposure.candidateSymbols) summary.candidateSymbols.add(symbol);
    }

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
      if (symbol.kind === "property") {
        current.item.writeOccurrences =
          (current.item.writeOccurrences ?? 0) + (symbol.writeOccurrences ?? 0);
        current.item.writeOperations = [...new Set([
          ...(current.item.writeOperations ?? []),
          ...(symbol.writeOperations ?? []),
        ])].sort();
      }
      if (symbol.kind === "method") {
        current.item.callShapes = mergeCallShapes(
          current.item.callShapes ?? [],
          symbol.callShapes ?? [],
        );
        current.item.resultUses = mergeResultUses(
          current.item.resultUses ?? [],
          symbol.resultUses ?? [],
        );
      }
      if (symbol.kind === "enum") {
        current.item.literalComparisons = mergeLiteralComparisons(
          current.item.literalComparisons ?? [],
          symbol.literalComparisons ?? [],
        );
      }
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

  const lifecycleMemberExposures = [...exposureByMember.values()]
    .map((item) => ({
      member: item.member,
      candidateSymbols: [...item.candidateSymbols].sort(),
      occurrences: item.occurrences,
      exactSymbolOccurrences: item.exactSymbolOccurrences,
      lexicalOnlyOccurrences: item.lexicalOnlyOccurrences,
      files: [...item.files].sort(),
      mapCount: item.maps.size,
      maps: [...item.maps].sort(),
    }))
    .sort((a, b) =>
      b.mapCount - a.mapCount ||
      b.occurrences - a.occurrences ||
      a.member.localeCompare(b.member)
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
    lifecycleMemberExposures,
  };
}
