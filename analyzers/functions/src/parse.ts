import type { ParsedFunction, FunctionReference } from "./types.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

function lineSource(source: SourceRef, line: number): SourceRef {
  return { ...source, range: { lineStart: line, lineEnd: line } };
}

function parseReference(command: string, source: SourceRef): FunctionReference[] {
  const trimmed = command.trim();
  const refs: FunctionReference[] = [];

  const functionMatch = /^function\s+([^\s#]+)/i.exec(trimmed);
  if (functionMatch?.[1]) {
    refs.push({ kind: "function", target: functionMatch[1], source });
  }

  const structureMatch = /^structure\s+load\s+([^\s#]+)/i.exec(trimmed);
  if (structureMatch?.[1]) {
    refs.push({ kind: "structure", target: structureMatch[1], source });
  }

  const scoreboardMatch = /^scoreboard\s+players\s+(set|add|remove|operation|random|reset|test)\s+\S+\s+([^\s#]+)/i.exec(trimmed);
  if (scoreboardMatch?.[2]) {
    const operation = scoreboardMatch[1]?.toLowerCase();
    refs.push({
      kind: operation === "test" ? "scoreboard-read" : "scoreboard-write",
      objective: scoreboardMatch[2],
      source,
    });
  }

  const selectorScoreMatches = trimmed.matchAll(/scores=\{([^}]*)\}/gi);
  for (const match of selectorScoreMatches) {
    const body = match[1] ?? "";
    for (const entry of body.split(",")) {
      const [objective] = entry.split("=");
      if (objective?.trim()) {
        refs.push({ kind: "scoreboard-read", objective: objective.trim(), source });
      }
    }
  }

  const tagMatch = /^tag\s+\S+\s+(add|remove)\s+([^\s#]+)/i.exec(trimmed);
  if (tagMatch?.[1] && tagMatch[2]) {
    refs.push({
      kind: tagMatch[1].toLowerCase() === "add" ? "tag-add" : "tag-remove",
      tag: tagMatch[2],
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
  const commands: string[] = [];
  const references: FunctionReference[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    commands.push(trimmed);
    references.push(...parseReference(trimmed, lineSource(source, index + 1)));
  });

  return { identifier, source, commands, references };
}
