import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import { commandRuntimeEvidence } from "../../commands/src/runtime-evidence.js";
import type { ParsedFunction } from "./types.js";

export function functionRuntimeEvidence(
  fn: ParsedFunction,
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [{
    predicate: "mcfunction",
    state: "present",
    confidence: "observed",
    sourceRefs: [fn.source],
    note: fn.identifier,
  }];

  for (const command of fn.commands) {
    records.push(...commandRuntimeEvidence(command.analysis));
  }

  return records;
}