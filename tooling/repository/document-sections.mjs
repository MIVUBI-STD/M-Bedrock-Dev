import { readFileSync } from "node:fs";
import { buildResourceCatalog } from "./resource-catalog.mjs";

const HEADING = /^(#{1,6})\s+(.+?)\s*$/;

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueAnchor(base, used) {
  const initial = base || "section";
  const count = used.get(initial) ?? 0;
  used.set(initial, count + 1);
  return count === 0 ? initial : initial + "-" + (count + 1);
}

function contentStartLine(lines) {
  if (lines[0]?.trim() !== "---") return 1;

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") return index + 2;
  }

  return 1;
}

export function indexDocumentSections(resource) {
  if (resource.class !== "DOCUMENT") return [];

  const text = readFileSync(resource.path, "utf8");
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const start = contentStartLine(lines);
  const headings = [];
  const usedAnchors = new Map();

  for (let index = start - 1; index < lines.length; index += 1) {
    const match = lines[index].match(HEADING);
    if (!match) continue;

    const heading = match[2].trim();
    const anchor = uniqueAnchor(slug(heading), usedAnchors);

    headings.push({
      heading,
      level: match[1].length,
      line: index + 1,
      anchor,
    });
  }

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const endLine =
      next === undefined
        ? lines.length
        : Math.max(heading.line, next.line - 1);

    return {
      id: resource.id + "#" + heading.anchor,
      documentId: resource.id,
      path: resource.path,
      heading: heading.heading,
      level: heading.level,
      anchor: heading.anchor,
      startLine: heading.line,
      endLine,
    };
  });
}

export function buildDocumentSectionIndex() {
  const catalog = buildResourceCatalog();
  const sections = catalog.resources
    .filter(
      (resource) =>
        resource.class === "DOCUMENT" &&
        resource.lifecycle === "ACTIVE",
    )
    .flatMap(indexDocumentSections)
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    schemaVersion: 1,
    sections,
  };
}
