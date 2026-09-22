import { LevelDB } from "@8crafter/leveldb-zlib";
import type { BedrockLevelDbReader, LevelDbEntry } from "./types.js";

export async function openBedrockLevelDbSnapshot(
  workingDbRoot: string,
): Promise<BedrockLevelDbReader> {
  const db = new LevelDB(workingDbRoot, {
    createIfMissing: false,
    errorIfExists: false,
    bufferKeys: true,
  });

  await db.open();

  return {
    async get(key: Uint8Array): Promise<Uint8Array | undefined> {
      const value = await db.get(Buffer.from(key));
      return value == null ? undefined : new Uint8Array(value);
    },

    async *entries(): AsyncIterable<LevelDbEntry> {
      for await (const [key, value] of db.getIterator({
        keys: true,
        values: true,
        keyAsBuffer: true,
        valueAsBuffer: true,
      })) {
        if (!Buffer.isBuffer(key) || !Buffer.isBuffer(value)) continue;
        yield {
          key: new Uint8Array(key),
          value: new Uint8Array(value),
        };
      }
    },

    async close(): Promise<void> {
      await db.close();
    },
  };
}
