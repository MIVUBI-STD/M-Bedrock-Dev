import type { ParsedFunction, FunctionReference } from "./types.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import { analyzeCommand } from "../../commands/src/index.js";
import { flattenCommandEffects } from "../../commands/src/index.js";
import { scoreboardAccesses, tagAccesses } from "../../commands/src/index.js";

function lineSource(source: SourceRef, line: number): SourceRef {
  return { ...source, range: { lineStart: line, lineEnd: line } };
}

function referencesFromAnalysis(command: string, source: SourceRef): FunctionReference[] {
  const analysis = analyzeCommand(command, source);
  const effects = flattenCommandEffects(analysis);
  const refs: FunctionReference[] = [];

  for (const effect of effects) {
    if (effect.kind === "function-call") {
      refs.push({ kind: "function", target: effect.target, source: effect.source });
    }
    if (effect.kind === "structure-load") {
      refs.push({ kind: "structure", target: effect.target, source: effect.source });
    }
  }

  for (const access of scoreboardAccesses(effects)) {
    refs.push({
      kind: access.access === "read" ? "scoreboard-read" : "scoreboard-write",
      objective: access.objective,
      source,
    });
  }

  for (const access of tagAccesses(effects)) {
    refs.push({
      kind: access.access === "read" ? "tag-read" : "tag-write",
      tag: access.tag,
      source,
    });
  }

  return refs;
}

export function parseMcFunction(
  identifier: string,
  text: string,
  source: SourceRef,
): ParsedFunction {
  const commands: ParsedFunction["commands"] = [];
  const references: FunctionReference[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const commandSource = lineSource(source, index + 1);
    const analysis = analyzeCommand(trimmed, commandSource);

    commands.push({
      raw: trimmed,
      source: commandSource,
      analysis,
    });

    references.push(...referencesFromAnalysis(trimmed, commandSource));
  });

  return { identifier, source, commands, references };
}
