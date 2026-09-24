import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, normalize, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "packages", "analyzers", "adapters"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", "test", "tests", "fixtures", "__tests__"]);
const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir, skipTests = true) {
  const output = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipTests && SKIP_DIRS.has(entry.name)) continue;
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
      output.push(...walk(full, skipTests));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.includes(extname(entry.name))) {
      output.push(full);
    }
  }
  return output;
}

function candidateTargets(base) {
  const ext = extname(base);
  if (SOURCE_EXTENSIONS.includes(ext)) return [base];

  const values = [base];
  for (const candidateExt of SOURCE_EXTENSIONS) values.push(base + candidateExt);
  for (const candidateExt of SOURCE_EXTENSIONS) values.push(resolve(base, "index" + candidateExt));
  return values;
}

function resolveRelativeImport(fromFile, specifier) {
  const raw = normalize(resolve(dirname(fromFile), specifier));
  for (const candidate of candidateTargets(raw)) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }

  if (/\.js$/.test(raw)) {
    const withoutJs = raw.slice(0, -3);
    for (const candidateExt of [".ts", ".tsx", ".mts", ".cts"]) {
      const candidate = withoutJs + candidateExt;
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
  }
  return undefined;
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

const productionFiles = SOURCE_ROOTS.flatMap((rootName) => {
  const root = resolve(ROOT, rootName);
  return existsSync(root) ? walk(root, true) : [];
});

const inbound = new Map(productionFiles.map((file) => [file, 0]));
const externalUsage = new Map();
const externalUsageFiles = new Map();

for (const file of productionFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;

    if (specifier.startsWith(".")) {
      const target = resolveRelativeImport(file, specifier);
      if (target && inbound.has(target)) inbound.set(target, (inbound.get(target) ?? 0) + 1);
      continue;
    }

    if (specifier.startsWith("node:")) continue;
    const pkg = packageName(specifier);
    externalUsage.set(pkg, (externalUsage.get(pkg) ?? 0) + 1);
    if (!externalUsageFiles.has(pkg)) externalUsageFiles.set(pkg, new Set());
    externalUsageFiles.get(pkg).add(relative(ROOT, file).replaceAll("\\", "/"));
  }
}

function isEntrypoint(file) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  return /\/src\/index\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(rel) ||
    /^apps\/[^/]+\/src\/main\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(rel);
}

const orphanCandidates = [...inbound.entries()]
  .filter(([file, count]) => count === 0 && !isEntrypoint(file))
  .map(([file]) => relative(ROOT, file).replaceAll("\\", "/"))
  .sort();

const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const declaredRuntime = Object.keys(pkg.dependencies ?? {}).sort();
const declaredDev = Object.keys(pkg.devDependencies ?? {}).sort();

console.log("Source hygiene audit (report-only)");
console.log("  production source files:", productionFiles.length);
console.log("  orphan candidates:", orphanCandidates.length);
console.log("");
console.log("Orphan production-file candidates:");
if (orphanCandidates.length === 0) {
  console.log("  none");
} else {
  for (const file of orphanCandidates.slice(0, 40)) console.log("  " + file);
  if (orphanCandidates.length > 40) console.log(`  ... and ${orphanCandidates.length - 40} more`);
}

console.log("");
console.log("External package imports from production source:");
if (externalUsage.size === 0) {
  console.log("  none");
} else {
  for (const [name, count] of [...externalUsage.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const files = [...(externalUsageFiles.get(name) ?? [])].sort();
    console.log(`  ${name}: ${count}`);
    for (const file of files) console.log(`    - ${file}`);
  }
}

console.log("");
console.log("Declared runtime dependencies with no production import:");
for (const name of declaredRuntime.filter((name) => !externalUsage.has(name))) {
  console.log("  " + name);
}

console.log("");
console.log("Declared dev dependencies:");
for (const name of declaredDev) console.log("  " + name);

console.log("");
console.log("This audit is informational. Review candidates before deleting code or dependencies.");
