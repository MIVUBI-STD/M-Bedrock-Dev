import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export type FunctionReference =
  | {
      kind: "function";
      target: string;
      source: SourceRef;
    }
  | {
      kind: "structure";
      target: string;
      source: SourceRef;
    }
  | {
      kind: "scoreboard-read" | "scoreboard-write";
      objective: string;
      source: SourceRef;
    }
  | {
      kind: "tag-add" | "tag-remove";
      tag: string;
      source: SourceRef;
    };

export interface ParsedFunction {
  identifier: string;
  source: SourceRef;
  commands: string[];
  references: FunctionReference[];
}
