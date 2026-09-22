import {
  checkSessionInvariants,
  runSessionSequence,
  type MultiplayerSessionModel,
  type SessionAction,
  type SessionInvariantViolation,
} from "../../reliability/src/index.js";
import { normalizeCoverage } from "./coverage.js";
import type {
  CoverageFeature,
  SearchEvaluation,
} from "./types.js";
import type { CoverageSearchDomain } from "./guided-search.js";

export interface SessionSearchInput {
  arenaIds: readonly string[];
  actions: readonly SessionAction[];
}

function stablePlayerState(model: MultiplayerSessionModel): string {
  return Object.values(model.players)
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((player) =>
      [
        player.playerId,
        player.connected ? "1" : "0",
        player.arenaId ?? "-",
        player.phase,
        String(player.progress),
      ].join("|"),
    )
    .join(";");
}

function stableArenaState(model: MultiplayerSessionModel): string {
  return Object.values(model.arenas)
    .sort((a, b) => a.arenaId.localeCompare(b.arenaId))
    .map((arena) =>
      [
        arena.arenaId,
        [...arena.activePlayerIds].sort().join(","),
        arena.cutsceneActive ? "1" : "0",
        String(arena.round),
      ].join("|"),
    )
    .join(";");
}

function actionKey(action: SessionAction): string {
  if ("playerId" in action && "arenaId" in action) {
    return `${action.kind}:${action.playerId}:${action.arenaId}`;
  }
  if ("playerId" in action) return `${action.kind}:${action.playerId}`;
  return `${action.kind}:${action.arenaId}`;
}

export function sessionSemanticCoverage(
  input: SessionSearchInput,
): SearchEvaluation<SessionInvariantViolation[]> {
  const run = runSessionSequence(input.arenaIds, input.actions);
  const features: CoverageFeature[] = [];
  let previousState = "initial";
  let previousAction: SessionAction | undefined;

  for (const step of run.steps) {
    const state = `P[${stablePlayerState(step.model)}]A[${stableArenaState(step.model)}]`;
    features.push({ dimension: "state", key: state });
    features.push({
      dimension: "transition",
      key: `${previousState}=>${actionKey(step.action)}=>${state}`,
    });

    if (previousAction) {
      features.push({
        dimension: "action-pair",
        key: `${actionKey(previousAction)}=>${actionKey(step.action)}`,
      });
    }

    const activeArenas = Object.values(step.model.arenas)
      .filter((arena) => arena.activePlayerIds.length > 0 || arena.cutsceneActive)
      .map((arena) => arena.arenaId)
      .sort();
    if (activeArenas.length > 1) {
      features.push({
        dimension: "interaction",
        key: `active-arenas:${activeArenas.join("+")}`,
      });
    }

    for (const violation of step.violations) {
      features.push({
        dimension: "invariant",
        key: violation.invariantId,
      });
    }

    previousState = state;
    previousAction = step.action;
  }

  const finalViolations = checkSessionInvariants(run.finalModel);
  return {
    coverage: normalizeCoverage(features),
    failed: finalViolations.length > 0 || !run.ok,
    ...(finalViolations.length > 0
      ? { failure: finalViolations }
      : run.firstViolation
        ? { failure: run.firstViolation.violations }
        : {}),
  };
}

function removeEach<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [];
  return items.map((_, index) => items.filter((__, itemIndex) => itemIndex !== index));
}

function swapAdjacent<T>(items: readonly T[]): T[][] {
  const results: T[][] = [];
  for (let index = 0; index + 1 < items.length; index += 1) {
    const copy = [...items];
    [copy[index], copy[index + 1]] = [copy[index + 1]!, copy[index]!];
    results.push(copy);
  }
  return results;
}

export const sessionCoverageSearchDomain: CoverageSearchDomain<
  SessionSearchInput,
  SessionInvariantViolation[]
> = {
  evaluate: sessionSemanticCoverage,
  mutate(input) {
    const variants = [
      ...removeEach(input.actions),
      ...swapAdjacent(input.actions),
    ];
    return variants.map((actions) => ({
      arenaIds: input.arenaIds,
      actions,
    }));
  },
};
