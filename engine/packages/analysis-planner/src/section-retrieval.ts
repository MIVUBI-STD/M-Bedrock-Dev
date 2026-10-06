export interface DocumentSection {
  readonly id: string;
  readonly documentId: string;
  readonly path: string;
  readonly heading: string;
  readonly level: number;
  readonly anchor: string;
  readonly startLine: number;
  readonly endLine: number;
}

export interface SectionRetrievalQuery {
  readonly text: string;
  readonly documentIds?: readonly string[];
  readonly semanticScores?: Readonly<Record<string, number>>;
  readonly limit?: number;
}

export interface SectionRetrievalScore {
  readonly documentScope: number;
  readonly heading: number;
  readonly semantic: number;
  readonly level: number;
  readonly total: number;
}

export interface SectionRetrievalResult {
  readonly section: DocumentSection;
  readonly score: SectionRetrievalScore;
  readonly reasons: readonly string[];
}

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

function headingScore(
  section: DocumentSection,
  queryTokens: readonly string[],
): number {
  if (queryTokens.length === 0) return 0;

  const haystack = new Set(
    tokens(
      [
        section.heading,
        section.anchor,
        section.documentId,
      ].join(" "),
    ),
  );

  let overlap = 0;
  for (const token of queryTokens) {
    if (haystack.has(token)) overlap += 1;
  }

  return Math.min(40, overlap * 10);
}

function levelScore(level: number): number {
  if (level <= 2) return 8;
  if (level === 3) return 5;
  return 2;
}

export function retrieveDocumentSections(
  sections: readonly DocumentSection[],
  query: SectionRetrievalQuery,
): readonly SectionRetrievalResult[] {
  const documentIds = new Set(query.documentIds ?? []);
  const queryTokens = tokens(query.text);
  const semanticScores = query.semanticScores ?? {};
  const limit = clamp(query.limit ?? 8, 1, 32);

  const candidates =
    documentIds.size === 0
      ? sections
      : sections.filter((section) =>
          documentIds.has(section.documentId)
        );

  return candidates
    .map((section): SectionRetrievalResult => {
      const documentScope =
        documentIds.size > 0 &&
        documentIds.has(section.documentId)
          ? 30
          : 0;
      const heading = headingScore(section, queryTokens);
      const semantic = Math.round(
        clamp(semanticScores[section.id] ?? 0, 0, 1) * 30,
      );
      const level = levelScore(section.level);
      const total =
        documentScope +
        heading +
        semantic +
        level;

      return {
        section,
        score: {
          documentScope,
          heading,
          semantic,
          level,
          total,
        },
        reasons: [
          ...(documentScope > 0 ? ["document-scope"] : []),
          ...(heading > 0 ? ["heading-match"] : []),
          ...(semantic > 0 ? ["semantic-rank"] : []),
          "heading-level:" + section.level,
        ],
      };
    })
    .filter(
      (result) =>
        queryTokens.length === 0 ||
        result.score.heading > 0 ||
        result.score.semantic > 0,
    )
    .sort(
      (left, right) =>
        right.score.total - left.score.total ||
        left.section.startLine - right.section.startLine ||
        left.section.id.localeCompare(right.section.id),
    )
    .slice(0, limit);
}
