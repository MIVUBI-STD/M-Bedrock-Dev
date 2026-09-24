import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";
import type { ParsedDialogueDocument } from "../../dialogue/src/index.js";

export function dialogueDocumentDiagnostics(
  document: ParsedDialogueDocument,
): DiagnosticFinding[] {
  return document.duplicateSceneTags.map((sceneTag) => createDiagnostic({
    code: "DIALOGUE_SCENE_DUPLICATE",
    severity: "medium",
    message: `Duplicate NPC dialogue scene_tag: ${sceneTag}`,
    source: document.source,
    data: { sceneTag },
  }));
}
