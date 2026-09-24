import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/types.js";
import { checkScriptPropertyWrite } from "../../../packages/compatibility/src/script-property-mutability-matrix.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

export function scriptPropertyWriteDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];

  for (const script of scripts) {
    for (const write of script.propertyWrites) {
      const check = checkScriptPropertyWrite(
        write.symbol,
        module.version,
        module.track,
      );
      if (check.compatible !== false || !check.rule) continue;

      findings.push(createDiagnostic({
        code: "SCRIPT_API_PROPERTY_WRITE_INCOMPATIBLE",
        severity: "critical",
        message:
          `${write.symbol} became read-only in @minecraft/server ${check.rule.transitionIn}, but this script performs a ${write.operation} write.`,
        source: write.source,
        data: {
          symbol: write.symbol,
          symbolKind: "property",
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          transitionIn: check.rule.transitionIn,
          observedOperation: write.operation,
          beforeMutability: check.rule.before,
          afterMutability: check.rule.after,
          ruleId: check.rule.id,
        },
      }));
    }
  }

  return findings;
}
