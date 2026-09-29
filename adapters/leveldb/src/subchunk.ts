import { parse, simplify } from "prismarine-nbt";

export interface DecodedBedrockBlockState {
  name: string;
  states: Readonly<Record<string, unknown>>;
}

export interface DecodedSubChunkLayer {
  blocks: readonly DecodedBedrockBlockState[];
}

export interface DecodedSubChunk {
  version: 8 | 9;
  yIndex?: number;
  layers: readonly DecodedSubChunkLayer[];
}

export class UnsupportedSubChunkFormatError extends Error {}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) {
    throw new Error("Unexpected end of subchunk while reading uint32.");
  }
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4,
  ).getUint32(0, true);
}

function stableObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableObject(item)]),
    );
  }
  return value;
}

function blockFromPalette(value: unknown): DecodedBedrockBlockState {
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  const name =
    typeof object.name === "string"
      ? object.name
      : "minecraft:unknown";
  const states =
    object.states &&
    typeof object.states === "object" &&
    !Array.isArray(object.states)
      ? stableObject(object.states) as Record<string, unknown>
      : {};
  return { name, states };
}

function decodeIndices(
  bytes: Uint8Array,
  offset: number,
  bitsPerBlock: number,
): { indices: number[]; offset: number } {
  const blocksPerWord = Math.floor(32 / bitsPerBlock);
  if (blocksPerWord <= 0) {
    throw new UnsupportedSubChunkFormatError(
      `Unsupported bits-per-block value: ${bitsPerBlock}.`,
    );
  }
  const wordCount = Math.ceil(4096 / blocksPerWord);
  const requiredBytes = wordCount * 4;
  if (offset + requiredBytes > bytes.length) {
    throw new Error("Unexpected end of subchunk block index storage.");
  }

  const mask =
    bitsPerBlock === 32
      ? 0xffffffff
      : (2 ** bitsPerBlock) - 1;
  const indices = new Array<number>(4096);
  let output = 0;

  for (let wordIndex = 0; wordIndex < wordCount; wordIndex += 1) {
    let word = readUint32Le(bytes, offset + wordIndex * 4);
    for (
      let index = 0;
      index < blocksPerWord && output < 4096;
      index += 1
    ) {
      indices[output] = word & mask;
      output += 1;
      word >>>= bitsPerBlock;
    }
  }

  return { indices, offset: offset + requiredBytes };
}

async function parsePaletteEntry(
  bytes: Uint8Array,
  offset: number,
): Promise<{ value: DecodedBedrockBlockState; offset: number }> {
  const buffer = Buffer.from(
    bytes.buffer,
    bytes.byteOffset + offset,
    bytes.byteLength - offset,
  );
  const parsed = await parse(buffer, "little");
  if (parsed.type !== "little" || parsed.metadata.size <= 0) {
    throw new Error("Invalid Bedrock palette NBT payload.");
  }
  return {
    value: blockFromPalette(simplify(parsed.parsed)),
    offset: offset + parsed.metadata.size,
  };
}

export async function decodeBedrockSubChunk(
  bytes: Uint8Array,
): Promise<DecodedSubChunk> {
  if (bytes.length < 2) {
    throw new Error("Subchunk payload is too short.");
  }

  let offset = 0;
  const version = bytes[offset++]!;
  if (version !== 8 && version !== 9) {
    throw new UnsupportedSubChunkFormatError(
      `Only modern Bedrock subchunk versions 8 and 9 are supported; got ${version}.`,
    );
  }

  const layerCount = bytes[offset++]!;
  if (layerCount > 16) {
    throw new Error(`Implausible subchunk layer count: ${layerCount}.`);
  }

  let yIndex: number | undefined;
  if (version === 9) {
    if (offset >= bytes.length) throw new Error("Missing subchunk v9 y-index.");
    yIndex = new DataView(
      bytes.buffer,
      bytes.byteOffset + offset,
      1,
    ).getInt8(0);
    offset += 1;
  }

  const layers: DecodedSubChunkLayer[] = [];

  for (let layer = 0; layer < layerCount; layer += 1) {
    if (offset >= bytes.length) {
      throw new Error("Missing block storage header.");
    }

    const storageHeader = bytes[offset++]!;
    const runtimePalette = (storageHeader & 1) === 1;
    const bitsPerBlock = storageHeader >> 1;

    if (runtimePalette) {
      throw new UnsupportedSubChunkFormatError(
        "Runtime-ID subchunk palettes are not valid deterministic disk proof.",
      );
    }

    if (bitsPerBlock === 0) {
      const entry = await parsePaletteEntry(bytes, offset);
      offset = entry.offset;
      layers.push({
        blocks: new Array<DecodedBedrockBlockState>(4096).fill(entry.value),
      });
      continue;
    }

    if (![1, 2, 3, 4, 5, 6, 8, 16].includes(bitsPerBlock)) {
      throw new UnsupportedSubChunkFormatError(
        `Unsupported bits-per-block value: ${bitsPerBlock}.`,
      );
    }

    const decoded = decodeIndices(bytes, offset, bitsPerBlock);
    offset = decoded.offset;

    const paletteLength = readUint32Le(bytes, offset);
    offset += 4;
    if (paletteLength < 1 || paletteLength > 4096) {
      throw new Error(`Invalid subchunk palette length: ${paletteLength}.`);
    }

    const palette: DecodedBedrockBlockState[] = [];
    for (let index = 0; index < paletteLength; index += 1) {
      const entry = await parsePaletteEntry(bytes, offset);
      palette.push(entry.value);
      offset = entry.offset;
    }

    const blocks = decoded.indices.map((paletteIndex) => {
      const block = palette[paletteIndex];
      if (!block) {
        throw new Error(
          `Subchunk palette index ${paletteIndex} exceeds palette length ${palette.length}.`,
        );
      }
      return block;
    });
    layers.push({ blocks });
  }

  return {
    version,
    ...(yIndex === undefined ? {} : { yIndex }),
    layers,
  };
}

export function subChunkLinearIndex(
  localX: number,
  localY: number,
  localZ: number,
): number {
  if (
    localX < 0 || localX > 15 ||
    localY < 0 || localY > 15 ||
    localZ < 0 || localZ > 15
  ) {
    throw new Error("Subchunk local coordinates must be within 0..15.");
  }
  return (localX << 8) | (localZ << 4) | localY;
}

export function blockAt(
  subChunk: DecodedSubChunk,
  localX: number,
  localY: number,
  localZ: number,
  layer = 0,
): DecodedBedrockBlockState | undefined {
  return subChunk.layers[layer]?.blocks[
    subChunkLinearIndex(localX, localY, localZ)
  ];
}
