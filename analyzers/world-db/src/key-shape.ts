export type WorldDbKeyShape =
  | "ascii-named"
  | "binary"
  | "empty";

export interface WorldDbKeyFact {
  shape: WorldDbKeyShape;
  byteLength: number;
  asciiName?: string;
  keyHex: string;
}

export function analyzeWorldDbKey(key: Uint8Array): WorldDbKeyFact {
  const keyHex = Buffer.from(key).toString("hex");
  if (key.byteLength === 0) {
    return { shape: "empty", byteLength: 0, keyHex };
  }

  let printable = true;
  for (const byte of key) {
    if (byte < 0x20 || byte > 0x7e) {
      printable = false;
      break;
    }
  }

  if (printable) {
    return {
      shape: "ascii-named",
      byteLength: key.byteLength,
      asciiName: Buffer.from(key).toString("utf8"),
      keyHex,
    };
  }

  return {
    shape: "binary",
    byteLength: key.byteLength,
    keyHex,
  };
}
