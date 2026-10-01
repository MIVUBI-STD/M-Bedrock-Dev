import type {
  MutationDomain,
  MutationTestResult,
} from "./mutation-types.js";

export interface MutationCampaignSample {
  campaignId: string;
  mapId?: string;
  results: readonly MutationTestResult[];
}

export interface OperatorEffectiveness {
  operator: string;
  domain: MutationDomain;
  total: number;
  killed: number;
  survived: number;
  invalid: number;
  killRate: number;
  survivalRate: number;
  mapsSeen: number;
}

export interface DomainEffectiveness {
  domain: MutationDomain;
  total: number;
  killed: number;
  survived: number;
  invalid: number;
  killRate: number;
  survivalRate: number;
}

export interface OperatorEffectivenessReport {
  campaigns: number;
  operators: OperatorEffectiveness[];
  domains: DomainEffectiveness[];
}

function rate(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

export function summarizeOperatorEffectiveness(
  samples: readonly MutationCampaignSample[],
): OperatorEffectivenessReport {
  const operatorBuckets = new Map<string, {
    operator: string;
    domain: MutationDomain;
    total: number;
    killed: number;
    survived: number;
    invalid: number;
    maps: Set<string>;
  }>();
  const domainBuckets = new Map<MutationDomain, {
    total: number;
    killed: number;
    survived: number;
    invalid: number;
  }>();

  for (const sample of samples) {
    for (const result of sample.results) {
      const opKey = `${result.descriptor.domain}\u0000${result.descriptor.operator}`;
      const op = operatorBuckets.get(opKey) ?? {
        operator: result.descriptor.operator,
        domain: result.descriptor.domain,
        total: 0,
        killed: 0,
        survived: 0,
        invalid: 0,
        maps: new Set<string>(),
      };
      op.total += 1;
      op[result.status] += 1;
      if (sample.mapId) op.maps.add(sample.mapId);
      operatorBuckets.set(opKey, op);

      const domain = domainBuckets.get(result.descriptor.domain) ?? {
        total: 0,
        killed: 0,
        survived: 0,
        invalid: 0,
      };
      domain.total += 1;
      domain[result.status] += 1;
      domainBuckets.set(result.descriptor.domain, domain);
    }
  }

  const operators = [...operatorBuckets.values()].map((item) => {
    const valid = item.killed + item.survived;
    return {
      operator: item.operator,
      domain: item.domain,
      total: item.total,
      killed: item.killed,
      survived: item.survived,
      invalid: item.invalid,
      killRate: rate(item.killed, valid),
      survivalRate: rate(item.survived, valid),
      mapsSeen: item.maps.size,
    };
  }).sort((a, b) =>
    b.survivalRate - a.survivalRate ||
    b.total - a.total ||
    a.operator.localeCompare(b.operator),
  );

  const domains = [...domainBuckets.entries()].map(([domain, item]) => {
    const valid = item.killed + item.survived;
    return {
      domain,
      total: item.total,
      killed: item.killed,
      survived: item.survived,
      invalid: item.invalid,
      killRate: rate(item.killed, valid),
      survivalRate: rate(item.survived, valid),
    };
  }).sort((a, b) =>
    b.survivalRate - a.survivalRate ||
    b.total - a.total ||
    a.domain.localeCompare(b.domain),
  );

  return {
    campaigns: samples.length,
    operators,
    domains,
  };
}
