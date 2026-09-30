import { parse, simplify } from "prismarine-nbt";

export interface DecodedBedrockActor {
  value: unknown;
  identifier?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

function record(
  value: unknown,
): Record<string, unknown> | undefined {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function numericPosition(
  root: Record<string, unknown>,
): { x: number; y: number; z: number } | undefined {
  const pos = root.Pos;
  if (
    Array.isArray(pos) &&
    pos.length >= 3 &&
    pos.slice(0, 3).every(
      (item) =>
        typeof item === "number" &&
        Number.isFinite(item),
    )
  ) {
    return {
      x: Number(pos[0]),
      y: Number(pos[1]),
      z: Number(pos[2]),
    };
  }

  if (
    typeof root.x === "number" &&
    Number.isFinite(root.x) &&
    typeof root.y === "number" &&
    Number.isFinite(root.y) &&
    typeof root.z === "number" &&
    Number.isFinite(root.z)
  ) {
    return {
      x: root.x,
      y: root.y,
      z: root.z,
    };
  }

  return undefined;
}

export async function decodeBedrockActorRecord(
  bytes: Uint8Array,
): Promise<DecodedBedrockActor> {
  const buffer = Buffer.from(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const parsed = await parse(buffer, "little");
  if (
    parsed.type !== "little" ||
    parsed.metadata.size <= 0
  ) {
    throw new Error(
      "Invalid Bedrock actor NBT payload.",
    );
  }

  const value = simplify(parsed.parsed);
  const root = record(value);
  if (!root) {
    return { value };
  }

  const identifier =
    typeof root.identifier === "string"
      ? root.identifier
      : typeof root.id === "string"
        ? root.id
        : undefined;
  const position = numericPosition(root);

  return {
    value,
    ...(identifier === undefined
      ? {}
      : { identifier }),
    ...(position === undefined
      ? {}
      : { position }),
  };
}
