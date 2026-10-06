import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";

const DOC_DOMAINS = ["product", "artifacts", "analysis", "repair", "validation", "system"];

const DOCUMENT_ROLE = new Map([
  ["docs/product/flow.md", "WORKFLOW"],
  ["docs/analysis/master-selected-map-audit-workflow.md", "WORKFLOW"],
  ["docs/analysis/mandatory-audit-procedure.md", "WORKFLOW"],
  ["docs/analysis/audit-execution-flow.md", "WORKFLOW"],

  ["docs/system/architecture.md", "ARCHITECTURE"],
  ["docs/system/behavioral-world-model.md", "ARCHITECTURE"],
  ["docs/analysis/executable-reasoning-architecture.md", "ARCHITECTURE"],

  ["docs/system/development-operations.md", "GUIDE"],

  ["docs/system/authority-model.md", "CONTRACT"],
  ["docs/system/bug-report-ownership.md", "CONTRACT"],
  ["docs/system/canonical-naming.md", "CONTRACT"],
  ["docs/system/development-discipline.md", "CONTRACT"],
  ["docs/system/drive-storage.md", "CONTRACT"],
  ["docs/system/project-lifecycle.md", "CONTRACT"],
  ["docs/analysis/bug-finding-coverage.md", "CONTRACT"],
  ["docs/analysis/gameplay-model-closure.md", "CONTRACT"],
  ["docs/analysis/map-audit-naming-contract.md", "CONTRACT"],
  ["docs/analysis/map-audit-report-v2-schema.md", "CONTRACT"],
  ["docs/analysis/multi-arena-audit-contract.md", "CONTRACT"],
  ["docs/analysis/runtime-telemetry-contract.md", "CONTRACT"],
  ["docs/analysis/user-input-translation-contract.md", "CONTRACT"],
  ["docs/analysis/vital-gameplay-knowledge-closure.md", "CONTRACT"],
  ["docs/repair/transactions.md", "CONTRACT"],
  ["docs/validation/package-proof.md", "CONTRACT"],
  ["docs/validation/repair-validation.md", "CONTRACT"],
]);

function slug(value) {
  return value
    .replace(/\.md$/i, "")
    .replace(/\.json$/i, "")
    .replace(/\.schema$/i, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function documentId(path) {
  if (path === "docs/README.md") return "document.docs.router";
  const parts = path.split("/");
  const domain = parts[1];
  if (parts.at(-1) === "README.md") return "document." + domain + ".router";
  return "document." + domain + "." + slug(parts.at(-1));
}

function documentRole(path) {
  if (path.endsWith("/README.md") || path === "docs/README.md") return "ROUTER";
  return DOCUMENT_ROLE.get(path) ?? "REFERENCE";
}

function addResource(resources, seen, resource) {
  if (seen.has(resource.id)) throw new Error("Duplicate Resource Catalog id: " + resource.id);
  seen.add(resource.id);
  resources.push(resource);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function catalogDocuments(resources, seen) {
  addResource(resources, seen, {
    id: documentId("docs/README.md"),
    class: "DOCUMENT",
    domain: "docs",
    role: "ROUTER",
    authority: "CANONICAL",
    path: "docs/README.md",
    lifecycle: "ACTIVE",
  });

  for (const domain of DOC_DOMAINS) {
    const dir = join("docs", domain);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const path = join(dir, entry.name).replaceAll("\\", "/");
      addResource(resources, seen, {
        id: documentId(path),
        class: "DOCUMENT",
        domain,
        role: documentRole(path),
        authority: "CANONICAL",
        path,
        lifecycle: "ACTIVE",
      });
    }
  }
}

function modulesFromOwnership(path, field) {
  const data = readJson(path);
  const result = [];
  for (const config of Object.values(data.groups ?? {})) {
    for (const value of config[field] ?? []) result.push(value);
  }
  return result;
}

function catalogSourceModules(resources, seen) {
  const groups = [
    ["package", "engine/packages", "engine/packages/ownership.json", "modules"],
    ["analyzer", "engine/analyzers", "engine/analyzers/ownership.json", "modules"],
    ["adapter", "engine/adapters", "engine/adapters/ownership.json", "modules"],
    ["app", "apps", "apps/ownership.json", "entries"],
    ["tooling", "tooling", "tooling/ownership.json", "entries"],
  ];

  for (const [domain, root, ownershipPath, field] of groups) {
    for (const name of modulesFromOwnership(ownershipPath, field)) {
      const path = join(root, name).replaceAll("\\", "/");
      if (!existsSync(path)) continue;
      addResource(resources, seen, {
        id: "source." + domain + "." + slug(name),
        class: "SOURCE",
        domain,
        authority: "CANONICAL",
        path,
        lifecycle: "ACTIVE",
      });
    }
  }
}

function catalogKnowledge(resources, seen) {
  const ownership = readJson("engine/knowledge/ownership.json");
  for (const [group, config] of Object.entries(ownership.groups ?? {})) {
    for (const file of config.files ?? []) {
      const path = join("engine/knowledge", file).replaceAll("\\", "/");
      addResource(resources, seen, {
        id: "knowledge." + slug(group) + "." + slug(basename(file)),
        class: "KNOWLEDGE",
        domain: slug(group),
        authority: "REFERENCE",
        path,
        lifecycle: "ACTIVE",
      });
    }
  }
}

function catalogReliability(resources, seen) {
  for (const [name, authority] of [
    ["catalogs", "REFERENCE"],
    ["corpus", "REFERENCE"],
    ["history", "HISTORICAL"],
  ]) {
    const path = "engine/reliability/" + name;
    if (!existsSync(path)) continue;
    addResource(resources, seen, {
      id: "reliability.system." + name,
      class: "RELIABILITY",
      domain: "system",
      authority,
      path,
      lifecycle: "ACTIVE",
    });
  }
}

function walkJson(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) result.push(path);
  }
  return result;
}

function catalogSchemas(resources, seen) {
  for (const rawPath of walkJson("engine/schemas")) {
    const path = rawPath.replaceAll("\\", "/");
    const rel = relative("engine/schemas", rawPath).replaceAll("\\", "/");
    const parts = rel.split("/");
    const domain = slug(parts.length > 1 ? parts[0] : "engine");
    const name = slug(parts.slice(1).join("-") || parts[0]);
    addResource(resources, seen, {
      id: "schema." + domain + "." + name,
      class: "SCHEMA",
      domain,
      authority: "CANONICAL",
      path,
      lifecycle: "ACTIVE",
    });
  }
}

export function buildResourceCatalog() {
  const resources = [];
  const seen = new Set();

  catalogDocuments(resources, seen);
  catalogSourceModules(resources, seen);
  catalogKnowledge(resources, seen);
  catalogReliability(resources, seen);
  catalogSchemas(resources, seen);

  resources.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: 1, resources };
}

export function resourceIdForDocumentPath(path) {
  return documentId(path.replaceAll("\\", "/"));
}
