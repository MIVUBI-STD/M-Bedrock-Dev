import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  evaluateSafeConfig,
  type SafeConfigExpression,
  type SafeConfigValue,
} from "../../behavior-model/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";

export interface ResolvedScriptSafeConfigBinding {
  scriptId: string;
  name: string;
  value: SafeConfigValue;
  source: SourceRef;
}

export interface FailedScriptSafeConfigBinding {
  scriptId: string;
  name: string;
  reason: string;
  source: SourceRef;
}

export interface ScriptArenaCountCandidate {
  scriptId: string;
  name: string;
  value: number;
  source: SourceRef;
}

export interface ScriptSafeConfigAnalysis {
  compiledBindings: number;
  rejectedBindings: number;
  resolvedBindings: readonly ResolvedScriptSafeConfigBinding[];
  failedBindings: readonly FailedScriptSafeConfigBinding[];
  arenaCountCandidates: readonly ScriptArenaCountCandidate[];
  resolvedArenaCount?: number;
  arenaCountConflict: boolean;
}

const ARENA_COUNT_NAME =
  /^(?:ARENA_COUNT|MAX_ARENAS|MAX_CONCURRENT_ARENAS|MAX_ACTIVE_ARENAS)$/;

export function analyzeScriptSafeConfig(
  scripts: readonly ParsedScriptFile[],
): ScriptSafeConfigAnalysis {
  const resolvedBindings: ResolvedScriptSafeConfigBinding[] = [];
  const failedBindings: FailedScriptSafeConfigBinding[] = [];
  const arenaCountCandidates: ScriptArenaCountCandidate[] = [];

  for (const script of scripts) {
    const compiled = script.safeConfigBindings ?? [];
    const environment = {
      bindings: Object.fromEntries(
        compiled.map((item) => [
          item.name,
          item.expression,
        ]),
      ) as Readonly<Record<string, SafeConfigExpression>>,
    };

    for (const binding of compiled) {
      try {
        const value = evaluateSafeConfig(
          { kind: "ref", name: binding.name },
          environment,
        );
        resolvedBindings.push({
          scriptId: script.identifier,
          name: binding.name,
          value,
          source: binding.source,
        });

        if (
          ARENA_COUNT_NAME.test(binding.name) &&
          typeof value === "number" &&
          Number.isInteger(value) &&
          value > 0
        ) {
          arenaCountCandidates.push({
            scriptId: script.identifier,
            name: binding.name,
            value,
            source: binding.source,
          });
        }
      } catch (error) {
        failedBindings.push({
          scriptId: script.identifier,
          name: binding.name,
          reason:
            error instanceof Error
              ? error.message
              : String(error),
          source: binding.source,
        });
      }
    }
  }

  const distinctArenaCounts = [
    ...new Set(
      arenaCountCandidates.map((item) => item.value),
    ),
  ].sort((a, b) => a - b);

  return {
    compiledBindings: scripts.reduce(
      (sum, script) =>
        sum + (script.safeConfigBindings?.length ?? 0),
      0,
    ),
    rejectedBindings: scripts.reduce(
      (sum, script) =>
        sum + (script.safeConfigRejected?.length ?? 0),
      0,
    ),
    resolvedBindings: resolvedBindings.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    failedBindings: failedBindings.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    arenaCountCandidates: arenaCountCandidates.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    ...(distinctArenaCounts.length === 1
      ? { resolvedArenaCount: distinctArenaCounts[0] }
      : {}),
    arenaCountConflict:
      distinctArenaCounts.length > 1,
  };
}
