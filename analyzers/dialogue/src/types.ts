import type { CommandAnalysis } from "../../commands/src/effects.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export type DialogueCommandTrigger = "open" | "close" | "button";

export interface DialogueSceneCommand {
  raw: string;
  trigger: DialogueCommandTrigger;
  buttonIndex?: number;
  analysis: CommandAnalysis;
}

export interface ParsedDialogueScene {
  sceneTag: string;
  commands: DialogueSceneCommand[];
}

export interface ParsedDialogueDocument {
  source: SourceRef;
  formatVersion?: string;
  scenes: ParsedDialogueScene[];
  duplicateSceneTags: string[];
}
