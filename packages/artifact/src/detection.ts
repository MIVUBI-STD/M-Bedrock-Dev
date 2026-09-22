import { extname } from "node:path";
import type { ArtifactKind } from "./kinds.js";

const EXTENSION_HINTS: Readonly<Record<string, ArtifactKind>> = {
  ".mcworld": "world",
  ".mcpack": "unknown_archive",
  ".mcaddon": "addon",
  ".mcstructure": "structure",
};

export function declaredArtifactKind(sourceName: string): ArtifactKind | undefined {
  return EXTENSION_HINTS[extname(sourceName).toLowerCase()];
}

export function looksLikeZipSignature(header: Uint8Array): boolean {
  if (header.length < 4) return false;

  const a = header[0];
  const b = header[1];
  const c = header[2];
  const d = header[3];

  return (
    a === 0x50 &&
    b === 0x4b &&
    ((c === 0x03 && d === 0x04) ||
      (c === 0x05 && d === 0x06) ||
      (c === 0x07 && d === 0x08))
  );
}
