import type { ManifestModel } from "../../manifest/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";

export function duplicateManifestUuidDiagnostics(
  manifests: readonly ManifestModel[],
): DiagnosticFinding[] {
  const grouped = new Map<string, ManifestModel[]>();

  for (const manifest of manifests) {
    if (!manifest.headerUuid) continue;
    const list = grouped.get(manifest.headerUuid) ?? [];
    list.push(manifest);
    grouped.set(manifest.headerUuid, list);
  }

  const findings: DiagnosticFinding[] = [];

  for (const [uuid, duplicates] of grouped) {
    if (duplicates.length < 2) continue;

    for (const manifest of duplicates) {
      findings.push(createDiagnostic({
        code: "DUPLICATE_MANIFEST_UUID",
        severity: "critical",
        message: `Duplicate manifest header UUID: ${uuid}`,
        source: manifest.source,
        data: { uuid, duplicateCount: duplicates.length },
      }));
    }
  }

  return findings;
}
