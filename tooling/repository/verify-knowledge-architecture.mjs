import { existsSync, readFileSync } from "node:fs";

const failures = [];

const catalogPath = "engine/schemas/knowledge-architecture/resource-catalog.v1.schema.json";
const graphPath = "engine/schemas/knowledge-architecture/graph.v1.schema.json";
const namingPath = "docs/system/canonical-naming.md";
const authorityPath = "docs/system/authority-model.md";
const architecturePath = "docs/system/architecture.md";

for (const path of [catalogPath, graphPath, namingPath, authorityPath, architecturePath]) {
  if (!existsSync(path)) failures.push("Missing knowledge architecture owner: " + path);
}

function sameSet(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

if (existsSync(catalogPath)) {
  const schema = JSON.parse(readFileSync(catalogPath, "utf8"));
  const resource = schema?.$defs?.resource?.properties ?? {};

  const expectedClasses = ["DOCUMENT","KNOWLEDGE","SOURCE","RELIABILITY","WORKFLOW","SCHEMA"];
  const expectedRoles = ["ROUTER","WORKFLOW","CONTRACT","REFERENCE","ARCHITECTURE","GUIDE"];
  const expectedAuthorities = ["CANONICAL","REFERENCE","HISTORICAL","DERIVED"];
  const expectedLifecycle = ["ACTIVE","RETIRED"];

  if (!sameSet(resource.class?.enum ?? [], expectedClasses)) {
    failures.push("Resource Catalog class vocabulary drift.");
  }
  if (!sameSet(resource.role?.enum ?? [], expectedRoles)) {
    failures.push("Resource Catalog document-role vocabulary drift.");
  }
  if (!sameSet(resource.authority?.enum ?? [], expectedAuthorities)) {
    failures.push("Resource Catalog authority vocabulary drift.");
  }
  if (!sameSet(resource.lifecycle?.enum ?? [], expectedLifecycle)) {
    failures.push("Resource Catalog lifecycle vocabulary drift.");
  }
}

if (existsSync(graphPath)) {
  const schema = JSON.parse(readFileSync(graphPath, "utf8"));
  const actual = schema?.$defs?.edge?.properties?.type?.enum ?? [];
  const expected = [
    "ROUTES_TO",
    "OWNS",
    "IMPLEMENTS",
    "USES",
    "DEPENDS_ON",
    "VALIDATES",
    "RELATES_TO",
    "DERIVED_FROM",
  ];
  if (!sameSet(actual, expected)) {
    failures.push("Graph relation vocabulary drift.");
  }
}

if (existsSync(namingPath)) {
  const text = readFileSync(namingPath, "utf8");
  for (const term of [
    "Catalog",
    "Graph",
    "Router",
    "Retrieval",
    "Context",
    "Owner",
    "History",
    "Corpus",
    "Planning",
    "Workspace",
    "DOCUMENT",
    "CANONICAL",
    "ROUTES_TO",
    "ACTIVE",
    "RETIRED",
  ]) {
    if (!text.includes(term)) failures.push("Canonical naming missing term: " + term);
  }
}

if (existsSync(authorityPath)) {
  const text = readFileSync(authorityPath, "utf8");
  for (const phrase of ["Catalog boundary","Graph boundary","Retrieval boundary","Context boundary"]) {
    if (!text.includes(phrase)) failures.push("Authority model missing boundary: " + phrase);
  }
}

if (existsSync(architecturePath)) {
  const text = readFileSync(architecturePath, "utf8");
  if (!text.includes("Task / Question") || !text.includes("→ Router") || !text.includes("→ Retrieval")) {
    failures.push("Architecture missing canonical knowledge access flow.");
  }
}

if (failures.length) {
  console.error("Knowledge architecture violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Knowledge architecture verification passed.");
