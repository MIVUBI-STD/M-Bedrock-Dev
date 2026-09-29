import type {
  MultiplayerStressScenario,
} from "../../reliability/src/index.js";
import {
  analyzeMultiplayerInterleavings,
  type MultiplayerInterleavingAnalysis,
  type MultiplayerInterleavingEvent,
} from "../../reliability-search/src/index.js";

export interface ArenaInterleavingSubject {
  playerId: string;
  arenaId: string;
  arenaGeneration: number;
  connectionGeneration: number;
  participationGeneration: number;
  lifeGeneration: number;
}

export interface ArenaInterleavingCompilationInput {
  scenario: MultiplayerStressScenario;
  arenaGenerations: Readonly<Record<string, number>>;
  subjects?: Readonly<Record<string, ArenaInterleavingSubject>>;
  maxSchedules?: number;
  maxExploredNodes?: number;
}

export interface ArenaInterleavingCompilation {
  schemaVersion: 1;
  scenarioId: string;
  status: "analyzed" | "insufficient-identity" | "unsupported";
  reasons: readonly string[];
  events: readonly MultiplayerInterleavingEvent[];
  analysis?: MultiplayerInterleavingAnalysis;
}

function arenaGeneration(
  input: ArenaInterleavingCompilationInput,
  arenaId: string,
): number | undefined {
  const generation =
    input.arenaGenerations[arenaId];
  return (
    typeof generation === "number" &&
    Number.isInteger(generation) &&
    generation >= 0
  )
    ? generation
    : undefined;
}

function subject(
  input: ArenaInterleavingCompilationInput,
  playerId: string,
): ArenaInterleavingSubject | undefined {
  return input.subjects?.[playerId];
}

function event(
  id: string,
  kind: MultiplayerInterleavingEvent["kind"],
  values: Omit<
    MultiplayerInterleavingEvent,
    "id" | "kind"
  > = {},
): MultiplayerInterleavingEvent {
  return { id, kind, ...values };
}

function subjectEvents(
  item: ArenaInterleavingSubject,
): Pick<
  MultiplayerInterleavingEvent,
  | "arenaId"
  | "playerId"
  | "arenaGeneration"
  | "connectionGeneration"
  | "participationGeneration"
  | "lifeGeneration"
> {
  return {
    arenaId: item.arenaId,
    playerId: item.playerId,
    arenaGeneration:
      item.arenaGeneration,
    connectionGeneration:
      item.connectionGeneration,
    participationGeneration:
      item.participationGeneration,
    lifeGeneration:
      item.lifeGeneration,
  };
}

