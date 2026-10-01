import type {
  MultiplayerStressMatrix,
} from "../../../reliability/src/index.js";
import type {
  ArenaInterleavingSubject,
  ArenaInterleavingCompilation,
} from "./arena-interleaving-analysis.js";
import {
  compileArenaInterleavingAnalysis,
} from "./arena-interleaving-analysis.js";

export interface ArenaInterleavingPortfolioInput {
  matrix: MultiplayerStressMatrix;
  arenaGenerations: Readonly<Record<string, number>>;
  subjects?: Readonly<Record<string, ArenaInterleavingSubject>>;
  maxSchedulesPerScenario?: number;
  maxExploredNodesPerScenario?: number;
}

export interface ArenaInterleavingPortfolio {
  schemaVersion: 1;
  scenarios: number;
  analyzed: number;
  insufficientIdentity: number;
  unsupported: number;
  highRiskSchedules: number;
  truncatedAnalyses: number;
  items: readonly ArenaInterleavingCompilation[];
}

export function compileArenaInterleavingPortfolio(
  input: ArenaInterleavingPortfolioInput,
): ArenaInterleavingPortfolio {
  const items = input.matrix.scenarios.map(
    (scenario) =>
      compileArenaInterleavingAnalysis({
        scenario,
        arenaGenerations:
          input.arenaGenerations,
        ...(input.subjects === undefined
          ? {}
          : { subjects: input.subjects }),
        ...(input.maxSchedulesPerScenario ===
        undefined
          ? {}
          : {
              maxSchedules:
                input.maxSchedulesPerScenario,
            }),
        ...(input.maxExploredNodesPerScenario ===
        undefined
          ? {}
          : {
              maxExploredNodes:
                input.maxExploredNodesPerScenario,
            }),
      }),
  );

  return {
    schemaVersion: 1,
    scenarios: items.length,
    analyzed: items.filter(
      (item) => item.status === "analyzed",
    ).length,
    insufficientIdentity: items.filter(
      (item) =>
        item.status === "insufficient-identity",
    ).length,
    unsupported: items.filter(
      (item) => item.status === "unsupported",
    ).length,
    highRiskSchedules: items.reduce(
      (sum, item) =>
        sum +
        (item.analysis?.schedules.filter(
          (schedule) =>
            schedule.riskScore >= 4,
        ).length ?? 0),
      0,
    ),
    truncatedAnalyses: items.filter(
      (item) =>
        item.analysis?.truncated === true,
    ).length,
    items,
  };
}
