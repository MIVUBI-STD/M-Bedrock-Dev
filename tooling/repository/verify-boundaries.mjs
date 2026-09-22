import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, normalize, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "packages", "analyzers", "adapters"];
const EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir) {
  const output = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
      output.push(...walk(full));
    } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
      output.push(full);
    }
  }
  return output;
}

function topArea(path) {
  const rel = relative(ROOT, path).split(sep);
  return rel[0] ?? "";
}

function packageName(path) {
  const rel = relative(resolve(ROOT, "packages"), path).split(sep);
  return rel[0] ?? "";
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  return normalize(resolve(dirname(fromFile), specifier));
}

function violation(fromFile, targetPath) {
  const fromArea = topArea(fromFile);
  const targetArea = topArea(targetPath);

  if (fromArea === "apps" && targetArea === "analyzers") {
    return "apps must consume analyzers through orchestrator/core APIs, not direct analyzer imports";
  }

  if (fromArea === "packages") {
    const fromPackage = packageName(fromFile);
    if (targetArea === "apps") {
      return "packages must never import presentation apps";
    }
    if (targetArea === "analyzers" && fromPackage !== "orchestrator") {
      return "only packages/orchestrator may compose analyzers; reusable packages must remain analyzer-independent";
    }
  }

  if (fromArea === "analyzers") {
    if (targetArea === "apps") return "analyzers must never import presentation apps";
    if (targetArea === "packages") {
      const targetPackage = packageName(targetPath);
      if (targetPackage === "orchestrator" || targetPackage === "repair") {
        return "analyzers must not depend on orchestration or mutation packages";
      }
    }
  }

  if (fromArea === "adapters") {
    if (targetArea === "apps") return "adapters must never import presentation apps";
    if (targetArea === "packages") {
      const targetPackage = packageName(targetPath);
      if (targetPackage === "orchestrator" || targetPackage === "repair") {
        return "format adapters must not depend on orchestration or repair policy";
      }
    }
  }

  return undefined;
}

const failures = [];

for (const rootName of SOURCE_ROOTS) {
  const root = resolve(ROOT, rootName);
  if (!statSync(root).isDirectory()) continue;

  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORT_RE)) {
      const specifier = match[1] ?? match[2];
      if (!specifier) continue;
      const target = resolveImport(file, specifier);
      if (!target) continue;
      const reason = violation(file, target);
      if (reason) {
        failures.push({
          file: relative(ROOT, file).replaceAll("\\", "/"),
          import: specifier,
          reason,
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Source boundary violations:");
  for (const failure of failures) {
    console.error(`- ${failure.file} -> ${failure.import}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log("Source boundary verification passed.");
