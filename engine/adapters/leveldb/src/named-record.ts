import type { BedrockLevelDbReader } from "./types.js";

export async function readNamedLevelDbRecord(
  reader: BedrockLevelDbReader,
  name: string,
): Promise<Uint8Array | undefined> {
  return reader.get(new Uint8Array(Buffer.from(name, "utf8")));
}
