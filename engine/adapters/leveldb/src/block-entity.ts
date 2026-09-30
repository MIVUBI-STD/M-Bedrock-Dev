import { parse, simplify } from "prismarine-nbt";

export interface DecodedBedrockBlockEntity {
  value: unknown;
  position?: { x: number; y: number; z: number };
  identifier?: string;
}

export interface DecodedBedrockBlockEntityRecord {
  entities: readonly DecodedBedrockBlockEntity[];
  bytesConsumed: number;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export async function decodeBedrockBlockEntityRecord(
  bytes: Uint8Array,
  options: { maxEntities?: number } = {},
): Promise<DecodedBedrockBlockEntityRecord> {
  const maxEntities = options.maxEntities ?? 4096;
  const entities: DecodedBedrockBlockEntity[] = [];
  let offset = 0;

  while (offset < bytes.byteLength) {
    if (entities.length >= maxEntities) {
      throw new Error(
        "Block entity record exceeded the bounded entity budget.",
      );
    }

    const buffer = Buffer.from(
      bytes.buffer,
      bytes.byteOffset + offset,
      bytes.byteLength - offset,
    );
    const parsed = await parse(buffer, "little");
    if (parsed.type !== "little" || parsed.metadata.size <= 0) {
      throw new Error("Invalid Bedrock block entity NBT payload.");
    }

    const value = simplify(parsed.parsed);
    const root = record(value);
    const x = root?.x;
    const y = root?.y;
    const z = root?.z;
    const position =
      typeof x === "number" &&
      typeof y === "number" &&
      typeof z === "number"
        ? { x, y, z }
        : undefined;
    const identifier =
      typeof root?.id === "string"
        ? root.id
        : undefined;

    entities.push({
      value,
      ...(position === undefined ? {} : { position }),
      ...(identifier === undefined ? {} : { identifier }),
    });

    offset += parsed.metadata.size;
  }

  return {
    entities,
    bytesConsumed: offset,
  };
}
