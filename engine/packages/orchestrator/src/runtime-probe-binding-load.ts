import { readFile } from "node:fs/promises";
import { parseRuntimeProbeBindingSet } from "../../project-model/src/index.js";
import type { RuntimeProbeBindingSet } from "../../project-model/src/index.js";

export async function loadRuntimeProbeBindings(
  path: string,
): Promise<RuntimeProbeBindingSet> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      "Failed to read runtime probe binding file " +
      path +
      ": " +
      (error instanceof Error ? error.message : String(error)),
    );
  }

  return parseRuntimeProbeBindingSet(parsed);
}
