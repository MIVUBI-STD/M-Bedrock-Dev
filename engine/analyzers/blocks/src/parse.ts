import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { ParsedBlockDefinition } from "./types.js";

export const BLOCK_PARSER_REVISION = "m-bedrock-block-parser:1";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function parseBlockDefinition(
  raw: unknown,
  source: SourceRef,
): ParsedBlockDefinition {
  const root = asRecord(raw) ?? {};
  const block = asRecord(root["minecraft:block"]) ?? {};
  const description = asRecord(block.description) ?? {};
  const components = asRecord(block.components) ?? {};

  return {
    ...(typeof description.identifier === "string"
      ? { identifier: description.identifier }
      : {}),
    ...(typeof root.format_version === "string" || typeof root.format_version === "number"
      ? { formatVersion: String(root.format_version) }
      : {}),
    source,
    components,
  };
}
