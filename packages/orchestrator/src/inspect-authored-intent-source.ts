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

export interface AuthoredIntentSourceIndexOptions {
  readonly authoredSourceRoots?: readonly string[];
}

function normalizePath(value: string): string {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+|\/+$/g, "");
}

function defaultAuthoredSourceRoot(
  relativePath: string,
): string | undefined {
  const normalized = normalizePath(relativePath);
  const segments = normalized.split("/");
  const packRootIndex = segments.findIndex((segment) =>
    segment === "behavior_packs" ||
    segment === "development_behavior_packs"
  );
  if (
    packRootIndex < 0 ||
    segments.length <= packRootIndex + 2
  ) {
    return undefined;
  }

  const sourceSegment =
    segments[packRootIndex + 2];
  if (sourceSegment !== "src") {
    return undefined;
  }

  return segments
    .slice(0, packRootIndex + 3)
    .join("/");
}

function isBedrockRuntimeScriptPath(
  relativePath: string,
): boolean {
  const segments = normalizePath(relativePath).split("/");
  const packRootIndex = segments.findIndex((segment) =>
    segment === "behavior_packs" ||
    segment === "development_behavior_packs"
  );
  return (
    packRootIndex >= 0 &&
    segments[packRootIndex + 2] === "scripts"
  );
}

function isAuthoredIntentSourcePath(
  relativePath: string,
  options: AuthoredIntentSourceIndexOptions,
): boolean {
  const normalized = normalizePath(relativePath);
  const wrapped = "/" + normalized + "/";

  if (
    wrapped.includes("/node_modules/") ||
    wrapped.includes("/dist/") ||
    wrapped.includes("/build/") ||
    isBedrockRuntimeScriptPath(normalized)
  ) {
    return false;
  }

  if (normalized.endsWith(".d.ts")) return false;

  const extension = extname(normalized).toLowerCase();
  if (extension !== ".ts" && extension !== ".tsx") {
    return false;
  }

  const configuredRoots =
    options.authoredSourceRoots?.map(normalizePath) ?? [];
  if (configuredRoots.length > 0) {
    return configuredRoots.some((root) =>
      normalized === root ||
      normalized.startsWith(root + "/")
    );
  }

  return defaultAuthoredSourceRoot(normalized) !== undefined;
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
  options: AuthoredIntentSourceIndexOptions = {},
): Promise<AuthoredIntentSource[]> {
  const output: AuthoredIntentSource[] = [];

  for (const file of files) {
    if (
      !isAuthoredIntentSourcePath(
        file.relativePath,
        options,
      )
    ) {
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
