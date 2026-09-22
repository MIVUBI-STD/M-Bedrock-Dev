import { writeUncompressed } from "prismarine-nbt";
import type { NbtWriteResult, ParsedNbtDocument } from "./types.js";

export function writeBedrockNbt(document: ParsedNbtDocument): NbtWriteResult {
  if (!document.dirty) {
    return {
      bytes: new Uint8Array(document.originalBytes),
      reusedOriginalBytes: true,
    };
  }

  const buffer = writeUncompressed(document.typed, document.format);
  return {
    bytes: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    reusedOriginalBytes: false,
  };
}
