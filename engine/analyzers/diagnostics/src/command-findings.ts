import type { CommandEffect } from "../../commands/src/index.js";
import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";

function hasRelativeOrLocalCoordinate(effect: CommandEffect): boolean {
  const values: Array<{ mode: string }> = [];

  if (effect.kind === "fill") {
    values.push(
      effect.region.from.x, effect.region.from.y, effect.region.from.z,
      effect.region.to.x, effect.region.to.y, effect.region.to.z,
    );
  } else if (effect.kind === "setblock") {
    values.push(effect.position.x, effect.position.y, effect.position.z);
  } else if (effect.kind === "clone") {
    values.push(
      effect.sourceRegion.from.x, effect.sourceRegion.from.y, effect.sourceRegion.from.z,
      effect.sourceRegion.to.x, effect.sourceRegion.to.y, effect.sourceRegion.to.z,
      effect.destination.x, effect.destination.y, effect.destination.z,
    );
  } else if (effect.kind === "teleport") {
    values.push(effect.destination.x, effect.destination.y, effect.destination.z);
  }

  return values.some((value) => value.mode !== "absolute");
}

export function commandEffectDiagnostics(
  effects: readonly CommandEffect[],
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const effect of effects) {
    if (effect.kind === "unknown") {
      findings.push(createDiagnostic({
        code: "UNKNOWN_COMMAND_EFFECT",
        severity: "info",
        message: "Command is preserved but has no typed effect model yet.",
        source: effect.source,
        data: { command: effect.command },
      }));
      continue;
    }

    if (
      (effect.kind === "fill" || effect.kind === "clone") &&
      hasRelativeOrLocalCoordinate(effect)
    ) {
      findings.push(createDiagnostic({
        code: "SUSPICIOUS_REGION_MUTATION",
        severity: "minor",
        message: `${effect.kind} uses relative/local coordinates; world-space impact requires execution context.`,
        source: effect.source,
        data: { effectKind: effect.kind },
      }));
    }
  }

  return findings;
}
