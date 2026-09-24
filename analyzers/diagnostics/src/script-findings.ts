import type { ManifestModel } from "../../manifest/src/index.js";
import type { ParsedScriptFile } from "../../scripts/src/types.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

export function undeclaredMinecraftModuleDiagnostics(
  manifest: ManifestModel,
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const declared = new Set(
    manifest.dependencies
      .map((dependency) => dependency.moduleName)
      .filter((value): value is string => typeof value === "string"),
  );

  const findings: DiagnosticFinding[] = [];
  const seen = new Set<string>();

  for (const script of scripts) {
    for (const imported of script.imports) {
      if (imported.kind !== "minecraft") continue;
      if (declared.has(imported.module)) continue;

      const key = `${script.source.relativePath}\0${imported.module}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push(createDiagnostic({
        code: "SCRIPT_MODULE_UNDECLARED",
        severity: "medium",
        message: `Script imports ${imported.module}, but the owning pack manifest does not declare that module dependency.`,
        source: imported.source,
        data: {
          module: imported.module,
          manifestPath: manifest.source.relativePath,
        },
      }));
    }
  }

  return findings;
}
