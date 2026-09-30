import type {
  SessionAction,
} from "../../reliability/src/index.js";
import type {
  OperationFootprint,
  ScheduledOperation,
} from "./interleaving.js";

function playerResource(
  playerId: string,
): string {
  return "player:" + playerId;
}

function arenaResource(
  arenaId: string,
): string {
  return "arena:" + arenaId;
}

export function sessionActionFootprint(
  action: SessionAction,
): OperationFootprint {
  if (action.kind === "assign") {
    return {
      reads: [
        playerResource(action.playerId),
        arenaResource(action.arenaId),
      ],
      writes: [
        playerResource(action.playerId),
        "arena-membership:*",
        arenaResource(action.arenaId),
      ],
      semanticSurfaces: [
        "event-ordering",
      ],
    };
  }

  if (
    action.kind === "start" ||
    action.kind === "begin-playing"
  ) {
    return {
      reads: [
        playerResource(action.playerId),
        "arena-membership:*",
      ],
      writes: [
        playerResource(action.playerId),
        "arena-session:*",
      ],
      semanticSurfaces: [
        "event-ordering",
        "deferred-callback-order",
        "chunk-residency",
      ],
    };
  }

  if (
    action.kind === "disconnect" ||
    action.kind === "reconnect"
  ) {
    return {
      reads: [
        playerResource(action.playerId),
        "arena-membership:*",
      ],
      writes: [
        playerResource(action.playerId),
        "arena-session:*",
      ],
      semanticSurfaces: [
        "network-input-order",
        "event-ordering",
      ],
    };
  }

  if (
    action.kind === "progress" ||
    action.kind === "complete"
  ) {
    return {
      reads: [
        playerResource(action.playerId),
      ],
      writes: [
        playerResource(action.playerId),
      ],
      semanticSurfaces: [
        "tick-scheduling",
      ],
    };
  }

  if (action.kind === "join") {
    return {
      reads: [
        playerResource(action.playerId),
      ],
      writes: [
        playerResource(action.playerId),
      ],
      semanticSurfaces: [
        "network-input-order",
        "event-ordering",
      ],
    };
  }

  return {
    reads: [
      arenaResource(action.arenaId),
      "arena-membership:*",
    ],
    writes: [
      arenaResource(action.arenaId),
      "arena-session:*",
    ],
    semanticSurfaces: [
      "event-ordering",
      "deferred-callback-order",
    ],
  };
}

export function scheduledSessionActions(
  actions: readonly SessionAction[],
): ScheduledOperation<SessionAction>[] {
  return actions.map((action, index) => ({
    id:
      "op-" +
      String(index).padStart(4, "0") +
      "-" +
      action.kind,
    value: action,
    footprint:
      sessionActionFootprint(action),
  }));
}
