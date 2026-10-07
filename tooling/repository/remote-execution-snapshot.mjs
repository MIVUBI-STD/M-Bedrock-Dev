import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const output = resolve(process.argv[2] ?? "workspace/publication/remote-execution-snapshot.json");

const roots = [
  "apps/cli/src",
  "engine/packages",
  "engine/knowledge",
  "engine/contracts",
  "engine/schemas",
];
const rootFiles = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
];

function walk(path) {
  const absolute = resolve(root, path);
  if (!statSync(absolute).isDirectory()) return [path];
  return readdirSync(absolute)
    .sort()
    .flatMap((name) => {
      const child = join(path, name);
      const info = statSync(resolve(root, child));
      if (info.isDirectory()) return walk(child);
      if (!info.isFile()) return [];
      return [child];
    });
}

function included(path) {
  if (rootFiles.includes(path)) return true;
  if (path.startsWith("apps/cli/src/")) return /\.(?:ts|json)$/.test(path);
  if (/^engine\/packages\/[^/]+\/src\//.test(path)) return /\.(?:ts|json)$/.test(path);
  if (
    path.startsWith("engine/knowledge/") ||
    path.startsWith("engine/contracts/") ||
    path.startsWith("engine/schemas/")
  ) {
    return /\.json$/.test(path);
  }
  return false;
}

const paths = [
  ...rootFiles,
  ...roots.flatMap(walk),
].filter(included);

const files = [...new Set(paths)]
  .sort()
  .map((path) => {
    const bytes = readFileSync(resolve(root, path));
    return {
      path: relative(root, resolve(root, path)).replaceAll("\\", "/"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
    };
  });

const manifest = {
  schemaVersion: 1,
  purpose: "REMOTE_GITHUB selected-map audit execution transport recipe",
  authority: "derived",
  productionEntrypoint:
    "engine/packages/orchestrator/src/map-audit-pipeline.ts#runSelectedMapAudit",
  files,
  totalFiles: files.length,
  totalBytes: files.reduce((sum, item) => sum + item.size, 0),
};

writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
process.stdout.write(JSON.stringify({
  output,
  totalFiles: manifest.totalFiles,
  totalBytes: manifest.totalBytes,
}, null, 2) + "\n");
