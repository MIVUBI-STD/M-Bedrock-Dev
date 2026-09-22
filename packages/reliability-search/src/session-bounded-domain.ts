import {
  applySessionAction,
  checkSessionInvariants,
  createSessionModel,
  type MultiplayerSessionModel,
  type SessionAction,
  type SessionInvariantViolation,
} from "../../reliability/src/index.js";
import type { BoundedExplorerDomain } from "./bounded-explorer.js";
import { sessionStateIdentity } from "./state-identity.js";

export interface SessionBoundedDomainConfig {
  playerIds: readonly string[];
  arenaIds: readonly string[];
  progressAmounts?: readonly number[];
}

function actionKey(action: SessionAction): string {
  if ("playerId" in action && "arenaId" in action) {
    return `${action.kind}:${action.playerId}:${action.arenaId}`;
  }
  if ("playerId" in action && "amount" in action) {
    return `${action.kind}:${action.playerId}:${action.amount}`;
  }
  if ("playerId" in action) return `${action.kind}:${action.playerId}`;
  return `${action.kind}:${action.arenaId}`;
}

export function createSessionBoundedDomain(
  config: SessionBoundedDomainConfig,
): BoundedExplorerDomain<
  MultiplayerSessionModel,
  SessionAction,
  SessionInvariantViolation[]
> {
  const progressAmounts = config.progressAmounts ?? [1];

  return {
    initialState: () => createSessionModel(config.arenaIds),
    stateId: sessionStateIdentity,
    actionKey,
    actions() {
      const actions: SessionAction[] = [];

      for (const playerId of config.playerIds) {
        actions.push(
          { kind: "join", playerId },
          { kind: "start", playerId },
          { kind: "begin-playing", playerId },
          { kind: "complete", playerId },
          { kind: "disconnect", playerId },
          { kind: "reconnect", playerId },
        );

        for (const arenaId of config.arenaIds) {
          actions.push({ kind: "assign", playerId, arenaId });
        }

        for (const amount of progressAmounts) {
          actions.push({ kind: "progress", playerId, amount });
        }
      }

      for (const arenaId of config.arenaIds) {
        actions.push({ kind: "reset-arena", arenaId });
      }

      return actions;
    },
    apply: applySessionAction,
    check(state) {
      const violations = checkSessionInvariants(state);
      return violations.length > 0 ? violations : undefined;
    },
  };
}
