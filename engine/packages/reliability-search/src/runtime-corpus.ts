import { SemanticCorpus } from "./corpus.js";
import { runtimeDivergenceCoverage } from "./runtime-coverage.js";
import type {
  RuntimeComparisonResult,
  RuntimeObservationSnapshot,
} from "../../reliability/src/index.js";

export interface RuntimeCorpusInput {
  scenarioId: string;
  runtimeTick: number;
  snapshot: RuntimeObservationSnapshot;
  comparison: RuntimeComparisonResult;
}

export interface RuntimeCorpusFailure {
  scenarioId: string;
  runtimeTick: number;
  comparison: RuntimeComparisonResult;
}

export class RuntimeDivergenceCorpus {
  private readonly corpus = new SemanticCorpus<
    RuntimeCorpusInput,
    RuntimeCorpusFailure
  >();

  add(input: RuntimeCorpusInput, generation = 0, parentId?: string) {
    const failed = !input.comparison.ok;
    return this.corpus.add(
      input,
      {
        coverage: runtimeDivergenceCoverage(input.comparison, input.snapshot),
        failed,
        ...(failed
          ? {
              failure: {
                scenarioId: input.scenarioId,
                runtimeTick: input.runtimeTick,
                comparison: input.comparison,
              },
            }
          : {}),
      },
      generation,
      parentId,
    );
  }

  all() {
    return this.corpus.all();
  }

  coverage() {
    return this.corpus.coverage();
  }
}
