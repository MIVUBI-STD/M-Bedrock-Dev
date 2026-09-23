import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { BlockRegion, Coordinate3 } from "./coordinates.js";
import type { ParsedSelector } from "./selectors.js";

export type ScoreboardAccessMode = "read" | "write" | "read-write";

export type CommandEffect =
  | {
      kind: "fill";
      region: BlockRegion;
      block: string;
      mode?: string;
      source: SourceRef;
    }
  | {
      kind: "setblock";
      position: Coordinate3;
      block: string;
      mode?: string;
      source: SourceRef;
    }
  | {
      kind: "clone";
      sourceRegion: BlockRegion;
      destination: Coordinate3;
      mode?: string;
      source: SourceRef;
    }
  | {
      kind: "teleport";
      target: string;
      destination: Coordinate3;
      source: SourceRef;
    }
  | {
      kind: "function-call";
      target: string;
      source: SourceRef;
    }
  | {
      kind: "structure-load";
      target: string;
      position?: Coordinate3;
      source: SourceRef;
    }
  | {
      kind: "scoreboard-access";
      operation: string;
      target: string;
      objective: string;
      access: ScoreboardAccessMode;
      otherTarget?: string;
      otherObjective?: string;
      source: SourceRef;
    }
  | {
      kind: "selector-read";
      selector: ParsedSelector;
      source: SourceRef;
    }
  | {
      kind: "dialogue";
      operation: "open" | "change";
      npcTarget: string;
      playerTarget?: string;
      sceneName?: string;
      source: SourceRef;
    }
  | {
      kind: "tag-mutation";
      operation: "add" | "remove";
      target: string;
      tag: string;
      source: SourceRef;
    }
  | {
      kind: "entity-event-trigger";
      mechanism: "summon" | "event-command";
      event: string;
      entityIdentifier?: string;
      target?: string;
      source: SourceRef;
    }
  | {
      kind: "nested-command";
      wrapper: "execute";
      source: SourceRef;
      nested: CommandAnalysis;
    }
  | {
      kind: "unknown";
      command: string;
      source: SourceRef;
    };

export interface CommandAnalysis {
  command: string;
  effects: CommandEffect[];
}
