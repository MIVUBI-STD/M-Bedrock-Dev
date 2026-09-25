import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { CommandEffect } from "./effects.js";

export interface ObjectiveAccess {
  objective: string;
  access: "read" | "write";
  target?: string;
  source?: SourceRef;
}

export interface TagAccess {
  tag: string;
  access: "read" | "write";
  target?: string;
  source?: SourceRef;
}

export function scoreboardAccesses(effects: readonly CommandEffect[]): ObjectiveAccess[] {
  const output: ObjectiveAccess[] = [];

  for (const effect of effects) {
    if (effect.kind === "scoreboard-access") {
      if (effect.access === "read" || effect.access === "read-write") {
        output.push({ objective: effect.objective, access: "read", target: effect.target, source: effect.source });
      }
      if (effect.access === "write" || effect.access === "read-write") {
        output.push({ objective: effect.objective, access: "write", target: effect.target, source: effect.source });
      }
      if (effect.operation === "operation" && effect.otherObjective) {
        output.push({
          objective: effect.otherObjective,
          access: "read",
          ...(effect.otherTarget ? { target: effect.otherTarget } : {}),
          source: effect.source,
        });
      }
    }

    if (effect.kind === "selector-read") {
      for (const score of effect.selector.scores) {
        output.push({ objective: score.objective, access: "read", target: effect.selector.raw, source: effect.source });
      }
    }
  }

  return output;
}

export function tagAccesses(effects: readonly CommandEffect[]): TagAccess[] {
  const output: TagAccess[] = [];

  for (const effect of effects) {
    if (effect.kind === "tag-mutation") {
      output.push({ tag: effect.tag, access: "write", target: effect.target, source: effect.source });
    }

    if (effect.kind === "selector-read") {
      for (const tag of effect.selector.tags) {
        output.push({ tag: tag.tag, access: "read", target: effect.selector.raw, source: effect.source });
      }
    }
  }

  return output;
}
