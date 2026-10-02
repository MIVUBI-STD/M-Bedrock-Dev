export type GameplayAuditScenarioKind =
  | "full-journey"
  | "solo"
  | "two-player"
  | "max-party"
  | "party-capacity-plus-one"
  | "multi-arena-parallel"
  | "arena-capacity-plus-one"
  | "disconnect-reconnect"
  | "reload-recovery"
  | "deferred-ownership"
  | "terminal-collision"
  | "repeated-run";

export type GameplayAuditScenarioProofMode =
  | "static-first"
  | "runtime-only-if-irreducible";

export interface GameplayAuditScenario {
  readonly id: string;
  readonly kind: GameplayAuditScenarioKind;
  readonly playerCount?: number;
  readonly concurrentArenas?: number;
  readonly proofMode: GameplayAuditScenarioProofMode;
  readonly reason: string;
  readonly questions: readonly string[];
}

export interface GameplayAuditScenarioPresetInput {
  readonly maxPartySize?: number;
  readonly arenaCount?: number;
  readonly concurrentArenaLimit?: number | null;
  readonly hasMultiArena?: boolean;
  readonly hasPersistence?: boolean;
  readonly hasDeferredWork?: boolean;
  readonly hasRepeatedRunSurface?: boolean;
}

export interface GameplayAuditScenarioPreset {
  readonly schemaVersion: 1;
  readonly policy: "selected-map-scenario-audit";
  readonly scenarios: readonly GameplayAuditScenario[];
}

function scenario(
  input: Omit<GameplayAuditScenario, "proofMode">,
): GameplayAuditScenario {
  return {
    ...input,
    proofMode: "static-first",
  };
}

