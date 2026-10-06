import { existsSync, readFileSync, statSync } from "node:fs";

const TEXT_CLASSES = new Set([
  "DOCUMENT",
  "KNOWLEDGE",
  "RELIABILITY",
  "SCHEMA",
  "EXAMPLE",
]);

function tokens(value) {
  return value
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length >= 2) ?? [];
}

function termFrequency(values) {
  const frequency = new Map();
  for (const value of values) {
    frequency.set(value, (frequency.get(value) ?? 0) + 1);
  }
  return frequency;
}

function scoreDocuments(documents, query) {
  const queryTokens = [...new Set(tokens(query))];
  if (queryTokens.length === 0 || documents.length === 0) return {};

  const documentFrequency = new Map();
  const prepared = documents.map((document) => {
    const values = tokens(document.text);
    const frequency = termFrequency(values);
    for (const token of new Set(values)) {
      if (!queryTokens.includes(token)) continue;
      documentFrequency.set(
        token,
        (documentFrequency.get(token) ?? 0) + 1,
      );
    }
    return {
      id: document.id,
      frequency,
      length: Math.max(1, values.length),
    };
  });

  const averageLength =
    prepared.reduce((sum, item) => sum + item.length, 0) /
    Math.max(1, prepared.length);

  const raw = new Map();
  let maximum = 0;

  for (const document of prepared) {
    let score = 0;

    for (const token of queryTokens) {
      const tf = document.frequency.get(token) ?? 0;
      if (tf === 0) continue;

      const df = documentFrequency.get(token) ?? 0;
      const idf = Math.log(
        1 + (prepared.length - df + 0.5) / (df + 0.5),
      );
      const k1 = 1.2;
      const b = 0.75;
      const normalizedTf =
        (tf * (k1 + 1)) /
        (
          tf +
          k1 *
            (
              1 -
              b +
              b * (document.length / averageLength)
            )
        );

      score += idf * normalizedTf;
    }

    if (score <= 0) continue;
    raw.set(document.id, score);
    maximum = Math.max(maximum, score);
  }

  if (maximum <= 0) return {};

  return Object.fromEntries(
    [...raw.entries()]
      .map(([id, score]) => [id, score / maximum])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function readableFile(path) {
  if (!existsSync(path)) return false;
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function scoreResourcesLexically(resources, query) {
  const documents = resources
    .filter((resource) => TEXT_CLASSES.has(resource.class))
    .filter((resource) => resource.lifecycle === "ACTIVE")
    .filter((resource) => readableFile(resource.path))
    .map((resource) => ({
      id: resource.id,
      text: readFileSync(resource.path, "utf8"),
    }));

  return scoreDocuments(documents, query);
}

export function scoreSectionsLexically(sections, query) {
  const byPath = new Map();

  for (const section of sections) {
    if (!readableFile(section.path)) continue;

    let lines = byPath.get(section.path);
    if (lines === undefined) {
      lines = readFileSync(section.path, "utf8")
        .replaceAll("\r\n", "\n")
        .split("\n");
      byPath.set(section.path, lines);
    }
  }

  const documents = sections.flatMap((section) => {
    const lines = byPath.get(section.path);
    if (lines === undefined) return [];

    const start = Math.max(0, section.startLine - 1);
    const end = Math.min(lines.length, section.endLine);
    return [{
      id: section.id,
      text: [
        section.heading,
        ...lines.slice(start, end),
      ].join("\n"),
    }];
  });

  return scoreDocuments(documents, query);
}
