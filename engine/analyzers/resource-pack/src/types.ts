import type { SourceRef } from "../../../packages/project-model/src/index.js";

export interface ResourcePackAnimationDefinition {
  id: string;
  formatVersion?: string;
  source: SourceRef;
}

export interface AnimationControllerTransition {
  targetState: string;
  condition: string;
}

export interface AnimationControllerState {
  id: string;
  animations: string[];
  transitions: AnimationControllerTransition[];
  particleEffects: string[];
  soundEffects: string[];
  onEntry: string[];
  onExit: string[];
}

export interface ResourcePackAnimationController {
  id: string;
  formatVersion?: string;
  initialState: string;
  states: AnimationControllerState[];
  molangExpressions: string[];
  source: SourceRef;
}
