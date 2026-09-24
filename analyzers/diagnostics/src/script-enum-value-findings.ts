import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { checkScriptEnumLiteralComparison } from "../../../packages/compatibility/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

export function scriptEnumValueDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];

  for (const script of scripts) {
    for (const comparison of script.enumValueComparisons) {
      if (comparison.module !== "@minecraft/server") continue;
      const check = checkScriptEnumLiteralComparison(
        comparison.symbol,
        comparison.literal,
        module.version,
        module.track,
      );
      if (check.compatible !== false || !check.rule || !check.expectedValue) continue;

      findings.push(createDiagnostic({
        code: "SCRIPT_API_ENUM_VALUE_INCOMPATIBLE",
        severity: "medium",
        message:
          `${comparison.symbol} is compared with ${JSON.stringify(comparison.literal)}, but @minecraft/server ${module.version} uses backing value ${JSON.stringify(check.expectedValue)}.`,
        source: comparison.source,
        data: {
          symbol: comparison.symbol,
          symbolKind: "enum",
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          transitionIn: check.rule.transitionIn,
          observedLiteral: comparison.literal,
          expectedLiteral: check.expectedValue,
          operator: comparison.operator,
          ruleId: check.rule.id,
        },
      }));
    }
  }

  return findings;
}
