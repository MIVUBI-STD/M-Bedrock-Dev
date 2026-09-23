import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export interface EmbeddedStructureCommandDiagnosticInput {
  flatIndex: number;
  command: string;
  auto?: boolean;
  tickDelay?: number;
  unknownEffects: number;
}

export function embeddedStructureCommandDiagnostics(
  commands: readonly EmbeddedStructureCommandDiagnosticInput[],
  source: SourceRef,
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const command of commands) {
    if (command.unknownEffects > 0) {
      findings.push(createDiagnostic({
        code: "STRUCTURE_EMBEDDED_COMMAND_EFFECT_UNKNOWN",
        severity: "info",
        message: "Embedded command block command is preserved but not fully modeled by typed command effects.",
        source,
        data: {
          flatIndex: command.flatIndex,
          command: command.command,
          auto: command.auto ?? null,
          tickDelay: command.tickDelay ?? null,
        },
      }));
    }
  }

  return findings;
}