function compileEvents(
  input: ArenaInterleavingCompilationInput,
): {
  status: ArenaInterleavingCompilation["status"];
  reasons: string[];
  events: MultiplayerInterleavingEvent[];
} {
  const scenario = input.scenario;
  const primaryArena = scenario.arenaIds[0];
  const primaryGeneration =
    primaryArena === undefined
      ? undefined
      : arenaGeneration(input, primaryArena);

  if (
    primaryArena === undefined ||
    primaryGeneration === undefined
  ) {
    return {
      status: "insufficient-identity",
      reasons: [
        "Interleaving analysis requires explicit arena generation identity.",
      ],
      events: [],
    };
  }

  const arenaBase = {
    arenaId: primaryArena,
    arenaGeneration: primaryGeneration,
  };

  if (
    scenario.kind === "disconnect-during-setup" ||
    scenario.kind === "disconnect-during-active" ||
    scenario.kind === "death-during-join" ||
    scenario.kind === "reconnect-after-disconnect"
  ) {
    const playerId = scenario.playerIds[0];
    const item =
      playerId === undefined
        ? undefined
        : subject(input, playerId);
    if (!item) {
      return {
        status: "insufficient-identity",
        reasons: [
          "Player lifecycle interleaving requires explicit connection, participation, and life generation identity.",
        ],
        events: [],
      };
    }

    const base = subjectEvents(item);
    const joinRequest = event(
      scenario.id + ":join-request",
      "join-request",
      base,
    );
    const membership = event(
      scenario.id + ":membership",
      "membership-commit",
      {
        ...base,
        parentEventIds: [joinRequest.id],
      },
    );

    if (
      scenario.kind === "disconnect-during-setup"
    ) {
      return {
        status: "analyzed",
        reasons: [
          "Models disconnect racing membership/start work during setup.",
        ],
        events: [
          joinRequest,
          membership,
          event(
            scenario.id + ":start-request",
            "start-request",
            {
              ...base,
              parentEventIds: [membership.id],
            },
          ),
          event(
            scenario.id + ":disconnect",
            "disconnect",
            base,
          ),
          event(
            scenario.id + ":callback",
            "deferred-callback",
            base,
          ),
        ],
      };
    }

    if (
      scenario.kind === "disconnect-during-active"
    ) {
      const startRequest = event(
        scenario.id + ":start-request",
        "start-request",
        {
          ...base,
          parentEventIds: [membership.id],
        },
      );
      return {
        status: "analyzed",
        reasons: [
          "Models disconnect racing active-session deferred work.",
        ],
        events: [
          joinRequest,
          membership,
          startRequest,
          event(
            scenario.id + ":start-commit",
            "start-commit",
            {
              ...base,
              parentEventIds: [
                startRequest.id,
              ],
            },
          ),
          event(
            scenario.id + ":disconnect",
            "disconnect",
            base,
          ),
          event(
            scenario.id + ":callback",
            "deferred-callback",
            base,
          ),
        ],
      };
    }

    if (
      scenario.kind === "death-during-join"
    ) {
      return {
        status: "analyzed",
        reasons: [
          "Models death/life-generation change racing pending join work.",
        ],
        events: [
          joinRequest,
          event(
            scenario.id + ":death",
            "death",
            base,
          ),
          event(
            scenario.id + ":callback",
            "deferred-callback",
            base,
          ),
          event(
            scenario.id + ":respawn",
            "respawn",
            base,
          ),
        ],
      };
    }

    return {
      status: "analyzed",
      reasons: [
        "Models disconnect/reconnect generation turnover racing stale deferred work.",
      ],
      events: [
        event(
          scenario.id + ":disconnect",
          "disconnect",
          base,
        ),
        event(
          scenario.id + ":callback",
          "deferred-callback",
          base,
        ),
        event(
          scenario.id + ":reconnect",
          "reconnect",
          {
            ...base,
            connectionGeneration:
              item.connectionGeneration + 1,
          },
        ),
      ],
    };
  }

  if (
    scenario.kind === "cleanup-start-overlap"
  ) {
    const startingArena =
      scenario.arenaIds[1];
    const startingGeneration =
      startingArena === undefined
        ? undefined
        : arenaGeneration(
            input,
            startingArena,
          );

    if (
      startingArena === undefined ||
      startingGeneration === undefined
    ) {
      return {
        status: "insufficient-identity",
        reasons: [
          "Cleanup/start overlap requires generation identity for both arenas.",
        ],
        events: [],
      };
    }

    const cleanupBegin = event(
      scenario.id + ":cleanup-begin",
      "cleanup-begin",
      arenaBase,
    );
    return {
      status: "analyzed",
      reasons: [
        "Models cleanup/reuse overlap across two arena generations.",
      ],
      events: [
        cleanupBegin,
        event(
          scenario.id + ":cleanup-complete",
          "cleanup-complete",
          {
            ...arenaBase,
            parentEventIds: [
              cleanupBegin.id,
            ],
          },
        ),
        event(
          scenario.id + ":start-request",
          "start-request",
          {
            arenaId: startingArena,
            arenaGeneration:
              startingGeneration,
          },
        ),
        event(
          scenario.id + ":arena-reuse",
          "arena-reuse",
          {
            arenaId: startingArena,
            arenaGeneration:
              startingGeneration,
          },
        ),
      ],
    };
  }

  if (
    scenario.kind ===
    "simultaneous-all-arena-start"
  ) {
    const events: MultiplayerInterleavingEvent[] = [];
    for (const arenaId of scenario.arenaIds) {
      const generation =
        arenaGeneration(input, arenaId);
      if (generation === undefined) {
        return {
          status: "insufficient-identity",
          reasons: [
            "All-arena start analysis requires generation identity for every arena.",
          ],
          events: [],
        };
      }
      const request = event(
        scenario.id + ":" + arenaId + ":request",
        "start-request",
        {
          arenaId,
          arenaGeneration: generation,
        },
      );
      events.push(
        request,
        event(
          scenario.id + ":" + arenaId + ":commit",
          "start-commit",
          {
            arenaId,
            arenaGeneration: generation,
            parentEventIds: [request.id],
          },
        ),
      );
    }
    return {
      status: "analyzed",
      reasons: [
        "Models independent per-arena start ownership under near-simultaneous scheduling.",
      ],
      events,
    };
  }

  return {
    status: "unsupported",
    reasons: [
      "Stress scenario remains covered by the existing runtime stress matrix; no bounded interleaving adapter is required yet.",
    ],
    events: [],
  };
}

export function compileArenaInterleavingAnalysis(
  input: ArenaInterleavingCompilationInput,
): ArenaInterleavingCompilation {
  const compiled = compileEvents(input);
  if (compiled.status !== "analyzed") {
    return {
      schemaVersion: 1,
      scenarioId: input.scenario.id,
      ...compiled,
    };
  }

  return {
    schemaVersion: 1,
    scenarioId: input.scenario.id,
    ...compiled,
    analysis:
      analyzeMultiplayerInterleavings(
        compiled.events,
        {
          ...(input.maxSchedules === undefined
            ? {}
            : {
                maxSchedules:
                  input.maxSchedules,
              }),
          ...(input.maxExploredNodes === undefined
            ? {}
            : {
                maxExploredNodes:
                  input.maxExploredNodes,
              }),
        },
      ),
  };
}
