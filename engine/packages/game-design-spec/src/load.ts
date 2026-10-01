import { readFile } from "node:fs/promises";
import { assertGameDesignSpec } from "./validate.js";
import type { GameDesignSpec } from "./types.js";

export async function loadGameDesignSpec(path: string): Promise<GameDesignSpec> {
  return assertGameDesignSpec(JSON.parse(await readFile(path, "utf8")) as unknown);
}
