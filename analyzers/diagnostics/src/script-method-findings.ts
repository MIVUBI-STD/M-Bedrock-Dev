import type { ManifestCompatibilityFacts } from "../../manifest/src/compatibility.js";
import type { ParsedScriptFile } from "../../scripts/src/types.js";
import { checkScriptMethodSymbol } from "../../../packages/compatibility/src/script-method-matrix.js";
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
      const check = checkScriptMethodSymbol(
        method.symbol,
        module.version,
        module.track,
      );
      if (check.supported !== false || !check.rule) continue;

      const key = `${script.source.relativePath}\0${method.symbol}`;
      if (seen.has(key)) continue;
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
