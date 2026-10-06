import {
  retrieveDocumentSections,
  retrieveResources,
} from "../../engine/packages/analysis-planner/src/index.js";
import { buildDocumentSectionIndex } from "./document-sections.mjs";
import { buildGraph } from "./graph.mjs";
import {
  scoreResourcesLexically,
  scoreSectionsLexically,
} from "./lexical-retrieval.mjs";
import { buildResourceCatalog } from "./resource-catalog.mjs";

interface RetrievalCliOptions {
  query: string;
  domains: string[];
  includeHistorical: boolean;
  allowAllDomains: boolean;
  limit: number;
  sectionLimit: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Retrieval limits must be positive integers.");
  }
  return parsed;
}

function parseArgs(argv: readonly string[]): RetrievalCliOptions {
  const domains: string[] = [];
  const queryParts: string[] = [];
  let includeHistorical = false;
  let allowAllDomains = false;
  let limit = 12;
  let sectionLimit = 8;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]!;

    if (value === "--domain") {
      const domain = argv[index + 1];
      if (!domain) throw new Error("--domain requires a value.");
      domains.push(
        ...domain
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (value === "--history") {
      includeHistorical = true;
      continue;
    }

    if (value === "--all") {
      allowAllDomains = true;
      continue;
    }

    if (value === "--limit") {
      limit = positiveInteger(argv[index + 1], 12);
      index += 1;
      continue;
    }

    if (value === "--section-limit") {
      sectionLimit = positiveInteger(argv[index + 1], 8);
      index += 1;
      continue;
    }

    queryParts.push(value);
  }

  const query = queryParts.join(" ").trim();
  if (!query) {
    throw new Error(
      "Usage: npm run retrieve:repository -- <query> --domain <domain> [--history] [--limit 12] [--section-limit 8]",
    );
  }

  if (domains.length === 0 && !allowAllDomains) {
    throw new Error(
      "Retrieval requires Router scope. Pass --domain <domain>, or use --all explicitly for broad diagnostic discovery.",
    );
  }

  return {
    query,
    domains: [...new Set(domains)].sort(),
    includeHistorical,
    allowAllDomains,
    limit,
    sectionLimit,
  };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const catalog = buildResourceCatalog();
  const graph = buildGraph();

  const lexicalScores = scoreResourcesLexically(
    catalog.resources,
    options.query,
  );

  const resources = retrieveResources(
    catalog.resources,
    graph.edges,
    {
      text: options.query,
      ...(options.domains.length === 0
        ? {}
        : { domains: options.domains }),
      includeHistorical: options.includeHistorical,
      lexicalScores,
      graphDepth: 2,
      limit: options.limit,
    },
  );

  const selectedDocumentIds = resources
    .filter((result) => result.resource.class === "DOCUMENT")
    .map((result) => result.resource.id);

  const sectionIndex = buildDocumentSectionIndex();
  const sectionLexicalScores = scoreSectionsLexically(
    sectionIndex.sections,
    options.query,
  );

  const sections = retrieveDocumentSections(
    sectionIndex.sections,
    {
      text: options.query,
      ...(selectedDocumentIds.length === 0
        ? {}
        : { documentIds: selectedDocumentIds }),
      lexicalScores: sectionLexicalScores,
      limit: options.sectionLimit,
    },
  );

  process.stdout.write(
    JSON.stringify(
      {
        schemaVersion: 1,
        query: options.query,
        domains: options.domains,
        includeHistorical: options.includeHistorical,
        broadDiagnostic: options.allowAllDomains,
        resources,
        sections,
      },
      null,
      2,
    ) + "\n",
  );
}

main();