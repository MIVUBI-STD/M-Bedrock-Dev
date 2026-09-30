export type CoverageDimension =
  | "state"
  | "transition"
  | "action-pair"
  | "interaction"
  | "invariant"
  | "divergence";

export interface CoverageFeature {
  dimension: CoverageDimension;
  key: string;
}

export interface SemanticCoverageSignature {
  features: readonly CoverageFeature[];
}

export interface SearchEvaluation<TFailure = unknown> {
  coverage: SemanticCoverageSignature;
  failed: boolean;
  failure?: TFailure;
}

export interface CorpusEntry<TInput, TFailure = unknown> {
  id: string;
  input: TInput;
  coverage: SemanticCoverageSignature;
  newFeatures: readonly CoverageFeature[];
  failed: boolean;
  failure?: TFailure;
  generation: number;
  parentId?: string;
}

export interface CoverageGuidedSearchOptions {
  maxEvaluations: number;
  maxCorpusEntries?: number;
}

export interface CoverageGuidedSearchResult<TInput, TFailure = unknown> {
  evaluations: number;
  corpus: CorpusEntry<TInput, TFailure>[];
  failures: CorpusEntry<TInput, TFailure>[];
  coverage: SemanticCoverageSignature;
  exhausted: boolean;
}
