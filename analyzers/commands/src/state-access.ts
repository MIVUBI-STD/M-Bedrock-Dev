import type { CommandEffect } from "./effects.js";

export interface ObjectiveAccess {
  objective: string;
  access: "read" | "write";
  target?: string;
}

export interface TagAccess {
  tag: string;
  access: "read" | "write";
  target?: string;
}

export function scoreboardAccesses(effects: readonly CommandEffect[]): ObjectiveAccess[] {
  const output: ObjectiveAccess[] = [];

  for (const effect of effects) {
    if (effect.kind === "scoreboard-access") {
      if (effect.access === "read" || effect.access === "read-write") {
        output.push({ objective: effect.objective, access: "read", target: effect.target });
      }
      if (effect.access === "write" || effect.access === "read-write") {
        output.push({ objective: effect.objective, access: "write", target: effect.target });
      }
      if (effect.operation === "operation" && effect.otherObjective) {
        output.push({
          objective: effect.otherObjective,
          access: "read",
          ...(effect.otherTarget ? { target: effect.otherTarget } : {}),
        });
      }
    }

    if (effect.kind === "selector-read") {
      for (const score of effect.selector.scores) {
        output.push({ objective: score.objective, access: "read", target: effect.selector.raw });
      }
    }
  }

  return output;
}

export function tagAccesses(effects: readonly CommandEffect[]): TagAccess[] {
  const output: TagAccess[] = [];

  for (const effect of effects) {
    if (effect.kind === "tag-mutation") {
      output.push({ tag: effect.tag, access: "write", target: effect.target });
    }

    if (effect.kind === "selector-read") {
      for (const tag of effect.selector.tags) {
        output.push({ tag: tag.tag, access: "read", target: effect.selector.raw });
      }
    }
  }

  return output;
}
