import type { SessionAction } from "../../reliability/src/index.js";
import type { OperationFootprint, ScheduledOperation } from "./interleaving.js";

function playerResource(playerId: string): string {
  return `player:${playerId}`;
}

function arenaResource(arenaId: string): string {
  return `arena:${arenaId}`;
}

export function sessionActionFootprint(
  action: SessionAction,
): OperationFootprint {
  if (action.kind === "assign") {
    return {
      reads: [playerResource(action.playerId), arenaResource(action.arenaId)],
      writes: [playerResource(action.playerId), "arena-membership:*", arenaResource(action.arenaId)],
    };
  }

  if (
    action.kind === "start" ||
    action.kind === "begin-playing" ||
    action.kind === "disconnect" ||
    action.kind === "reconnect"
  ) {
    return {
      reads: [playerResource(action.playerId), "arena-membership:*"],
      writes: [playerResource(action.playerId), "arena-session:*"],
    };
  }

  if (action.kind === "progress" || action.kind === "complete" || action.kind === "join") {
    return {
      reads: [playerResource(action.playerId)],
      writes: [playerResource(action.playerId)],
    };
  }

  return {
    reads: [arenaResource(action.arenaId), "arena-membership:*"],
    writes: [arenaResource(action.arenaId), "arena-session:*"],
  };
}

export function scheduledSessionActions(
  actions: readonly SessionAction[],
): ScheduledOperation<SessionAction>[] {
  return actions.map((action, index) => ({
    id: `op-${String(index).padStart(4, "0")}-${action.kind}`,
    value: action,
    footprint: sessionActionFootprint(action),
  }));
}
