import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { CommandAnalysis } from "../../commands/src/index.js";

export type FunctionReference =
  | { kind: "function"; target: string; source: SourceRef }
  | { kind: "structure"; target: string; source: SourceRef }
  | { kind: "scoreboard-read" | "scoreboard-write"; objective: string; source: SourceRef }
  | { kind: "tag-read" | "tag-write"; tag: string; source: SourceRef };

export interface ParsedFunctionCommand {
  raw: string;
  source: SourceRef;
  analysis: CommandAnalysis;
}

export interface ParsedFunction {
  identifier: string;
  source: SourceRef;
  commands: ParsedFunctionCommand[];
  references: FunctionReference[];
}
