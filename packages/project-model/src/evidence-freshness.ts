export interface EvidenceRevisionBinding {
  evidenceId: string;
  basisNodeIds: readonly string[];
  basisFingerprint: string;
}

export interface EvidenceFreshnessInput {
  evidence: readonly EvidenceRevisionBinding[];
  currentNodeFingerprints: Readonly<Record<string, string>>;
}

export interface EvidenceFreshnessResult {
  freshEvidenceIds: readonly string[];
  staleEvidenceIds: readonly string[];
  unknownEvidenceIds: readonly string[];
}

export function evaluateEvidenceFreshness(
  input: EvidenceFreshnessInput,
): EvidenceFreshnessResult {
  const fresh: string[] = [];
  const stale: string[] = [];
  const unknown: string[] = [];

  for (const item of input.evidence) {
    const current = item.basisNodeIds.map(
      (nodeId) => input.currentNodeFingerprints[nodeId],
    );

    if (current.some((value) => value === undefined)) {
      unknown.push(item.evidenceId);
      continue;
    }

    const joined = current.join("|");
    if (
      joined === item.basisFingerprint ||
      (
        item.basisNodeIds.length === 1 &&
        current[0] === item.basisFingerprint
      )
    ) {
      fresh.push(item.evidenceId);
    } else {
      stale.push(item.evidenceId);
    }
  }

  return {
    freshEvidenceIds: fresh.sort(),
    staleEvidenceIds: stale.sort(),
    unknownEvidenceIds: unknown.sort(),
  };
}
