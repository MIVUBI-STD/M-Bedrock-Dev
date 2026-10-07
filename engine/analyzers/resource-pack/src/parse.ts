import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type {
  AnimationControllerState,
  AnimationControllerTransition,
  ResourcePackAnimationController,
  ResourcePackAnimationDefinition,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function formatVersion(root: Record<string, unknown>): string | undefined {
  return typeof root.format_version === "string" ||
      typeof root.format_version === "number"
    ? String(root.format_version)
    : undefined;
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function animationRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const output = new Set<string>();
  for (const item of value) {
    if (typeof item === "string") output.add(item);
    const record = asRecord(item);
    if (record) {
      for (const [animation, condition] of Object.entries(record)) {
        output.add(animation);
        if (typeof condition === "string") output.add(condition);
      }
    }
  }
  return [...output];
}

function transitions(value: unknown): AnimationControllerTransition[] {
  if (!Array.isArray(value)) return [];
  const output: AnimationControllerTransition[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    for (const [targetState, condition] of Object.entries(record)) {
      if (typeof condition === "string") {
        output.push({ targetState, condition });
      }
    }
  }
  return output;
}

function effects(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    const record = asRecord(item);
    return record
      ? Object.values(record).filter((v): v is string => typeof v === "string")
      : [];
  });
}

function stateFrom(id: string, value: unknown): AnimationControllerState {
  const state = asRecord(value) ?? {};
  const refs = animationRefs(state.animations);
  return {
    id,
    animations: refs.filter((item) => !/[();]|query\.|variable\.|context\.|math\./i.test(item)),
    transitions: transitions(state.transitions),
    particleEffects: effects(state.particle_effects),
    soundEffects: effects(state.sound_effects),
    onEntry: stringList(state.on_entry),
    onExit: stringList(state.on_exit),
  };
}

function collectMolang(states: readonly AnimationControllerState[]): string[] {
  const values = new Set<string>();
  for (const state of states) {
    for (const transition of state.transitions) values.add(transition.condition);
    for (const value of [...state.onEntry, ...state.onExit]) {
      if (/[();]|query\.|variable\.|context\.|math\./i.test(value)) values.add(value);
    }
  }
  return [...values].sort();
}

export function parseResourcePackAnimations(
  raw: unknown,
  source: SourceRef,
): ResourcePackAnimationDefinition[] {
  const root = asRecord(raw) ?? {};
  const animations = asRecord(root.animations) ?? {};
  const version = formatVersion(root);
  return Object.keys(animations).sort().map((id) => ({
    id,
    ...(version ? { formatVersion: version } : {}),
    source,
  }));
}

export function parseAnimationControllers(
  raw: unknown,
  source: SourceRef,
): ResourcePackAnimationController[] {
  const root = asRecord(raw) ?? {};
  const controllers = asRecord(root.animation_controllers) ?? {};
  const version = formatVersion(root);

  return Object.entries(controllers).sort(([a], [b]) => a.localeCompare(b)).map(
    ([id, rawController]) => {
      const controller = asRecord(rawController) ?? {};
      const rawStates = asRecord(controller.states) ?? {};
      const states = Object.entries(rawStates)
        .map(([stateId, value]) => stateFrom(stateId, value))
        .sort((a, b) => a.id.localeCompare(b.id));
      const firstState = Object.keys(rawStates)[0] ?? "default";
      const initialState =
        typeof controller.initial_state === "string"
          ? controller.initial_state
          : firstState;

      return {
        id,
        ...(version ? { formatVersion: version } : {}),
        initialState,
        states,
        molangExpressions: collectMolang(states),
        source,
      };
    },
  );
}
