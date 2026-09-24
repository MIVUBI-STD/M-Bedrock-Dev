import type { EffectiveKnowledgeProfile, KnowledgeCatalog } from "../../../packages/knowledge/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { RuntimeEvidenceSnapshot } from "../../../packages/project-model/src/runtime-evidence.js";
import { functionRuntimeEvidence } from "../../functions/src/index.js";
import type { ParsedFunction } from "../../functions/src/index.js";
import { knowledgeRuntimeDiagnostics } from "./knowledge-runtime-findings.js";

export interface FunctionKnowledgeDiagnosticInput {
  catalog: KnowledgeCatalog;
  profile: EffectiveKnowledgeProfile;
  fn: ParsedFunction;
}

export function functionKnowledgeRuntimeDiagnostics(
  input: FunctionKnowledgeDiagnosticInput,
): DiagnosticFinding[] {
  const snapshot: RuntimeEvidenceSnapshot = {
    schemaVersion: 1,
    records: functionRuntimeEvidence(input.fn),
  };

  return knowledgeRuntimeDiagnostics({
    catalog: input.catalog,
    profile: input.profile,
    snapshot,
  });
}