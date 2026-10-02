export interface ContradictionRegistryCandidate {
  readonly semanticKey: string;
  readonly route: string;
  readonly evidenceIds: readonly string[];
}

export interface ContradictionRegistryEntry {
  readonly semanticKey: string;
  readonly candidateIndexes: readonly number[];
  readonly routes: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface ContradictionRegistry {
  readonly entries: readonly ContradictionRegistryEntry[];
  readonly exactDuplicateIndexes: readonly number[];
  readonly uniqueCandidateIndexes: readonly number[];
  readonly corroboratedSemanticKeys: readonly string[];
}

function normalizedSet(
  values: readonly string[],
): string {
  return [...new Set(values)]
    .sort()
    .join("\u0000");
}

export function buildContradictionRegistry(
  candidates:
    readonly ContradictionRegistryCandidate[],
): ContradictionRegistry {
  const exactSeen = new Map<string, number>();
  const exactDuplicateIndexes: number[] = [];
  const uniqueCandidateIndexes: number[] = [];
  const bySemantic = new Map<
    string,
    {
      indexes: number[];
      routes: Set<string>;
      evidenceIds: Set<string>;
    }
  >();

  candidates.forEach((candidate, index) => {
    const exactKey = [
      candidate.semanticKey,
      candidate.route,
      normalizedSet(candidate.evidenceIds),
    ].join("\u0001");

    if (exactSeen.has(exactKey)) {
      exactDuplicateIndexes.push(index);
    } else {
      exactSeen.set(exactKey, index);
      uniqueCandidateIndexes.push(index);
    }

    const group =
      bySemantic.get(candidate.semanticKey) ?? {
        indexes: [],
        routes: new Set<string>(),
        evidenceIds: new Set<string>(),
      };
    group.indexes.push(index);
    group.routes.add(candidate.route);
    candidate.evidenceIds.forEach((id) =>
      group.evidenceIds.add(id)
    );
    bySemantic.set(
      candidate.semanticKey,
      group,
    );
  });

  const entries = [...bySemantic.entries()]
    .map(([semanticKey, group]) => ({
      semanticKey,
      candidateIndexes:
        [...group.indexes],
      routes:
        [...group.routes].sort(),
      evidenceIds:
        [...group.evidenceIds].sort(),
    }))
    .sort((a, b) =>
      a.semanticKey.localeCompare(
        b.semanticKey,
      )
    );

  return {
    entries,
    exactDuplicateIndexes:
      exactDuplicateIndexes.sort(
        (a, b) => a - b,
      ),
    uniqueCandidateIndexes:
      uniqueCandidateIndexes.sort(
        (a, b) => a - b,
      ),
    corroboratedSemanticKeys:
      entries
        .filter(
          (entry) =>
            entry.routes.length > 1 ||
            entry.candidateIndexes.length > 1,
        )
        .map((entry) => entry.semanticKey),
  };
}
