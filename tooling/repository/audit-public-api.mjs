import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "packages", "analyzers", "adapters"];
const EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "coverage"].includes(entry.name)) continue;
      out.push(...walk(full));
    } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function owner(file) {
  const parts = relative(ROOT, file).split(sep);
  if (parts.length < 2 || !SOURCE_ROOTS.includes(parts[0])) return undefined;
  return parts[0] + "/" + parts[1];
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

const BASELINE_PATH = resolve(ROOT, "tooling/repository/public-api-baseline.json");
const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : { owners: {} };

if (baseline.schemaVersion !== 1 || typeof baseline.owners !== "object") {
  console.error("Invalid public API baseline registry.");
  process.exit(1);
}

const nonZeroBaseline = Object.entries(baseline.owners ?? {})
  .filter(([, value]) => Number(value) !== 0);
if (nonZeroBaseline.length > 0) {
  console.error("Public API baseline must remain zero-debt:");
  for (const [ownerName, value] of nonZeroBaseline) {
    console.error(`- ${ownerName}: ${value}`);
  }
  process.exit(1);
}

const findings = [];

for (const rootName of SOURCE_ROOTS) {
  const root = resolve(ROOT, rootName);
  if (!existsSync(root)) continue;

  for (const file of walk(root)) {
    const fromOwner = owner(file);
    if (!fromOwner) continue;
    const text = readFileSync(file, "utf8");

    for (const match of text.matchAll(IMPORT_RE)) {
      const specifier = match[1] ?? match[2];
      if (!specifier?.startsWith(".")) continue;

      const target = resolve(dirname(file), specifier);
      const toOwner = owner(target);
      if (!toOwner || toOwner === fromOwner) continue;

      const normalizedTarget = normalizePath(relative(ROOT, target));
      const ownerRoot = toOwner + "/src";
      const expectedEntrypoint = ownerRoot + "/index.js";

      if (
        normalizedTarget === expectedEntrypoint ||
        normalizedTarget === ownerRoot + "/index.ts"
      ) {
        continue;
      }

      if (!normalizedTarget.startsWith(ownerRoot + "/")) continue;

      findings.push({
        from: normalizePath(relative(ROOT, file)),
        fromOwner,
        toOwner,
        target: normalizedTarget,
        import: specifier,
      });
    }
  }
}

const grouped = new Map();
for (const item of findings) {
  const key = item.toOwner;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(item);
}

console.log("Public API surface audit (report-only)");
console.log("  cross-owner deep imports:", findings.length);
console.log("  target owners:", grouped.size);

const byConsumerOwner = new Map();
const byTargetFile = new Map();
for (const item of findings) {
  byConsumerOwner.set(
    item.fromOwner,
    (byConsumerOwner.get(item.fromOwner) ?? 0) + 1,
  );
  byTargetFile.set(
    item.target,
    (byTargetFile.get(item.target) ?? 0) + 1,
  );
}

console.log("");
console.log("Debt by consumer owner:");
for (const [name, count] of [...byConsumerOwner.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)) {
  console.log(`  ${name}: ${count}`);
}

console.log("");
console.log("Debt by target contract file:");
for (const [name, count] of [...byTargetFile.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)) {
  console.log(`  ${name}: ${count}`);
}

for (const [target, items] of [...grouped.entries()].sort((a,b) =>
  b[1].length - a[1].length || a[0].localeCompare(b[0])
)) {
  console.log("");
  console.log(`${target}: ${items.length}`);
  for (const item of items.slice(0, 500)) {
    console.log(`  - ${item.from} -> ${item.import}`);
  }
  if (items.length > 500) console.log(`  - ... and ${items.length - 500} more`);
}

console.log("");
if (findings.length > 0) {
  console.error("Cross-owner deep imports are forbidden:");
  for (const item of findings) {
    console.error(`- ${item.from} -> ${item.import}`);
  }
  process.exit(1);
}

console.log("Public API zero-debt verification passed: no cross-owner deep imports.");

