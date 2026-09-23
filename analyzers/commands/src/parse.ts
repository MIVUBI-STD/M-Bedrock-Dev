import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import { parseCoordinate3 } from "./coordinates.js";
import type { CommandAnalysis, CommandEffect, ScoreboardAccessMode } from "./effects.js";
import { parseSelector } from "./selectors.js";
import { tokenizeCommand } from "./tokenize.js";

function selectorEffects(tokens: readonly string[], source: SourceRef): CommandEffect[] {
  const effects: CommandEffect[] = [];
  for (const token of tokens) {
    const selector = parseSelector(token);
    if (selector) effects.push({ kind: "selector-read", selector, source });
  }
  return effects;
}

function parseExecuteNested(command: string, source: SourceRef): CommandEffect | undefined {
  const tokens = tokenizeCommand(command);
  const runIndex = tokens.findIndex((token) => token.toLowerCase() === "run");
  if (runIndex < 0 || runIndex === tokens.length - 1) return undefined;

  const nestedCommand = tokens.slice(runIndex + 1).join(" ");
  return {
    kind: "nested-command",
    wrapper: "execute",
    source,
    nested: analyzeCommand(nestedCommand, source),
  };
}

function scoreboardAccessForOperation(operation: string): ScoreboardAccessMode {
  if (operation === "test" || operation === "get") return "read";
  if (operation === "operation") return "read-write";
  return "write";
}

export function analyzeCommand(command: string, source: SourceRef): CommandAnalysis {
  const trimmed = command.trimStart();
  const normalizedCommand = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const tokens = tokenizeCommand(normalizedCommand);
  const effects: CommandEffect[] = [];
  if (tokens.length === 0) return { command, effects };

  effects.push(...selectorEffects(tokens, source));
  const verb = tokens[0]!.toLowerCase();

  if (verb === "execute") {
    const nested = parseExecuteNested(command, source);
    effects.push(nested ?? { kind: "unknown", command, source });
    return { command, effects };
  }

  if (verb === "dialogue") {
    const operation = tokens[1]?.toLowerCase();
    if (operation === "open" && tokens[2] && tokens[3]) {
      effects.push({
        kind: "dialogue",
        operation: "open",
        npcTarget: tokens[2],
        playerTarget: tokens[3],
        ...(tokens[4] ? { sceneName: tokens[4] } : {}),
        source,
      });
      return { command, effects };
    }

    if (operation === "change" && tokens[2] && tokens[3]) {
      effects.push({
        kind: "dialogue",
        operation: "change",
        npcTarget: tokens[2],
        sceneName: tokens[3],
        ...(tokens[4] ? { playerTarget: tokens[4] } : {}),
        source,
      });
      return { command, effects };
    }
  }

  if (verb === "summon" && tokens[1]) {
    const position = parseCoordinate3(tokens, 2);
    const spawnEvent = tokens[7];

    effects.push({
      kind: "entity-spawn",
      entityIdentifier: tokens[1],
      ...(position ? { position } : {}),
      ...(spawnEvent ? { spawnEvent } : {}),
      source,
    });

    if (spawnEvent) {
      effects.push({
        kind: "entity-event-trigger",
        mechanism: "summon",
        entityIdentifier: tokens[1],
        event: spawnEvent,
        source,
      });
    }
    return { command, effects };
  }

  if (
    verb === "event" &&
    tokens[1]?.toLowerCase() === "entity" &&
    tokens[2] &&
    tokens[3]
  ) {
    effects.push({
      kind: "entity-event-trigger",
      mechanism: "event-command",
      target: tokens[2],
      event: tokens[3],
      source,
    });
    return { command, effects };
  }

  if (verb === "function" && tokens[1]) {
    effects.push({ kind: "function-call", target: tokens[1], source });
    return { command, effects };
  }

  if (verb === "structure" && tokens[1]?.toLowerCase() === "load" && tokens[2]) {
    const position = parseCoordinate3(tokens, 3);
    effects.push({
      kind: "structure-load",
      target: tokens[2],
      ...(position ? { position } : {}),
      source,
    });
    return { command, effects };
  }

  if (verb === "fill") {
    const from = parseCoordinate3(tokens, 1);
    const to = parseCoordinate3(tokens, 4);
    const block = tokens[7];
    if (from && to && block) {
      const mode = tokens[8];
      effects.push({
        kind: "fill",
        region: { from, to },
        block,
        ...(mode ? { mode } : {}),
        source,
      });
      return { command, effects };
    }
  }

  if (verb === "setblock") {
    const position = parseCoordinate3(tokens, 1);
    const block = tokens[4];
    if (position && block) {
      const mode = tokens[5];
      effects.push({
        kind: "setblock",
        position,
        block,
        ...(mode ? { mode } : {}),
        source,
      });
      return { command, effects };
    }
  }

  if (verb === "clone") {
    const from = parseCoordinate3(tokens, 1);
    const to = parseCoordinate3(tokens, 4);
    const destination = parseCoordinate3(tokens, 7);
    if (from && to && destination) {
      const mode = tokens[10];
      effects.push({
        kind: "clone",
        sourceRegion: { from, to },
        destination,
        ...(mode ? { mode } : {}),
        source,
      });
      return { command, effects };
    }
  }

  if (verb === "tp" || verb === "teleport") {
    if (tokens.length >= 5) {
      const destination = parseCoordinate3(tokens, 2);
      if (destination) {
        effects.push({
          kind: "teleport",
          target: tokens[1]!,
          destination,
          source,
        });
        return { command, effects };
      }
    }

    const destination = parseCoordinate3(tokens, 1);
    if (destination) {
      effects.push({
        kind: "teleport",
        target: "@s",
        destination,
        source,
      });
      return { command, effects };
    }
  }

  if (verb === "scoreboard" && tokens[1]?.toLowerCase() === "players") {
    const operation = tokens[2]?.toLowerCase();
    const target = tokens[3];
    const objective = tokens[4];

    if (operation && target && objective) {
      if (operation === "operation") {
        const otherTarget = tokens[6];
        const otherObjective = tokens[7];
        effects.push({
          kind: "scoreboard-access",
          operation,
          target,
          objective,
          access: "read-write",
          ...(otherTarget ? { otherTarget } : {}),
          ...(otherObjective ? { otherObjective } : {}),
          source,
        });
      } else {
        effects.push({
          kind: "scoreboard-access",
          operation,
          target,
          objective,
          access: scoreboardAccessForOperation(operation),
          source,
        });
      }
      return { command, effects };
    }
  }

  if (verb === "tag") {
    const target = tokens[1];
    const operation = tokens[2]?.toLowerCase();
    const tag = tokens[3];
    if (target && (operation === "add" || operation === "remove") && tag) {
      effects.push({
        kind: "tag-mutation",
        operation,
        target,
        tag,
        source,
      });
      return { command, effects };
    }
  }

  effects.push({ kind: "unknown", command, source });
  return { command, effects };
}
