import {
  runtimeScopeContains,
  type RuntimeEvidenceRecord,
  type RuntimeScope,
} from "../../../project-model/src/index.js";
import type {
  MultiClientRuntimeAdapter,
  MultiClientScenario,
  MultiClientScenarioResult,
} from "./multi-client-orchestrator.js";

export interface LiveClientLifecycleSubject {
  playerKey: string;
  arenaId: string;
  arenaGeneration: number;
  connectionGeneration: number;
  participationGeneration: number;
  lifeGeneration: number;
}

export interface LiveClientReconnectPlan {
  schemaVersion: 1;
  scenario: MultiClientScenario;
  oldScope: RuntimeScope;
  newScope: RuntimeScope;
  requiredPredicates:
    readonly [
      "player-disconnected",
      "player-reconnected",
    ];
}

export interface LiveClientLifecycleProof {
  status:
    | "proven"
    | "insufficient"
    | "blocked";
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export type LiveClientRuntimeAdapter =
  MultiClientRuntimeAdapter & {
    proofAuthority: "live-runtime";
  };

export function buildLiveClientReconnectPlan(
  subject: LiveClientLifecycleSubject,
): LiveClientReconnectPlan {
  const newConnection =
    subject.connectionGeneration + 1;

  return {
    schemaVersion: 1,
    scenario: {
      schemaVersion: 1,
      id:
        "live-client-reconnect:" +
        subject.playerKey,
      clients: [{
        id: subject.playerKey,
        role: "subject",
      }],
      waves: [{
        id: "disconnect",
        mode: "serial",
        actions: [{
          id:
            "disconnect:" +
            subject.playerKey,
          clientId:
            subject.playerKey,
          actionId:
            "client.disconnect",
          parameters: {
            arenaId:
              subject.arenaId,
            arenaGeneration:
              subject.arenaGeneration,
            connectionGeneration:
              subject.connectionGeneration,
          },
        }],
      }, {
        id: "wait-disconnected",
        mode: "serial",
        actions: [{
          id:
            "wait-disconnected:" +
            subject.playerKey,
          clientId:
            subject.playerKey,
          actionId:
            "client.wait-disconnected",
          parameters: {
            connectionGeneration:
              subject.connectionGeneration,
          },
        }],
      }, {
        id: "reconnect",
        mode: "serial",
        actions: [{
          id:
            "reconnect:" +
            subject.playerKey,
          clientId:
            subject.playerKey,
          actionId:
            "client.reconnect",
          parameters: {
            arenaId:
              subject.arenaId,
            arenaGeneration:
              subject.arenaGeneration,
            previousConnectionGeneration:
              subject.connectionGeneration,
            connectionGeneration:
              newConnection,
            participationGeneration:
              subject.participationGeneration +
              1,
            lifeGeneration:
              subject.lifeGeneration,
          },
        }],
      }, {
        id: "wait-reconnected",
        mode: "serial",
        actions: [{
          id:
            "wait-reconnected:" +
            subject.playerKey,
          clientId:
            subject.playerKey,
          actionId:
            "client.wait-reconnected",
          parameters: {
            connectionGeneration:
              newConnection,
          },
        }],
      }],
    },
    oldScope: {
      playerKey:
        subject.playerKey,
      arenaId:
        subject.arenaId,
      arenaGeneration:
        subject.arenaGeneration,
      connectionGeneration:
        subject.connectionGeneration,
    },
    newScope: {
      playerKey:
        subject.playerKey,
      arenaId:
        subject.arenaId,
      arenaGeneration:
        subject.arenaGeneration,
      connectionGeneration:
        newConnection,
      participationGeneration:
        subject.participationGeneration +
        1,
      lifeGeneration:
        subject.lifeGeneration,
    },
    requiredPredicates: [
      "player-disconnected",
      "player-reconnected",
    ],
  };
}

function observedLiveEvidence(
  evidence:
    readonly RuntimeEvidenceRecord[],
  predicate: string,
  scope: RuntimeScope,
): RuntimeEvidenceRecord[] {
  return evidence.filter(
    (record) =>
      record.predicate === predicate &&
      record.state === "present" &&
      record.confidence === "observed" &&
      record.proofAuthority ===
        "live-runtime" &&
      runtimeScopeContains(
        record.scope,
        scope,
      ),
  );
}

export function evaluateLiveClientReconnectProof(
  plan: LiveClientReconnectPlan,
  result: MultiClientScenarioResult,
): LiveClientLifecycleProof {
  if (
    result.proofAuthority !==
    "live-runtime"
  ) {
    return {
      status: "blocked",
      evidenceIds: [],
      reasons: [
        "Reconnect proof requires a live-runtime multi-client adapter; server-simulated/test-only execution is not sufficient.",
      ],
    };
  }

  if (result.status !== "completed") {
    return {
      status: "insufficient",
      evidenceIds:
        result.evidenceIds,
      reasons: [
        "Live-client scenario did not complete successfully: " +
          result.status +
          ".",
        ...result.reasons,
      ],
    };
  }

  const disconnected =
    observedLiveEvidence(
      result.evidence,
      "player-disconnected",
      plan.oldScope,
    );
  const reconnected =
    observedLiveEvidence(
      result.evidence,
      "player-reconnected",
      plan.newScope,
    );

  if (
    disconnected.length === 0 ||
    reconnected.length === 0
  ) {
    return {
      status: "insufficient",
      evidenceIds:
        result.evidenceIds,
      reasons: [
        disconnected.length === 0
          ? "Observed live-runtime disconnect evidence is missing for the old connection generation."
          : "Observed live-runtime disconnect evidence is present.",
        reconnected.length === 0
          ? "Observed live-runtime reconnect evidence is missing for the new connection generation."
          : "Observed live-runtime reconnect evidence is present.",
      ],
    };
  }

  return {
    status: "proven",
    evidenceIds:
      result.evidenceIds,
    reasons: [
      "Independent live-client execution observed disconnect on the old connection generation and reconnect on the new generation.",
    ],
  };
}

export function assertLiveClientAdapter(
  adapter: MultiClientRuntimeAdapter,
): asserts adapter is LiveClientRuntimeAdapter {
  if (
    adapter.proofAuthority !==
    "live-runtime"
  ) {
    throw new Error(
      "Live client lifecycle adapter must declare proofAuthority=live-runtime.",
    );
  }
}
