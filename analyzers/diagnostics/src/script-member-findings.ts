import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { findScriptPropertyRule } from "../../../packages/compatibility/src/index.js";
import { findScriptEnumMemberRule } from "../../../packages/compatibility/src/index.js";
import { evaluateScriptSymbolLifecycle } from "../../../packages/compatibility/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { ScriptApiTrack } from "../../../packages/compatibility/src/index.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

function lifecycleFinding(input: {
  symbol: string;
  symbolKind: "property" | "enum";
  source: SourceRef;
  ruleId: string;
  lifecycle: {
    deprecatedInMajor?: number;
    removedIn: string;
    replacement?: string;
    sourceIds: readonly string[];
  };
  moduleVersion: string;
  moduleTrack: ScriptApiTrack;
}): DiagnosticFinding | undefined {
  const lifecycle = evaluateScriptSymbolLifecycle(
    input.lifecycle,
    input.moduleVersion,
    input.moduleTrack,
  );
  if (lifecycle.state !== "deprecated" && lifecycle.state !== "removed") {
    return undefined;
  }

  const removed = lifecycle.state === "removed";
  return createDiagnostic({
    code: removed
      ? "SCRIPT_API_REMOVED_SYMBOL"
      : "SCRIPT_API_DEPRECATED_SYMBOL",
    severity: removed ? "critical" : "minor",
    message: removed
      ? `${input.symbol} was removed in @minecraft/server ${input.lifecycle.removedIn}, but the manifest declares ${input.moduleVersion}.`
      : `${input.symbol} is deprecated in the documented 1.x API and scheduled for removal in ${input.lifecycle.removedIn}.`,
    source: input.source,
    data: {
      symbol: input.symbol,
      symbolKind: input.symbolKind,
      module: "@minecraft/server",
      declaredVersion: input.moduleVersion,
      declaredTrack: input.moduleTrack,
      lifecycleState: lifecycle.state,
      removedIn: input.lifecycle.removedIn,
      replacement: input.lifecycle.replacement ?? null,
      ruleId: input.ruleId,
    },
  });
}

export function scriptPropertyLifecycleDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];
  const seen = new Set<string>();

  for (const script of scripts) {
    for (const access of script.propertyAccesses) {
      const rule = findScriptPropertyRule(access.symbol);
      if (!rule?.lifecycle) continue;

      const key = `${script.source.relativePath}\0property\0${access.symbol}`;
      if (seen.has(key)) continue;

      const finding = lifecycleFinding({
        symbol: access.symbol,
        symbolKind: "property",
        source: access.source,
        ruleId: rule.id,
        lifecycle: rule.lifecycle,
        moduleVersion: module.version,
        moduleTrack: module.track,
      });
      if (!finding) continue;

      seen.add(key);
      findings.push(finding);
    }
  }

  return findings;
}

export function scriptEnumLifecycleDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];
  const seen = new Set<string>();

  for (const script of scripts) {
    for (const access of script.moduleMemberAccesses) {
      if (access.module !== "@minecraft/server") continue;
      const rule = findScriptEnumMemberRule(access.symbol);
      if (!rule?.lifecycle) continue;

      const key = `${script.source.relativePath}\0enum\0${access.symbol}`;
      if (seen.has(key)) continue;

      const finding = lifecycleFinding({
        symbol: access.symbol,
        symbolKind: "enum",
        source: access.source,
        ruleId: rule.id,
        lifecycle: rule.lifecycle,
        moduleVersion: module.version,
        moduleTrack: module.track,
      });
      if (!finding) continue;

      seen.add(key);
      findings.push(finding);
    }
  }

  return findings;
}
