const RESOURCE_CLASSES = new Set([
  "DOCUMENT",
  "KNOWLEDGE",
  "SOURCE",
  "RELIABILITY",
  "WORKFLOW",
  "SCHEMA",
]);

const DOCUMENT_ROLES = new Set([
  "ROUTER",
  "WORKFLOW",
  "CONTRACT",
  "REFERENCE",
  "ARCHITECTURE",
  "GUIDE",
]);

const AUTHORITIES = new Set([
  "CANONICAL",
  "REFERENCE",
  "HISTORICAL",
  "DERIVED",
]);

const LIFECYCLE = new Set([
  "ACTIVE",
  "RETIRED",
]);

const ID_PATTERN =
  /^(document|knowledge|source|reliability|workflow|schema)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function parseLines(block) {
  const result = {};

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator <= 0) {
      throw new Error("Invalid document metadata line: " + rawLine);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!key || !value) {
      throw new Error("Invalid document metadata line: " + rawLine);
    }
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      throw new Error("Duplicate document metadata field: " + key);
    }

    result[key] = value;
  }

  return result;
}

export function readDocumentMetadata(text, path = "<document>") {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    throw new Error(path + ": missing document metadata frontmatter");
  }

  const normalized = text.replaceAll("\r\n", "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) {
    throw new Error(path + ": unterminated document metadata frontmatter");
  }

  const values = parseLines(normalized.slice(4, end));
  const allowed = new Set([
    "id",
    "class",
    "domain",
    "role",
    "authority",
    "lifecycle",
  ]);

  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) {
      throw new Error(path + ": unknown document metadata field " + key);
    }
  }

  for (const key of ["id", "class", "domain", "role", "authority", "lifecycle"]) {
    if (typeof values[key] !== "string" || !values[key]) {
      throw new Error(path + ": missing document metadata field " + key);
    }
  }

  if (!ID_PATTERN.test(values.id)) {
    throw new Error(path + ": invalid document resource id " + values.id);
  }
  if (!RESOURCE_CLASSES.has(values.class) || values.class !== "DOCUMENT") {
    throw new Error(path + ": document class must be DOCUMENT");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.domain)) {
    throw new Error(path + ": invalid document domain " + values.domain);
  }
  if (!DOCUMENT_ROLES.has(values.role)) {
    throw new Error(path + ": invalid document role " + values.role);
  }
  if (!AUTHORITIES.has(values.authority)) {
    throw new Error(path + ": invalid document authority " + values.authority);
  }
  if (!LIFECYCLE.has(values.lifecycle)) {
    throw new Error(path + ": invalid document lifecycle " + values.lifecycle);
  }

  return Object.freeze({
    id: values.id,
    class: values.class,
    domain: values.domain,
    role: values.role,
    authority: values.authority,
    lifecycle: values.lifecycle,
  });
}
