import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";

export type MultiplayerParticipantState =
  | "active"
  | "dead"
  | "respawning"
  | "reconnecting"
  | "spectator"
  | "leaving";

export interface MultiplayerStateScenario {
  readonly id: string;
  readonly participants:
    readonly MultiplayerParticipantState[];
  readonly trigger: string;
  readonly verify: readonly string[];
  readonly reason: string;
}

export interface MultiplayerStateValidationPlan {
  readonly applicable: boolean;
  readonly detectedSignals: readonly string[];
  readonly scenarios:
    readonly MultiplayerStateScenario[];
}

function has(
  model: GameplayIntentModel,
  pattern: RegExp,
): boolean {
  return model.nodes.some(
    (node) =>
      pattern.test(node.id) ||
      pattern.test(node.label),
  );
}

export function deriveMultiplayerStateValidationPlan(
  model: GameplayIntentModel,
): MultiplayerStateValidationPlan {
  const multiplayer =
    has(
      model,
      /(?:player|players|party|team|membership|arena|session)/i,
    );
  if (!multiplayer) {
    return {
      applicable: false,
      detectedSignals: [],
      scenarios: [],
    };
  }

  const detectedSignals: string[] = [];
  const scenarios: MultiplayerStateScenario[] = [];

  const death = has(
    model,
    /(?:dead|death|downed|revive)/i,
  );
  const respawn = has(
    model,
    /respawn/i,
  );
  const reconnect = has(
    model,
    /reconnect|disconnect|session/i,
  );
  const spectator = has(
    model,
    /spectator|spectating/i,
  );
  const leave = has(
    model,
    /leave|membership|disconnect/i,
  );

  if (death) detectedSignals.push("death");
  if (respawn) detectedSignals.push("respawn");
  if (reconnect) detectedSignals.push("reconnect");
  if (spectator) detectedSignals.push("spectator");
  if (leave) detectedSignals.push("leave");

  if (death) {
    scenarios.push({
      id: "mixed:active-dead",
      participants: ["active", "dead"],
      trigger:
        "Keep one participant active while another enters the dead/downed state.",
      verify: [
        "Active participant progression remains valid.",
        "Dead/downed participant is excluded or included only according to the gameplay contract.",
        "Shared objectives and terminal conditions do not resolve from the wrong participant predicate.",
      ],
      reason:
        "Mixed life states frequently expose incorrect active-player predicates.",
    });
  }

  if (respawn) {
    scenarios.push({
      id: "mixed:active-respawning",
      participants: [
        "active",
        "respawning",
      ],
      trigger:
        "Keep one participant in active gameplay while another is inside the respawn window.",
      verify: [
        "Respawning participant does not duplicate loadout/reward/state restoration.",
        "Active participant gameplay continues without state leakage.",
      ],
      reason:
        "Respawn windows combine transient player state with shared match state.",
    });
  }

  if (reconnect) {
    scenarios.push({
      id: "mixed:active-reconnecting",
      participants: [
        "active",
        "reconnecting",
      ],
      trigger:
        "Disconnect and reconnect one participant while another remains active.",
      verify: [
        "Reconnect creates the intended fresh/current session ownership.",
        "Old delayed callbacks cannot mutate the current match.",
        "The remaining participant does not lose arena/session ownership.",
      ],
      reason:
        "Reconnect is a high-risk generation and ownership boundary.",
    });
  }

  if (spectator) {
    scenarios.push({
      id: "mixed:active-spectator",
      participants: [
        "active",
        "spectator",
      ],
      trigger:
        "Place one participant in spectator state while another remains active.",
      verify: [
        "Spectator is not counted as active/alive unless explicitly designed.",
        "Spectator cannot trigger gameplay interactions reserved for active participants.",
      ],
      reason:
        "Spectator state often leaks into participant predicates and interactions.",
    });
  }

  if (leave) {
    scenarios.push({
      id: "mixed:active-leaving",
      participants: [
        "active",
        "leaving",
      ],
      trigger:
        "Have one participant leave during an active match while another remains.",
      verify: [
        "Arena membership and ownership are reconciled exactly once.",
        "Remaining participants are not forced into stale queue/session state.",
        "Cleanup does not release resources still owned by the active session.",
      ],
      reason:
        "Mid-match leave combines membership mutation with shared arena lifecycle.",
    });
  }

  return {
    applicable: true,
    detectedSignals,
    scenarios,
  };
}
