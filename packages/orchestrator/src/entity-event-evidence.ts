import { analyzeCommand } from "../../../analyzers/commands/src/parse.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/types.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { ParsedEntityDefinition } from "../../../analyzers/entities/src/index.js";

export interface EntityEventExternalEvidence {
  event: string;
  kind: "summon-spawn-event" | "event-command" | "script-trigger-event";
  entityIdentifier?: string;
  source: SourceRef;
}

function selectorEntityType(target: string | undefined): string | undefined {
  if (!target?.startsWith("@")) return undefined;
  const match = target.match(/(?:^|[,[])type=([^!,\]]+)/);
  return match?.[1];
}

function fromEffects(
  effects: ReturnType<typeof flattenCommandEffects>,
): EntityEventExternalEvidence[] {
  const output: EntityEventExternalEvidence[] = [];
  for (const effect of effects) {
    if (effect.kind !== "entity-event-trigger") continue;
    const entityIdentifier =
      effect.entityIdentifier ??
      (effect.mechanism === "event-command"
        ? selectorEntityType(effect.target)
        : undefined);
    output.push({
      event: effect.event,
      kind: effect.mechanism === "summon"
        ? "summon-spawn-event"
        : "event-command",
      ...(entityIdentifier ? { entityIdentifier } : {}),
      source: effect.source,
    });
  }
  return output;
}

export function deriveEntityEventExternalEvidence(
  functions: readonly ParsedFunction[],
  scripts: readonly ParsedScriptFile[],
): EntityEventExternalEvidence[] {
  const output: EntityEventExternalEvidence[] = [];

  for (const fn of functions) {
    for (const command of fn.commands) {
      output.push(...fromEffects(flattenCommandEffects(command.analysis)));
    }
  }

  for (const script of scripts) {
    for (const trigger of script.entityEventTriggers) {
      output.push({
        event: trigger.event,
        kind: "script-trigger-event",
        source: trigger.source,
      });
    }

    for (const literal of script.commandLiterals) {
      output.push(...fromEffects(flattenCommandEffects(
        analyzeCommand(literal.command, literal.source),
      )));
    }
  }

  const seen = new Set<string>();
  return output.filter((item) => {
    const key = [
      item.kind,
      item.entityIdentifier ?? "*",
      item.event,
      item.source.relativePath,
      item.source.range?.lineStart ?? 0,
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function externalEventRootsForEntity(
  entity: ParsedEntityDefinition,
  evidence: readonly EntityEventExternalEvidence[],
): string[] {
  const defined = new Set(Object.keys(entity.events));
  return [...new Set(
    evidence
      .filter((item) =>
        defined.has(item.event) &&
        (
          item.entityIdentifier === undefined ||
          item.entityIdentifier === entity.identifier
        )
      )
      .map((item) => item.event),
  )].sort();
}
