export interface ParsedSourceMapV3 {
  version: 3;
  file?: string;
  sourceRoot?: string;
  sources: readonly string[];
  names: readonly string[];
  mappings: string;
  sourcesContent?: readonly (string | null)[];
}

export interface SourceMapBinding {
  generatedLine: number;
  generatedColumn: number;
  source?: string;
  originalLine?: number;
  originalColumn?: number;
  name?: string;
  status: "resolved" | "unmapped" | "invalid";
  reason?: string;
}

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeVlq(segment: string): number[] {
  const values: number[] = [];
  let value = 0;
  let shift = 0;

  for (const char of segment) {
    const digit = BASE64.indexOf(char);
    if (digit < 0) {
      throw new Error("Invalid base64 VLQ character: " + char);
    }

    const continuation = (digit & 32) !== 0;
    const payload = digit & 31;
    value += payload << shift;

    if (continuation) {
      shift += 5;
      continue;
    }

    const negative = (value & 1) === 1;
    const decoded = value >> 1;
    values.push(negative ? -decoded : decoded);
    value = 0;
    shift = 0;
  }

  if (shift !== 0) {
    throw new Error("Incomplete base64 VLQ segment.");
  }

  return values;
}

export function parseSourceMapV3(
  input: string | unknown,
): ParsedSourceMapV3 {
  const raw = typeof input === "string"
    ? JSON.parse(input) as Record<string, unknown>
    : input as Record<string, unknown>;

  if (!raw || typeof raw !== "object" || raw.version !== 3) {
    throw new Error("Source map must be version 3.");
  }
  if (!Array.isArray(raw.sources) || !raw.sources.every((x) => typeof x === "string")) {
    throw new Error("Source map sources must be a string array.");
  }
  if (!Array.isArray(raw.names) || !raw.names.every((x) => typeof x === "string")) {
    throw new Error("Source map names must be a string array.");
  }
  if (typeof raw.mappings !== "string") {
    throw new Error("Source map mappings must be a string.");
  }

  return {
    version: 3,
    ...(typeof raw.file === "string" ? { file: raw.file } : {}),
    ...(typeof raw.sourceRoot === "string" ? { sourceRoot: raw.sourceRoot } : {}),
    sources: raw.sources as string[],
    names: raw.names as string[],
    mappings: raw.mappings,
    ...(Array.isArray(raw.sourcesContent)
      ? {
          sourcesContent: raw.sourcesContent.map((x) =>
            typeof x === "string" ? x : null
          ),
        }
      : {}),
  };
}

export function bindGeneratedPosition(
  map: ParsedSourceMapV3,
  generatedLine: number,
  generatedColumn: number,
): SourceMapBinding {
  if (!Number.isInteger(generatedLine) || generatedLine < 1 ||
      !Number.isInteger(generatedColumn) || generatedColumn < 0) {
    return {
      generatedLine,
      generatedColumn,
      status: "invalid",
      reason: "Generated position must use 1-based line and 0-based non-negative column.",
    };
  }

  const lines = map.mappings.split(";");
  const line = lines[generatedLine - 1];
  if (line === undefined) {
    return {
      generatedLine,
      generatedColumn,
      status: "unmapped",
      reason: "Generated line has no mapping entry.",
    };
  }

  let generated = 0;
  let sourceIndex = 0;
  let originalLine = 0;
  let originalColumn = 0;
  let nameIndex = 0;
  let best:
    | {
        generated: number;
        sourceIndex: number;
        originalLine: number;
        originalColumn: number;
        nameIndex?: number;
      }
    | undefined;

  for (const rawSegment of line.split(",")) {
    if (!rawSegment) continue;
    let fields: number[];
    try {
      fields = decodeVlq(rawSegment);
    } catch (error) {
      return {
        generatedLine,
        generatedColumn,
        status: "invalid",
        reason: error instanceof Error ? error.message : "Invalid VLQ segment.",
      };
    }

    generated += fields[0] ?? 0;

    if (fields.length >= 4) {
      sourceIndex += fields[1]!;
      originalLine += fields[2]!;
      originalColumn += fields[3]!;
      if (fields.length >= 5) {
        nameIndex += fields[4]!;
      }

      if (generated <= generatedColumn) {
        best = {
          generated,
          sourceIndex,
          originalLine,
          originalColumn,
          ...(fields.length >= 5 ? { nameIndex } : {}),
        };
      }
    }

    if (generated > generatedColumn) break;
  }

  if (!best || best.sourceIndex < 0 || best.sourceIndex >= map.sources.length) {
    return {
      generatedLine,
      generatedColumn,
      status: "unmapped",
      reason: "No source-mapped segment covers the generated position.",
    };
  }

  const source = map.sources[best.sourceIndex]!;
  const rootedSource = map.sourceRoot
    ? map.sourceRoot.replace(/\/$/, "") + "/" + source.replace(/^\//, "")
    : source;

  return {
    generatedLine,
    generatedColumn,
    source: rootedSource,
    originalLine: best.originalLine + 1,
    originalColumn: best.originalColumn,
    ...(best.nameIndex !== undefined &&
        best.nameIndex >= 0 &&
        best.nameIndex < map.names.length
      ? { name: map.names[best.nameIndex] }
      : {}),
    status: "resolved",
  };
}
