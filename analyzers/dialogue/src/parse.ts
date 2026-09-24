import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import { analyzeCommand } from "../../commands/src/index.js";
import type {
  DialogueCommandTrigger,
  DialogueSceneCommand,
  ParsedDialogueDocument,
  ParsedDialogueScene,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizedCommand(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

function parseCommands(
  values: unknown,
  trigger: DialogueCommandTrigger,
  source: SourceRef,
  buttonIndex?: number,
): DialogueSceneCommand[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const command = normalizedCommand(value);
    if (!command) return [];
    return [{
      raw: command,
      trigger,
      ...(buttonIndex !== undefined ? { buttonIndex } : {}),
      analysis: analyzeCommand(command, source),
    }];
  });
}

function parseScene(
  value: unknown,
  source: SourceRef,
): ParsedDialogueScene | undefined {
  const record = asRecord(value);
  if (!record || typeof record.scene_tag !== "string" || !record.scene_tag.trim()) {
    return undefined;
  }

  const commands: DialogueSceneCommand[] = [
    ...parseCommands(record.on_open_commands, "open", source),
    ...parseCommands(record.on_close_commands, "close", source),
  ];

  if (Array.isArray(record.buttons)) {
    record.buttons.forEach((buttonValue, buttonIndex) => {
      const button = asRecord(buttonValue);
      if (!button) return;
      commands.push(...parseCommands(
        button.commands,
        "button",
        source,
        buttonIndex,
      ));
    });
  }

  return {
    sceneTag: record.scene_tag.trim(),
    commands,
  };
}

export function parseDialogueDocument(
  raw: unknown,
  source: SourceRef,
): ParsedDialogueDocument | undefined {
  const root = asRecord(raw);
  const dialogue = asRecord(root?.["minecraft:npc_dialogue"]);
  if (!root || !dialogue || !Array.isArray(dialogue.scenes)) return undefined;

  const scenes = dialogue.scenes
    .map((value) => parseScene(value, source))
    .filter((scene): scene is ParsedDialogueScene => scene !== undefined);

  const counts = new Map<string, number>();
  for (const scene of scenes) {
    counts.set(scene.sceneTag, (counts.get(scene.sceneTag) ?? 0) + 1);
  }

  const duplicateSceneTags = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sceneTag]) => sceneTag)
    .sort();

  const formatVersion =
    typeof root.format_version === "string" ||
    typeof root.format_version === "number"
      ? String(root.format_version)
      : undefined;

  return {
    source,
    ...(formatVersion ? { formatVersion } : {}),
    scenes,
    duplicateSceneTags,
  };
}
