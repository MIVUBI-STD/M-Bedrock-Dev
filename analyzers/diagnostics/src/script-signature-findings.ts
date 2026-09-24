import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { checkScriptMethodSignature } from "../../../packages/compatibility/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";

function serverModule(
  compatibility: ManifestCompatibilityFacts,
) {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === "@minecraft/server",
  );
}

export function scriptSignatureDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const module = serverModule(compatibility);
  if (!module) return [];

  const findings: DiagnosticFinding[] = [];

  for (const script of scripts) {
    for (const call of script.methodCalls) {
      const result = checkScriptMethodSignature(
        call,
        module.version,
        module.track,
      );
      if (result.compatible !== false || !result.rule || !result.expected) {
        continue;
      }

      findings.push(createDiagnostic({
        code: "SCRIPT_API_SIGNATURE_INCOMPATIBLE",
        severity: result.rule.severity,
        message:
          `${call.symbol} call shape is incompatible with @minecraft/server ${module.version}; expected ${result.expected.minArgs === result.expected.maxArgs ? result.expected.minArgs : `${result.expected.minArgs}-${result.expected.maxArgs}`} arguments for the ${result.expectedPhase}-${result.rule.transitionIn} API shape, but found ${call.argumentCount}.`,
        source: call.source,
        data: {
          symbol: call.symbol,
          symbolKind: "method",
          module: "@minecraft/server",
          declaredVersion: module.version,
          declaredTrack: module.track,
          transitionIn: result.rule.transitionIn,
          expectedPhase: result.expectedPhase,
          expectedMinArgs: result.expected.minArgs,
          expectedMaxArgs: result.expected.maxArgs,
          observedArgumentCount: call.argumentCount,
          observedArgumentKinds: call.argumentKinds,
          hasSpreadArgument: call.hasSpreadArgument,
          ruleId: result.rule.id,
          summary: result.rule.summary,
        },
      }));
    }
  }

  return findings;
}
