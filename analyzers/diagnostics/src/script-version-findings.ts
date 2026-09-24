import type { ManifestCompatibilityFacts } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";
import { checkScriptApiCapability } from "../../../packages/compatibility/src/index.js";

function moduleVersion(
  compatibility: ManifestCompatibilityFacts,
  moduleName: string,
): string | undefined {
  return compatibility.scriptModules.find(
    (item) => item.moduleName === moduleName,
  )?.version;
}

export function scriptVersionDiagnostics(
  compatibility: ManifestCompatibilityFacts,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const serverVersion = moduleVersion(compatibility, "@minecraft/server");
  if (!serverVersion) return findings;

  const usesDynamicProperties = scripts.some(
    (script) => script.dynamicProperties.length > 0,
  );
  if (usesDynamicProperties) {
    const result = checkScriptApiCapability(
      "script.dynamic-properties.world-entity",
      "@minecraft/server",
      serverVersion,
    );
    if (result.supported === false) {
      findings.push(createDiagnostic({
        code: "SCRIPT_API_VERSION_INCOMPATIBLE",
        severity: "medium",
        message:
          `Dynamic-property usage requires @minecraft/server ${result.rule?.minStableVersion} or later, but manifest declares ${serverVersion}.`,
        data: {
          module: "@minecraft/server",
          declaredVersion: serverVersion,
          capability: "script.dynamic-properties.world-entity",
          requiredVersion: result.rule?.minStableVersion ?? null,
        },
      }));
    }
  }

  const usesSystemBeforeEvents = scripts.some(
    (script) => script.events.some(
      (event) => event.root === "system" && event.phase === "beforeEvents",
    ),
  );
  if (usesSystemBeforeEvents) {
    const result = checkScriptApiCapability(
      "script.system-before-events",
      "@minecraft/server",
      serverVersion,
    );
    if (result.supported === false) {
      findings.push(createDiagnostic({
        code: "SCRIPT_API_VERSION_INCOMPATIBLE",
        severity: "medium",
        message:
          `system.beforeEvents usage requires @minecraft/server ${result.rule?.minStableVersion} or later, but manifest declares ${serverVersion}.`,
        data: {
          module: "@minecraft/server",
          declaredVersion: serverVersion,
          capability: "script.system-before-events",
          requiredVersion: result.rule?.minStableVersion ?? null,
        },
      }));
    }
  }

  return findings;
}
