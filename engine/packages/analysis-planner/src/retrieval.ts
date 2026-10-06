export type CatalogResourceClass =
  | "DOCUMENT"
  | "KNOWLEDGE"
  | "SOURCE"
  | "RELIABILITY"
  | "SCHEMA"
  | "EXAMPLE";

export type DocumentRole =
  | "ROUTER"
  | "WORKFLOW"
  | "CONTRACT"
  | "DOMAIN"
  | "ARCHITECTURE"
  | "GUIDE";

export type ResourceAuthority =
  | "CANONICAL"
  | "REFERENCE"
  | "HISTORICAL"
  | "DERIVED";

export type ResourceLifecycle =
  | "ACTIVE"
  | "RETIRED";

export type GraphRelationType =
  | "ROUTES_TO"
  | "OWNS"
  | "IMPLEMENTS"
  | "USES"
  | "DEPENDS_ON"
  | "VALIDATES"
  | "RELATES_TO"
  | "DERIVED_FROM";

export interface CatalogResource {
  id: string;
  class: CatalogResourceClass;
  domain: string;
  role?: DocumentRole;
  authority: ResourceAuthority;
  path: string;
  lifecycle: ResourceLifecycle;
}

export interface GraphEdge {
  from: string;
  type: GraphRelationType;
  to: string;
}

export interface RetrievalQuery {
  text: string;
  domains?: readonly string[];
  classes?: readonly CatalogResourceClass[];
  authorities?: readonly ResourceAuthority[];
  includeHistorical?: boolean;
  seedIds?: readonly string[];
  lexicalScores?: Readonly<Record<string, number>>;
  semanticScores?: Readonly<Record<string, number>>;
  limit?: number;
}

export interface RetrievalScore {
  routing: number;
  graph: number;
  structural: number;
  lexical: number;
  semantic: number;
  authority: number;
  total: number;
}

export interface RetrievalResult {
  resource: CatalogResource;
  score: RetrievalScore;
  reasons: readonly string[];
}

const AUTHORITY_SCORE: Readonly<Record<ResourceAuthority, number>> = {
  CANONICAL: 20,
  REFERENCE: 10,
  HISTORICAL: 0,
  DERIVED: 2,
};

const RELATION_SCORE: Readonly<Record<GraphRelationType, number>> = {
  ROUTES_TO: 30,
  OWNS: 28,
  IMPLEMENTS: 26,
  USES: 22,
  DEPENDS_ON: 20,
  VALIDATES: 20,
  DERIVED_FROM: 18,
  RELATES_TO: 12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tokens(value: string): readonly string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2),
    ),
  ];
}

function structuralScore(
  resource: CatalogResource,
  queryTokens: readonly string[],
): number {
  if (queryTokens.length === 0) return 0;

  const resourceTokens = new Set(
    tokens([
      resource.id,
      resource.domain,
      resource.class,
      resource.role ?? "",
      resource.path,
    ].join(" ")),
  );

  let overlap = 0;
  for (const token of queryTokens) {
    if (resourceTokens.has(token)) overlap += 1;
  }

  return Math.min(40, overlap * 8);
}

function graphScores(
  edges: readonly GraphEdge[],
  seedIds: ReadonlySet<string>,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const seedId of seedIds) {
    scores.set(seedId, 50);
  }

  for (const edge of edges) {
    if (seedIds.has(edge.from)) {
      scores.set(
        edge.to,
        Math.max(scores.get(edge.to) ?? 0, RELATION_SCORE[edge.type]),
      );
    }
    if (seedIds.has(edge.to)) {
      scores.set(
        edge.from,
        Math.max(
          scores.get(edge.from) ?? 0,
          Math.max(1, RELATION_SCORE[edge.type] - 4),
        ),
      );
    }
  }

  return scores;
}

function candidateResources(
  resources: readonly CatalogResource[],
  graphScore: ReadonlyMap<string, number>,
  domains: ReadonlySet<string>,
): readonly CatalogResource[] {
  if (domains.size === 0 && graphScore.size === 0) {
    return resources;
  }

  return resources.filter(
    (resource) =>
      domains.has(resource.domain) ||
      graphScore.has(resource.id),
  );
}

export function retrieveResources(
  resources: readonly CatalogResource[],
  edges: readonly GraphEdge[],
  query: RetrievalQuery,
): readonly RetrievalResult[] {
  const domains = new Set(query.domains ?? []);
  const classes = new Set(query.classes ?? []);
  const authorities = new Set(query.authorities ?? []);
  const seedIds = new Set(query.seedIds ?? []);
  const historicalRequested =
    query.includeHistorical === true ||
    authorities.has("HISTORICAL");
  const queryTokens = tokens(query.text);
  const graphScore = graphScores(edges, seedIds);
  const lexicalScores = query.lexicalScores ?? {};
  const semanticScores = query.semanticScores ?? {};
  const limit = clamp(query.limit ?? 12, 1, 50);

  return candidateResources(resources, graphScore, domains)
    .filter((resource) => resource.lifecycle === "ACTIVE")
    .filter(
      (resource) =>
        resource.authority !== "HISTORICAL" ||
        historicalRequested ||
        seedIds.has(resource.id),
    )
    .filter(
      (resource) =>
        classes.size === 0 ||
        classes.has(resource.class),
    )
    .filter(
      (resource) =>
        authorities.size === 0 ||
        authorities.has(resource.authority),
    )
    .map((resource): RetrievalResult => {
      const routing =
        domains.size > 0 && domains.has(resource.domain)
          ? 30
          : 0;
      const graph = graphScore.get(resource.id) ?? 0;
      const structural = structuralScore(resource, queryTokens);
      const lexical = Math.round(
        clamp(lexicalScores[resource.id] ?? 0, 0, 1) * 30,
      );
      const semantic = Math.round(
        clamp(semanticScores[resource.id] ?? 0, 0, 1) * 30,
      );
      const authority = AUTHORITY_SCORE[resource.authority];
      const total =
        routing +
        graph +
        structural +
        lexical +
        semantic +
        authority;

      const reasons = [
        ...(routing > 0 ? ["domain-route"] : []),
        ...(graph > 0 ? ["graph-relation"] : []),
        ...(structural > 0 ? ["structural-match"] : []),
        ...(lexical > 0 ? ["lexical-rank"] : []),
        ...(semantic > 0 ? ["semantic-rank"] : []),
        "authority:" + resource.authority,
      ];

      return {
        resource,
        score: {
          routing,
          graph,
          structural,
          lexical,
          semantic,
          authority,
          total,
        },
        reasons,
      };
    })
    .filter(
      (result) =>
        result.score.total > AUTHORITY_SCORE[result.resource.authority] ||
        queryTokens.length === 0,
    )
    .sort(
      (left, right) =>
        right.score.total - left.score.total ||
        left.resource.id.localeCompare(right.resource.id),
    )
    .slice(0, limit);
}