import { parseBedrockNbt } from "../../../adapters/nbt/src/index.js";
import {
  readNamedLevelDbRecord,
  type BedrockLevelDbReader,
} from "../../../adapters/leveldb/src/index.js";
import {
  extractDynamicPropertyNamespaces,
  type PersistedDynamicPropertyNamespace,
} from "../../../analyzers/world-db/src/index.js";

export interface PersistedPackIdentityExtraction {
  status: "not-present" | "parsed" | "failed";
  namespaces: readonly PersistedDynamicPropertyNamespace[];
  failure?: string;
}

export async function extractPersistedPackIdentities(
  reader: BedrockLevelDbReader,
): Promise<PersistedPackIdentityExtraction> {
  const bytes = await readNamedLevelDbRecord(
    reader,
    "DynamicProperties",
  );
  if (!bytes) {
    return { status: "not-present", namespaces: [] };
  }

  try {
    const parsed = await parseBedrockNbt(bytes, "little");
    return {
      status: "parsed",
      namespaces: extractDynamicPropertyNamespaces(
        parsed.simplified,
      ),
    };
  } catch (error) {
    return {
      status: "failed",
      namespaces: [],
      failure:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}
