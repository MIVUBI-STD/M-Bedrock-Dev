import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { findScriptEventRule, scriptEventSymbol } from "../../../packages/compatibility/src/index.js";
import { evaluateScriptSymbolLifecycle } from "../../../packages/compatibility/src/index.js";
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
      if (!rule) continue;

      const key = `${script.source.relativePath}\0${symbol}`;
      if (rule.lifecycle) {
        const lifecycle = evaluateScriptSymbolLifecycle(
          rule.lifecycle,
          module.version,
          module.track,
        );
        if (
          (lifecycle.state === "deprecated" || lifecycle.state === "removed") &&
          !seen.has(key)
        ) {
          seen.add(key);
          const removed = lifecycle.state === "removed";
          findings.push(createDiagnostic({
            code: removed
              ? "SCRIPT_API_REMOVED_SYMBOL"
              : "SCRIPT_API_DEPRECATED_SYMBOL",
            severity: removed ? "critical" : "minor",
            message: removed
              ? `${symbol} was removed in @minecraft/server ${rule.lifecycle.removedIn}, but the manifest declares ${module.version}.`
              : `${symbol} is deprecated in the documented 1.x API and scheduled for removal in ${rule.lifecycle.removedIn}.`,
            source: event.source,
            data: {
              symbol,
              symbolKind: "event",
              module: "@minecraft/server",
              declaredVersion: module.version,
              declaredTrack: module.track,
              lifecycleState: lifecycle.state,
              removedIn: rule.lifecycle.removedIn,
              replacement: rule.lifecycle.replacement ?? null,
              ruleId: rule.id,
            },
          }));
        }
      }

      if (
        rule.stability !== "pre-release" ||
        module.track === "beta" ||
        module.track === "internal" ||
        seen.has(key)
      ) {
        continue;
      }

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
