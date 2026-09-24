import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import {
  checkScriptMethodSymbol,
  findScriptMethodRule,
} from "../../../packages/compatibility/src/index.js";
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

export function scriptMethodSymbolDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];
  const seen = new Set<string>();

  for (const script of scripts) {
    for (const method of script.methodCalls) {
      const rule = findScriptMethodRule(method.symbol);
      const key = `${script.source.relativePath}\0${method.symbol}`;

      if (rule?.lifecycle) {
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
              ? `${method.symbol} was removed in @minecraft/server ${rule.lifecycle.removedIn}, but the manifest declares ${module.version}.`
              : `${method.symbol} is deprecated in the documented 1.x API and scheduled for removal in ${rule.lifecycle.removedIn}.`,
            source: method.source,
            data: {
              symbol: method.symbol,
              symbolKind: "method",
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

      const check = checkScriptMethodSymbol(
        method.symbol,
        module.version,
        module.track,
      );
      if (check.supported !== false || !check.rule || seen.has(key)) continue;

      seen.add(key);
      const prerelease = check.rule.stability === "pre-release";
      findings.push(createDiagnostic({
        code: prerelease
          ? "SCRIPT_API_PRERELEASE_SYMBOL"
          : "SCRIPT_API_VERSION_INCOMPATIBLE",
        severity: "medium",
        message: prerelease
          ? `${method.symbol} is documented as pre-release, but the manifest declares stable @minecraft/server ${module.version}.`
          : `${method.symbol} requires @minecraft/server ${check.rule.introducedIn} or later, but the manifest declares ${module.version}.`,
        source: method.source,
        data: {
          symbol: method.symbol,
          symbolKind: "method",
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          requiredVersion: check.rule.introducedIn ?? null,
          stability: check.rule.stability,
          ruleId: check.rule.id,
        },
      }));
    }
  }

  return findings;
}