export function buildGameplayAuditScenarioPreset(
  input: GameplayAuditScenarioPresetInput,
): GameplayAuditScenarioPreset {
  const scenarios: GameplayAuditScenario[] = [
    scenario({
      id: "journey:full",
      kind: "full-journey",
      reason:
        "Every audit must trace one complete player journey through cleanup and replay.",
      questions: [
        "Can every required gameplay stage be reached in order?",
        "Does each stage have a valid success, failure, and exit path?",
        "Does cleanup restore enough baseline state for another run?",
      ],
    }),
    scenario({
      id: "players:solo",
      kind: "solo",
      playerCount: 1,
      reason:
        "Solo play exposes hidden assumptions about party members, ownership, voting, wipe, rewards, and progression.",
      questions: [
        "Does any mechanic incorrectly assume another active player exists?",
        "Can one player start, fail, recover, finish, and replay normally?",
      ],
    }),
    scenario({
      id: "terminal:collision",
      kind: "terminal-collision",
      reason:
        "Terminal events commonly race with timers, death, cleanup, rewards, or delayed work.",
      questions: [
        "Can two terminal conditions become true in the same tick/window?",
        "Which owner wins and are all other pending mutations invalidated?",
        "Can reward, respawn, timeout, or cleanup commit after terminal ownership changes?",
      ],
    }),
  ];

  const maxParty =
    input.maxPartySize !== undefined &&
    input.maxPartySize > 0
      ? Math.floor(input.maxPartySize)
      : undefined;

  if (maxParty === undefined || maxParty >= 2) {
    scenarios.push(
      scenario({
        id: "players:two",
        kind: "two-player",
        playerCount: 2,
        reason:
          "Two-player play is the minimum useful mixed-player scenario for leave/death/ownership interactions.",
        questions: [
          "What changes when one player dies, disconnects, leaves, or finishes before the other?",
          "Are shared and per-player states separated correctly?",
        ],
      }),
      scenario({
        id: "players:disconnect-reconnect",
        kind: "disconnect-reconnect",
        playerCount: 2,
        reason:
          "Reconnect must preserve or intentionally reset ownership without creating stale active/offline composite states.",
        questions: [
          "What membership/state remains while one player is offline?",
          "Can offline membership block wipe, vote, reward, cleanup, or progression?",
          "Can reconnect bypass pending death/respawn/phase ownership?",
        ],
      }),
    );
  }

  if (maxParty !== undefined) {
    scenarios.push(
      scenario({
        id: "players:max",
        kind: "max-party",
        playerCount: maxParty,
        reason:
          "Maximum supported party size is a gameplay boundary and must preserve scaling, ownership, rewards, and progression.",
        questions: [
          "Do player-scoped and shared states remain isolated at maximum party size?",
          "Do enemy/reward/score/admission rules still match the gameplay contract?",
        ],
      }),
      scenario({
        id: "players:max-plus-one",
        kind: "party-capacity-plus-one",
        playerCount: maxParty + 1,
        reason:
          "Capacity+1 proves admission behavior instead of assuming a hard limit is valid because enforcement exists.",
        questions: [
          "Is the extra player rejected/queued by grounded design rather than implementation self-justification?",
          "Is the limitation visible and understandable to the player?",
        ],
      }),
    );
  }

  const arenaCount =
    input.arenaCount !== undefined &&
    input.arenaCount > 0
      ? Math.floor(input.arenaCount)
      : undefined;
  const limit =
    input.concurrentArenaLimit !== undefined &&
    input.concurrentArenaLimit !== null &&
    input.concurrentArenaLimit > 0
      ? Math.floor(input.concurrentArenaLimit)
      : undefined;

  if (
    input.hasMultiArena ||
    (arenaCount !== undefined && arenaCount > 1)
  ) {
    scenarios.push(
      scenario({
        id: "arena:parallel",
        kind: "multi-arena-parallel",
        concurrentArenas:
          arenaCount === undefined
            ? 2
            : Math.min(2, arenaCount),
        reason:
          "Parallel sessions expose global selectors, shared resources, stale cleanup, and cross-arena ownership leaks.",
        questions: [
          "Can an event in Arena A mutate players, entities, blocks, score, audio, messages, objectives, or cleanup in Arena B?",
          "Can both sessions start and progress independently?",
        ],
      }),
    );

    if (
      arenaCount !== undefined &&
      limit !== undefined &&
      limit < arenaCount
    ) {
      scenarios.push(
        scenario({
          id: "arena:capacity-plus-one",
          kind: "arena-capacity-plus-one",
          concurrentArenas: limit + 1,
          reason:
            "Visible arena capability exceeds implemented concurrency; queue/fallback existence alone cannot prove the reduction is intended.",
          questions: [
            "What independent selected-artifact evidence proves the lower concurrency limit is intended?",
            "If none exists, which player-visible capability is silently unavailable?",
            "Does the fallback merely keep the game operational while reducing designed capacity?",
          ],
        }),
      );
    }
  }

  if (input.hasPersistence) {
    scenarios.push(
      scenario({
        id: "recovery:reload",
        kind: "reload-recovery",
        reason:
          "Persisted sessions must reconstruct every material transient state needed to resume or intentionally restart gameplay.",
        questions: [
          "Which active state survives reload and which required timers/callbacks/actors do not?",
          "Can reload duplicate, skip, or reorder progression, death, objective, reward, or cleanup state?",
        ],
      }),
    );
  }

  if (input.hasDeferredWork) {
    scenarios.push(
      scenario({
        id: "temporal:deferred-owner",
        kind: "deferred-ownership",
        reason:
          "Deferred work can commit after its player/session/arena/phase owner has changed.",
        questions: [
          "What ownership revision existed when the callback was scheduled?",
          "Is ownership revalidated before mutation commits?",
          "Can cleanup, reuse, reconnect, reload, or phase transition happen first?",
        ],
      }),
    );
  }

  if (input.hasRepeatedRunSurface) {
    scenarios.push(
      scenario({
        id: "lifecycle:second-run",
        kind: "repeated-run",
        reason:
          "A successful first run does not prove cleanup; the second run exposes leaked entities, timers, score, inventory, structures, objectives, and ownership.",
        questions: [
          "After completion/abort, is the arena/session baseline actually restored?",
          "Can any callback or state from Run 1 mutate Run 2?",
          "Does Run 2 behave equivalently to a fresh run?",
        ],
      }),
    );
  }

  return {
    schemaVersion: 1,
    policy: "selected-map-scenario-audit",
    scenarios,
  };
}
