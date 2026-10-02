export interface DesignConsistencyObservation {
  readonly subjectId: string;
  readonly dimension: string;
  readonly value: string | number | boolean;
  readonly evidenceIds?: readonly string[];
}

export interface DesignConsistencyAnomaly {
  readonly subjectId: string;
  readonly dimension: string;
  readonly observed: string | number | boolean;
  readonly peerValue: string | number | boolean;
  readonly peerCount: number;
  readonly evidenceIds: readonly string[];
}

export function findDesignConsistencyAnomalies(
  observations: readonly DesignConsistencyObservation[],
): readonly DesignConsistencyAnomaly[] {
  const byDimension = new Map<string, DesignConsistencyObservation[]>();
  for (const item of observations) {
    const list = byDimension.get(item.dimension) ?? [];
    list.push(item);
    byDimension.set(item.dimension, list);
  }

  const anomalies: DesignConsistencyAnomaly[] = [];

  for (const [dimension, items] of byDimension) {
    if (items.length < 3) continue;

    const counts = new Map<string, {
      value: string | number | boolean;
      count: number;
    }>();

    for (const item of items) {
      const key = JSON.stringify(item.value);
      const current = counts.get(key);
      counts.set(key, {
        value: item.value,
        count: (current?.count ?? 0) + 1,
      });
    }

    const dominant = [...counts.values()]
      .sort((a, b) => b.count - a.count)[0];
    if (!dominant || dominant.count < 2) continue;

    for (const item of items) {
      if (item.value === dominant.value) continue;
      anomalies.push({
        subjectId: item.subjectId,
        dimension,
        observed: item.value,
        peerValue: dominant.value,
        peerCount: dominant.count,
        evidenceIds: [...new Set(item.evidenceIds ?? [])].sort(),
      });
    }
  }

  return anomalies;
}
