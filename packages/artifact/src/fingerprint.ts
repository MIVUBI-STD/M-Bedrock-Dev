import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export async function sha256File(path: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export function artifactIdFromFingerprint(fingerprint: string): string {
  if (!/^[a-f0-9]{64}$/i.test(fingerprint)) {
    throw new Error("Artifact fingerprint must be a SHA-256 hex digest.");
  }

  return `art_${fingerprint.slice(0, 16).toLowerCase()}`;
}
