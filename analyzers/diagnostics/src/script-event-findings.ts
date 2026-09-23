import type { ManifestCompatibilityFacts } from "../../manifest/src/compatibility.js";
import type { ParsedScriptFile } from "../../scripts/src/types.js";
import { findScriptEventRule, scriptEventSymbol } from "../../../packages/compatibility/src/script-event-matrix.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

export function scriptEventSymbolDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];
  const seen = new Set<string>();

  for (const script of scripts) {
    for (const event of script.events) {
      const symbol = scriptEventSymbol(
        event.root,
        event.phase,
        event.event,
      );
      const rule = findScriptEventRule(symbol);
      if (!rule || rule.stability !== "pre-release") continue;
      if (module.track === "beta" || module.track === "internal") continue;

      const key = `${script.source.relativePath}\0${symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push(createDiagnostic({
        code: "SCRIPT_API_PRERELEASE_SYMBOL",
        severity: "medium",
        message:
          `${symbol} is documented as pre-release, but the manifest declares stable @minecraft/server ${module.version}.`,
        source: event.source,
        data: {
          symbol,
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          introducedIn: rule.introducedIn ?? null,
          ruleId: rule.id,
        },
      }));
    }
  }

  return findings;
}
