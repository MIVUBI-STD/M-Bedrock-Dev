import { readFile } from "node:fs/promises";
import {
  parseRuntimeProbeTranscript,
} from "../../project-model/src/index.js";
import type {
  RuntimeProbeTranscript,
} from "../../project-model/src/index.js";

export async function loadRuntimeProbeTranscript(
  path: string,
): Promise<RuntimeProbeTranscript> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      "Failed to read runtime probe transcript " +
      path +
      ": " +
      (error instanceof Error ? error.message : String(error)),
    );
  }
  return parseRuntimeProbeTranscript(parsed);
}

export function assertRuntimeProbeTranscriptArtifact(
  transcript: RuntimeProbeTranscript,
  artifactId: string,
): void {
  if (
    transcript.artifactId !== undefined &&
    transcript.artifactId !== artifactId
  ) {
    throw new Error(
      "Runtime probe transcript artifactId " +
      transcript.artifactId +
      " does not match inspected artifact " +
      artifactId +
      ".",
    );
  }
}
