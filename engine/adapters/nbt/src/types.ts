import type { NBT, NBTFormat } from "prismarine-nbt";

export type BedrockNbtFormat = Extract<NBTFormat, "little" | "littleVarint">;

export interface ParsedNbtDocument {
  format: BedrockNbtFormat;
  typed: NBT;
  simplified: unknown;
  originalBytes: Uint8Array;
  dirty: boolean;
}

export interface NbtWriteResult {
  bytes: Uint8Array;
  reusedOriginalBytes: boolean;
}
