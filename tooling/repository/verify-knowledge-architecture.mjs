import { existsSync, readFileSync } from "node:fs";
import { buildResourceCatalog } from "./resource-catalog.mjs";
import { buildGraph, documentGraphRootId } from "./graph.mjs";

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

  const expectedClasses = ["DOCUMENT","KNOWLEDGE","SOURCE","RELIABILITY","SCHEMA"];
  const expectedRoles = ["ROUTER","WORKFLOW","CONTRACT","DOMAIN","ARCHITECTURE","GUIDE"];
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


const resourceIdPattern =
  /^(document|knowledge|source|reliability|schema)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

try {
  const catalog = buildResourceCatalog();
  const graph = buildGraph();

  const ids = new Set();
  const paths = new Set();
  const byId = new Map();

  for (const resource of catalog.resources) {
    if (!resourceIdPattern.test(resource.id)) {
      failures.push("Invalid Resource Catalog id: " + resource.id);
    }
    if (ids.has(resource.id)) {
      failures.push("Duplicate Resource Catalog id: " + resource.id);
    }
    ids.add(resource.id);

    if (paths.has(resource.path)) {
      failures.push("Multiple active resources use the same path: " + resource.path);
    }
    paths.add(resource.path);

    if (!existsSync(resource.path)) {
      failures.push("Resource Catalog path does not exist: " + resource.path);
    }

    if (resource.class === "DOCUMENT" && !resource.role) {
      failures.push("DOCUMENT resource lacks role: " + resource.id);
    }
    if (resource.class !== "DOCUMENT" && resource.role !== undefined) {
      failures.push("Non-DOCUMENT resource must not declare role: " + resource.id);
    }

    if (resource.class === "DOCUMENT") {
      const expectedDomain =
        resource.path === "docs/README.md"
          ? "docs"
          : resource.path.split("/")[1];

      if (resource.domain !== expectedDomain) {
        failures.push(
          "DOCUMENT domain/path mismatch: " +
            resource.id +
            " metadata=" +
            resource.domain +
            " path-domain=" +
            expectedDomain,
        );
      }

      const expectedIdPrefix =
        "document." + expectedDomain + ".";
      if (!resource.id.startsWith(expectedIdPrefix)) {
        failures.push(
          "DOCUMENT id/domain mismatch: " +
            resource.id +
            " expected prefix " +
            expectedIdPrefix,
        );
      }

      const isRouter =
        resource.path === "docs/README.md" ||
        resource.path.endsWith("/README.md");

      if (isRouter && resource.role !== "ROUTER") {
        failures.push(
          "Documentation README must use ROUTER role: " +
            resource.path,
        );
      }
      if (!isRouter && resource.role === "ROUTER") {
        failures.push(
          "Only documentation README files may use ROUTER role: " +
            resource.path,
        );
      }

      const expectedAuthority =
        expectedDomain === "examples"
          ? "REFERENCE"
          : "CANONICAL";
      if (resource.authority !== expectedAuthority) {
        failures.push(
          "DOCUMENT authority/domain mismatch: " +
            resource.id +
            " expected " +
            expectedAuthority,
        );
      }
    }

    byId.set(resource.id, resource);
  }

  const edgeKeys = new Set();
  for (const edge of graph.edges) {
    const key = edge.from + "|" + edge.type + "|" + edge.to;
    if (edgeKeys.has(key)) {
      failures.push("Duplicate Graph edge: " + key);
    }
    edgeKeys.add(key);

    if (!byId.has(edge.from)) {
      failures.push("Graph edge source is not registered: " + edge.from);
    }
    if (!byId.has(edge.to)) {
      failures.push("Graph edge target is not registered: " + edge.to);
    }
  }

  const routeAdjacency = new Map();
  for (const edge of graph.edges.filter((item) => item.type === "ROUTES_TO")) {
    const list = routeAdjacency.get(edge.from) ?? [];
    list.push(edge.to);
    routeAdjacency.set(edge.from, list);
  }

  const rootId = documentGraphRootId();
  if (!byId.has(rootId)) {
    failures.push("Root documentation Router is not registered: " + rootId);
  } else {
    const reachable = new Set([rootId]);
    const queue = [rootId];

    while (queue.length) {
      const current = queue.shift();
      for (const next of routeAdjacency.get(current) ?? []) {
        if (reachable.has(next)) continue;
        reachable.add(next);
        queue.push(next);
      }
    }

    for (const resource of catalog.resources.filter(
      (item) => item.class === "DOCUMENT" && item.lifecycle === "ACTIVE",
    )) {
      if (!reachable.has(resource.id)) {
        failures.push("Active DOCUMENT is not reachable from docs Router: " + resource.id);
      }
    }
  }
} catch (error) {
  failures.push(
    "Unable to build Resource Catalog / Graph: " +
      (error instanceof Error ? error.message : String(error)),
  );
}

if (failures.length) {
  console.error("Knowledge architecture violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Knowledge architecture verification passed.");