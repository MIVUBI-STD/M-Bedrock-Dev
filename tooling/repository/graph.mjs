import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { buildResourceCatalog, resourceIdForDocumentPath } from "./resource-catalog.mjs";
import { buildKnowledgeBindingEdges } from "./knowledge-binding-edges.mjs";

const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]+)\)/g;

function sourceOwnerForPath(resources, path) {
  return resources
    .filter((resource) => resource.class === "SOURCE")
    .filter(
      (resource) =>
        path === resource.path ||
        path.startsWith(resource.path + "/"),
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
}

function addKnowledgeBindingEdges(catalog, edges, seen) {
  const path =
    "engine/reliability/catalogs/knowledge-detector-bindings.json";
  if (!existsSync(path)) return;

  const registry = JSON.parse(readFileSync(path, "utf8"));
  const byId = new Map(
    catalog.resources.map((resource) => [resource.id, resource]),
  );

  for (const binding of registry.bindings ?? []) {
    const knowledgeId = "knowledge." + binding.knowledgeId;

    if (!byId.has(knowledgeId)) {
      throw new Error(
        "Knowledge binding references unregistered fact: " +
          binding.knowledgeId,
      );
    }

    for (const analyzerPath of binding.analyzerPaths ?? []) {
      const owner = sourceOwnerForPath(
        catalog.resources,
        analyzerPath,
      );
      if (!owner) {
        throw new Error(
          "Knowledge binding analyzer path has no registered SOURCE owner: " +
            analyzerPath,
        );
      }

      addEdge(edges, seen, {
        from: owner.id,
        type: "USES",
        to: knowledgeId,
      });
    }

    for (const proofPath of binding.proofPaths ?? []) {
      const owner = sourceOwnerForPath(
        catalog.resources,
        proofPath,
      );
      if (!owner) {
        throw new Error(
          "Knowledge binding proof path has no registered SOURCE owner: " +
            proofPath,
        );
      }

      addEdge(edges, seen, {
        from: owner.id,
        type: "VALIDATES",
        to: knowledgeId,
      });
    }
  }
}

function cleanTarget(value) {
  return value
    .trim()
    .replace(/^<|>$/g, "")
    .split("#", 1)[0]
    .split("?", 1)[0];
}

function resolveResourceLink(fromPath, rawTarget) {
  const target = cleanTarget(rawTarget);
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;

  const resolved = target.startsWith("/")
    ? target.slice(1)
    : posix.normalize(posix.join(posix.dirname(fromPath), target));

  if (resolved === ".." || resolved.startsWith("../")) {
    return undefined;
  }
  return resolved;
}

function addEdge(edges, seen, edge) {
  if (edge.from === edge.to) return;
  const key = edge.from + "|" + edge.type + "|" + edge.to;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push(edge);
}

export function buildGraph() {
  const catalog = buildResourceCatalog();
  const byPath = new Map(catalog.resources.map((resource) => [resource.path, resource]));
  const edges = [];
  const seen = new Set();

  for (const resource of catalog.resources) {
    if (resource.class !== "DOCUMENT") continue;
    if (resource.locator !== undefined) continue;
    if (!existsSync(resource.path)) continue;

    const text = readFileSync(resource.path, "utf8");
    for (const match of text.matchAll(MARKDOWN_LINK)) {
      const targetPath = resolveResourceLink(resource.path, match[1]);
      if (!targetPath) continue;

      const target = byPath.get(targetPath);
      if (!target) continue;

      addEdge(edges, seen, {
        from: resource.id,
        type:
          resource.role === "ROUTER"
            ? "ROUTES_TO"
            : target.class === "KNOWLEDGE"
              ? "USES"
              : "RELATES_TO",
        to: target.id,
      });
    }
  }

  for (const edge of buildKnowledgeBindingEdges(catalog.resources)) {
    addEdge(edges, seen, edge);
  }

  edges.sort((a, b) => {
    const left = a.from + "|" + a.type + "|" + a.to;
    const right = b.from + "|" + b.type + "|" + b.to;
    return left.localeCompare(right);
  });

  return { schemaVersion: 1, edges };
}

export function documentGraphRootId() {
  return resourceIdForDocumentPath("docs/README.md");
}