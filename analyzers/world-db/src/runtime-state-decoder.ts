import type {
  WorldRuntimeStateKind,
  WorldRuntimeStateRecord,
} from "./runtime-state-forensics.js";
import {
  analyzeWorldDbKey,
} from "./key-shape.js";

export interface WorldDbRuntimeKeyRule {
  id: string;
  kind: WorldRuntimeStateKind;
  prefix: string;
  arenaPattern?: RegExp;
  persistent?: boolean;
}

export interface DecodedWorldRuntimeState {
  record?: WorldRuntimeStateRecord;
  ruleId?: string;
  confidence: "exact" | "pattern" | "unknown";
  rawKey: string;
}

export const DEFAULT_WORLD_RUNTIME_KEY_RULES:
  readonly WorldDbRuntimeKeyRule[] = [
    {
      id: "ticking-area",
      kind: "ticking-area",
      prefix: "tickingarea_",
      arenaPattern: /arena[_:-]?([a-z0-9-]+)/i,
      persistent: true,
    },
    {
      id: "chunk-loaded-request",
      kind: "chunk-loaded-request",
      prefix: "chunk_loaded_request",
      arenaPattern: /arena[_:-]?([a-z0-9-]+)/i,
      persistent: true,
    },
  ] as const;

export function decodeWorldDbRuntimeStateKey(
  key: Uint8Array,
  rules: readonly WorldDbRuntimeKeyRule[] =
    DEFAULT_WORLD_RUNTIME_KEY_RULES,
): DecodedWorldRuntimeState {
  const fact = analyzeWorldDbKey(key);
  const rawKey =
    fact.shape === "ascii-named"
      ? fact.asciiName ?? ""
      : fact.keyHex;

  if (fact.shape !== "ascii-named" || !fact.asciiName) {
    return {
      confidence: "unknown",
      rawKey,
    };
  }

  for (const rule of rules) {
    if (!fact.asciiName.startsWith(rule.prefix)) continue;
    const arenaMatch =
      rule.arenaPattern?.exec(fact.asciiName);
    return {
      confidence:
        fact.asciiName === rule.prefix
          ? "exact"
          : "pattern",
      ruleId: rule.id,
      rawKey: fact.asciiName,
      record: {
        kind: rule.kind,
        key: fact.asciiName,
        ...(arenaMatch?.[1]
          ? { arenaId: arenaMatch[1] }
          : {}),
        ...(rule.persistent === undefined
          ? {}
          : { persistent: rule.persistent }),
        active: true,
        source: "leveldb-key",
      },
    };
  }

  return {
    confidence: "unknown",
    rawKey: fact.asciiName,
  };
}
