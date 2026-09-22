import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { BlockRegion, Coordinate3 } from "./coordinates.js";

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
      kind: "scoreboard-write";
      operation: string;
      target: string;
      objective: string;
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
