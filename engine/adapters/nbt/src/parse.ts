import { parse, simplify } from "prismarine-nbt";
import type { BedrockNbtFormat, ParsedNbtDocument } from "./types.js";

export async function parseBedrockNbt(
  bytes: Uint8Array,
  format: BedrockNbtFormat = "little",
): Promise<ParsedNbtDocument> {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = await parse(buffer, format);

  if (result.type !== "little" && result.type !== "littleVarint") {
    throw new Error(`Unexpected NBT format for Bedrock document: ${result.type}`);
  }

  return {
    format: result.type,
    typed: result.parsed,
    simplified: simplify(result.parsed),
    originalBytes: new Uint8Array(bytes),
    dirty: false,
  };
}
