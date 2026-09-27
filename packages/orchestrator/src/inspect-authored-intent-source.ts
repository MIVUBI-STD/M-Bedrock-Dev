import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  parseScriptFile,
  type ParsedScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import type {
  FileInventoryEntry,
} from "../../project-model/src/index.js";

export interface AuthoredIntentSource {
  parsed: ParsedScriptFile;
}

function isAuthoredIntentSourcePath(
  relativePath: string,
): boolean {
  const normalized =
    "/" + relativePath.replaceAll("\\", "/");
  if (!normalized.includes("/behavior_packs/")) return false;
  if (!normalized.includes("/src/")) return false;
  if (normalized.includes("/node_modules/")) return false;
  if (normalized.endsWith(".d.ts")) return false;

  const extension = extname(normalized).toLowerCase();
  return extension === ".ts" || extension === ".tsx";
}

function authoredIdentifier(
  relativePath: string,
): string {
  const normalized = relativePath.replaceAll("\\", "/");
  const extension = extname(normalized);
  return "authored:" +
    normalized.slice(0, -extension.length);
}

export async function indexAuthoredIntentSources(
  root: string,
  artifactId: string,
  files: readonly FileInventoryEntry[],
): Promise<AuthoredIntentSource[]> {
  const output: AuthoredIntentSource[] = [];

  for (const file of files) {
    if (!isAuthoredIntentSourcePath(file.relativePath)) {
      continue;
    }

    const source = {
      artifactId,
      relativePath: file.relativePath,
    };

    output.push({
      parsed: parseScriptFile(
        authoredIdentifier(file.relativePath),
        await readFile(
          join(root, file.relativePath),
          "utf8",
        ),
        source,
      ),
    });
  }

  return output.sort((a, b) =>
    a.parsed.source.relativePath.localeCompare(
      b.parsed.source.relativePath,
    ),
  );
}
