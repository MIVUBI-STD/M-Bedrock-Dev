import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { checkScriptReturnContract } from "../../../packages/compatibility/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

export function scriptReturnContractDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];

  for (const script of scripts) {
    for (const call of script.methodCalls) {
      const result = checkScriptReturnContract(
        call,
        module.version,
        module.track,
      );
      if (result.state !== "risk" || !result.rule) continue;

      findings.push(createDiagnostic({
        code: "SCRIPT_API_RETURN_CONTRACT_RISK",
        severity: "medium",
        message:
          `${call.symbol} may return undefined in @minecraft/server ${module.version}, but the result is directly dereferenced without an observed optional chain or non-null assertion.`,
        source: call.source,
        data: {
          symbol: call.symbol,
          symbolKind: "method",
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          transitionIn: result.rule.transitionIn,
          beforeReturnContract: result.rule.before,
          afterReturnContract: result.rule.after,
          observedResultUse: call.resultUse,
          ruleId: result.rule.id,
          summary: result.rule.summary,
        },
      }));
    }
  }

  return findings;
}
