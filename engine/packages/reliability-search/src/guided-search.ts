import { SemanticCorpus } from "./corpus.js";
import type {
  CoverageGuidedSearchOptions,
  CoverageGuidedSearchResult,
  SearchEvaluation,
} from "./types.js";

export interface CoverageSearchDomain<TInput, TFailure = unknown> {
  evaluate(input: TInput): SearchEvaluation<TFailure> | Promise<SearchEvaluation<TFailure>>;
  mutate(input: TInput): readonly TInput[] | Promise<readonly TInput[]>;
}

export async function runCoverageGuidedSearch<TInput, TFailure = unknown>(
  seeds: readonly TInput[],
  domain: CoverageSearchDomain<TInput, TFailure>,
  options: CoverageGuidedSearchOptions,
): Promise<CoverageGuidedSearchResult<TInput, TFailure>> {
  const corpus = new SemanticCorpus<TInput, TFailure>();
  const queue: Array<{ input: TInput; generation: number; parentId?: string }> =
    seeds.map((input) => ({ input, generation: 0 }));

  let evaluations = 0;

  while (queue.length > 0 && evaluations < options.maxEvaluations) {
    const candidate = queue.shift()!;
    const evaluation = await domain.evaluate(candidate.input);
    evaluations += 1;

    const accepted = corpus.add(
      candidate.input,
      evaluation,
      candidate.generation,
      candidate.parentId,
    );
    if (!accepted) continue;

    if (options.maxCorpusEntries !== undefined) {
      corpus.trim(options.maxCorpusEntries);
    }

    for (const mutation of await domain.mutate(candidate.input)) {
      queue.push({
        input: mutation,
        generation: candidate.generation + 1,
        parentId: accepted.id,
      });
    }
  }

  const entries = corpus.all();
  return {
    evaluations,
    corpus: entries,
    failures: entries.filter((entry) => entry.failed),
    coverage: corpus.coverage(),
    exhausted: queue.length === 0,
  };
}
