import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { findScriptTypeRule } from "../../../packages/compatibility/src/index.js";
import { evaluateScriptSymbolLifecycle } from "../../../packages/compatibility/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

export function scriptImportedTypeLifecycleDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];
  const seen = new Set<string>();

  for (const script of scripts) {
    for (const imported of script.importedSymbols) {
      if (imported.module !== "@minecraft/server") continue;
      const rule = findScriptTypeRule(imported.importedName);
      if (!rule) continue;

      const lifecycle = evaluateScriptSymbolLifecycle(
        rule.lifecycle,
        module.version,
        module.track,
      );
      if (lifecycle.state !== "deprecated" && lifecycle.state !== "removed") {
        continue;
      }

      const key = `${script.source.relativePath}\0${rule.symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const removed = lifecycle.state === "removed";
      findings.push(createDiagnostic({
        code: removed
          ? "SCRIPT_API_REMOVED_SYMBOL"
          : "SCRIPT_API_DEPRECATED_SYMBOL",
        severity: removed ? "critical" : "minor",
        message: removed
          ? `${rule.symbol} was removed in @minecraft/server ${rule.lifecycle.removedIn}, but the manifest declares ${module.version}.`
          : `${rule.symbol} is deprecated in the documented 1.x API and scheduled for removal in ${rule.lifecycle.removedIn}.`,
        source: imported.source,
        data: {
          symbol: rule.symbol,
          symbolKind: "type",
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          typeOnlyImport: imported.typeOnly,
          lifecycleState: lifecycle.state,
          removedIn: rule.lifecycle.removedIn,
          replacement: rule.lifecycle.replacement ?? null,
          ruleId: rule.id,
        },
      }));
    }
  }

  return findings;
}
