import type { ManifestModel } from "../../../analyzers/manifest/src/types.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/types.js";
import { deriveManifestCompatibilityFacts } from "../../../analyzers/manifest/src/compatibility.js";
import { undeclaredMinecraftModuleDiagnostics } from "../../../analyzers/diagnostics/src/script-findings.js";
import { scriptExecutionPrivilegeDiagnostics } from "../../../analyzers/diagnostics/src/script-privilege-findings.js";
import { scriptVersionDiagnostics } from "../../../analyzers/diagnostics/src/script-version-findings.js";
import { scriptEventSymbolDiagnostics } from "../../../analyzers/diagnostics/src/script-event-findings.js";
import { scriptMethodSymbolDiagnostics } from "../../../analyzers/diagnostics/src/script-method-findings.js";
import {
  scriptEnumLifecycleDiagnostics,
  scriptPropertyLifecycleDiagnostics,
} from "../../../analyzers/diagnostics/src/script-member-findings.js";
import { scriptSignatureDiagnostics } from "../../../analyzers/diagnostics/src/script-signature-findings.js";
import { scriptReturnContractDiagnostics } from "../../../analyzers/diagnostics/src/script-return-contract-findings.js";
import { scriptImportedTypeLifecycleDiagnostics } from "../../../analyzers/diagnostics/src/script-type-findings.js";
import { scriptEnumValueDiagnostics } from "../../../analyzers/diagnostics/src/script-enum-value-findings.js";
import { scriptPropertyWriteDiagnostics } from "../../../analyzers/diagnostics/src/script-property-write-findings.js";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { SemanticNode } from "../../graph/src/types.js";

function isWithinPack(
  relativePath: string,
  packRoot: string,
): boolean {
  return relativePath === packRoot ||
    relativePath.startsWith(
      packRoot.replace(/\/$/, "") + "/",
    );
}

export function analyzeInspectionScriptCompatibility(
  manifests: readonly {
    root: string;
    manifest: ManifestModel;
  }[],
  parsedScripts: readonly {
    node: SemanticNode;
    parsed: ParsedScriptFile;
  }[],
): DiagnosticFinding[] {
  const diagnostics: DiagnosticFinding[] = [];

  for (const { root: packRoot, manifest } of manifests) {
    const scripts = parsedScripts
      .filter((item) =>
        isWithinPack(
          item.parsed.source.relativePath,
          packRoot,
        ),
      )
      .map((item) => item.parsed);

    diagnostics.push(
      ...undeclaredMinecraftModuleDiagnostics(
        manifest,
        scripts,
      ),
    );
    diagnostics.push(
      ...scriptExecutionPrivilegeDiagnostics(scripts),
    );

    const compatibility =
      deriveManifestCompatibilityFacts(manifest);

    diagnostics.push(
      ...scriptVersionDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptEventSymbolDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptMethodSymbolDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptPropertyLifecycleDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptEnumLifecycleDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptSignatureDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptReturnContractDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptImportedTypeLifecycleDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptEnumValueDiagnostics(
        compatibility,
        scripts,
      ),
      ...scriptPropertyWriteDiagnostics(
        compatibility,
        scripts,
      ),
    );
  }

  return diagnostics;
}
