import { parseBedrockNbt } from "../../nbt/src/parse.js";
import { normalizeMcStructure } from "./normalize.js";
import type { McStructureModel } from "./types.js";

export async function parseMcStructure(
  bytes: Uint8Array,
  sourceName?: string,
): Promise<McStructureModel> {
  const nbt = await parseBedrockNbt(bytes, "little");
  return normalizeMcStructure(nbt, sourceName);
}
