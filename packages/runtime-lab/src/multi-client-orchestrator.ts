import type {
  RuntimeExperimentArm,
  RuntimeExperimentDefinition,
} from "./types.js";

export interface MultiClientLogicalClient {
  id: string;
  role?: string;
}

export interface MultiClientWaveAction {
  id: string;
  clientId: string;
  actionId: string;
  parameters?: Readonly<
    Record<string, string | number | boolean>
  >;
}

export interface MultiClientWave {
  id: string;
  mode: "serial" | "parallel";
  actions:
    readonly MultiClientWaveAction[];
}

export interface MultiClientScenario {
  schemaVersion: 1;
  id: string;
  clients:
    readonly MultiClientLogicalClient[];
  waves: readonly MultiClientWave[];
}

export interface MultiClientActionObservation {
  evidenceIds: readonly string[];
  runtimeTick?: number;
}

export interface MultiClientRuntimeAdapter {
  readonly adapterId: string;
  readonly maxClients: number;
  execute(
    client: MultiClientLogicalClient,
    action:
      MultiClientWaveAction,
  ): Promise<
    MultiClientActionObservation
  >;
}

export interface MultiClientWaveResult {
  waveId: string;
  mode: MultiClientWave["mode"];
  completedActionIds:
    readonly string[];
  failedActionIds:
    readonly string[];
  evidenceIds: readonly string[];
  startTick?: number;
  endTick?: number;
}

export interface MultiClientScenarioResult {
  scenarioId: string;
  adapterId: string;
  status:
    | "completed"
    | "failed"
    | "blocked";
  requiredClients: number;
  waveResults:
    readonly MultiClientWaveResult[];
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

function uniqueNonEmpty(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value) =>
          value.trim().length > 0,
      ),
    ),
  ].sort();
}

export function validateMultiClientScenario(
  scenario: MultiClientScenario,
): string[] {
  const errors: string[] = [];

  if (scenario.schemaVersion !== 1) {
    errors.push(
      "Multi-client scenario schemaVersion must be 1.",
    );
  }
  if (!scenario.id.trim()) {
    errors.push(
      "Multi-client scenario id must be non-empty.",
    );
  }

  const clientIds =
    scenario.clients.map(
      (client) => client.id,
    );
  if (
    uniqueNonEmpty(clientIds).length !==
    clientIds.length
  ) {
    errors.push(
      "Multi-client scenario client ids must be unique and non-empty.",
    );
  }
  const knownClients =
    new Set(clientIds);

  const waveIds =
    new Set<string>();
  const actionIds =
    new Set<string>();

  for (const wave of scenario.waves) {
    if (!wave.id.trim()) {
      errors.push(
        "Multi-client wave id must be non-empty.",
      );
    }
    if (waveIds.has(wave.id)) {
      errors.push(
        "Duplicate multi-client wave id: " +
          wave.id +
          ".",
      );
    }
    waveIds.add(wave.id);

    if (wave.actions.length === 0) {
      errors.push(
        "Multi-client wave " +
          wave.id +
          " requires at least one action.",
      );
    }

    const parallelClients =
      new Set<string>();

    for (
      const action of wave.actions
    ) {
      if (!action.id.trim()) {
        errors.push(
          "Multi-client action id must be non-empty.",
        );
      }
      if (actionIds.has(action.id)) {
        errors.push(
          "Duplicate multi-client action id: " +
            action.id +
            ".",
        );
      }
      actionIds.add(action.id);

      if (
        !knownClients.has(
          action.clientId,
        )
      ) {
        errors.push(
          "Multi-client action " +
            action.id +
            " references unknown client " +
            action.clientId +
            ".",
        );
      }

      if (
        wave.mode === "parallel"
      ) {
        if (
          parallelClients.has(
            action.clientId,
          )
        ) {
          errors.push(
            "Parallel wave " +
              wave.id +
              " schedules more than one concurrent action for client " +
              action.clientId +
              ".",
          );
        }
        parallelClients.add(
          action.clientId,
        );
      }
    }
  }

  return errors;
}

async function executeOne(
  adapter:
    MultiClientRuntimeAdapter,
  clients:
    ReadonlyMap<
      string,
      MultiClientLogicalClient
    >,
  action:
    MultiClientWaveAction,
): Promise<{
  actionId: string;
  ok: boolean;
  observation?:
    MultiClientActionObservation;
  error?: string;
}> {
  const client =
    clients.get(action.clientId);
  if (!client) {
    return {
      actionId: action.id,
      ok: false,
      error:
        "Unknown client: " +
        action.clientId,
    };
  }

  try {
    const observation =
      await adapter.execute(
        client,
        action,
      );
    return {
      actionId: action.id,
      ok: true,
      observation,
    };
  } catch (error) {
    return {
      actionId: action.id,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

function waveResult(
  wave: MultiClientWave,
  executions:
    readonly Awaited<
      ReturnType<typeof executeOne>
    >[],
): MultiClientWaveResult {
  const observations =
    executions.flatMap(
      (item) =>
        item.observation
          ? [item.observation]
          : [],
    );
  const ticks =
    observations
      .map(
        (item) =>
          item.runtimeTick,
      )
      .filter(
        (value):
          value is number =>
          value !== undefined,
      );

  return {
    waveId: wave.id,
    mode: wave.mode,
    completedActionIds:
      executions
        .filter(
          (item) => item.ok,
        )
        .map(
          (item) =>
            item.actionId,
        ),
    failedActionIds:
      executions
        .filter(
          (item) => !item.ok,
        )
        .map(
          (item) =>
            item.actionId,
        ),
    evidenceIds:
      uniqueNonEmpty(
        observations.flatMap(
          (item) =>
            item.evidenceIds,
        ),
      ),
    ...(ticks.length === 0
      ? {}
      : {
          startTick:
            Math.min(...ticks),
          endTick:
            Math.max(...ticks),
        }),
  };
}

export async function executeMultiClientScenario(
  scenario: MultiClientScenario,
  adapter:
    MultiClientRuntimeAdapter,
): Promise<
  MultiClientScenarioResult
> {
  const errors =
    validateMultiClientScenario(
      scenario,
    );

  if (errors.length > 0) {
    return {
      scenarioId: scenario.id,
      adapterId:
        adapter.adapterId,
      status: "blocked",
      requiredClients:
        scenario.clients.length,
      waveResults: [],
      evidenceIds: [],
      reasons: errors,
    };
  }

  if (
    !adapter.adapterId.trim() ||
    !Number.isInteger(
      adapter.maxClients,
    ) ||
    adapter.maxClients < 1
  ) {
    return {
      scenarioId: scenario.id,
      adapterId:
        adapter.adapterId,
      status: "blocked",
      requiredClients:
        scenario.clients.length,
      waveResults: [],
      evidenceIds: [],
      reasons: [
        "Multi-client runtime adapter identity/maxClients is invalid.",
      ],
    };
  }

  if (
    scenario.clients.length >
    adapter.maxClients
  ) {
    return {
      scenarioId: scenario.id,
      adapterId:
        adapter.adapterId,
      status: "blocked",
      requiredClients:
        scenario.clients.length,
      waveResults: [],
      evidenceIds: [],
      reasons: [
        "Scenario requires " +
          String(
            scenario.clients.length,
          ) +
          " logical clients but adapter supports " +
          String(
            adapter.maxClients,
          ) +
          ".",
      ],
    };
  }

  const clients =
    new Map(
      scenario.clients.map(
        (client) => [
          client.id,
          client,
        ],
      ),
    );
  const waveResults:
    MultiClientWaveResult[] = [];

  for (const wave of scenario.waves) {
    const executions =
      wave.mode === "parallel"
        ? await Promise.all(
            wave.actions.map(
              (action) =>
                executeOne(
                  adapter,
                  clients,
                  action,
                ),
            ),
          )
        : [];

    if (wave.mode === "serial") {
      for (
        const action of
          wave.actions
      ) {
        executions.push(
          await executeOne(
            adapter,
            clients,
            action,
          ),
        );

        if (
          executions.at(-1)
            ?.ok === false
        ) {
          break;
        }
      }
    }

    const result =
      waveResult(
        wave,
        executions,
      );
    waveResults.push(result);

    if (
      result.failedActionIds
        .length > 0
    ) {
      return {
        scenarioId:
          scenario.id,
        adapterId:
          adapter.adapterId,
        status: "failed",
        requiredClients:
          scenario.clients.length,
        waveResults,
        evidenceIds:
          uniqueNonEmpty(
            waveResults.flatMap(
              (item) =>
                item.evidenceIds,
            ),
          ),
        reasons: [
          "Multi-client execution stopped at failed wave " +
            wave.id +
            ".",
          "Failed action(s): " +
            result.failedActionIds
              .join(", ") +
            ".",
        ],
      };
    }
  }

  return {
    scenarioId: scenario.id,
    adapterId:
      adapter.adapterId,
    status: "completed",
    requiredClients:
      scenario.clients.length,
    waveResults,
    evidenceIds:
      uniqueNonEmpty(
        waveResults.flatMap(
          (item) =>
            item.evidenceIds,
        ),
      ),
    reasons: [
      "All multi-client synchronization waves completed.",
    ],
  };
}

function armFor(
  definition:
    RuntimeExperimentDefinition,
  armId: string,
): RuntimeExperimentArm {
  const arm =
    definition.arms.find(
      (item) =>
        item.id === armId,
    );
  if (!arm) {
    throw new Error(
      "Unknown runtime experiment arm: " +
        armId +
        ".",
    );
  }
  return arm;
}

function resolvedNumber(
  value:
    string |
    number |
    boolean |
    undefined,
  arm: RuntimeExperimentArm,
): number | undefined {
  if (
    typeof value === "number"
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.startsWith(
      "$factor.",
    )
  ) {
    const factor =
      arm.factorValues[
        value.slice(
          "$factor.".length,
        )
      ];
    return typeof factor ===
      "number"
      ? factor
      : undefined;
  }

  return undefined;
}

export function requiredLogicalClientsForExperiment(
  definition:
    RuntimeExperimentDefinition,
): number {
  let required = 1;

  for (
    const arm of
      definition.arms
  ) {
    for (
      const step of
        definition.protocol
    ) {
      const parameters =
        step.parameters ?? {};

      const attempted =
        resolvedNumber(
          parameters
            .attemptedPlayers,
          arm,
        );
      const playerCount =
        resolvedNumber(
          parameters.playerCount,
          arm,
        );
      const playerCountA =
        resolvedNumber(
          parameters.playerCountA,
          arm,
        );
      const playerCountB =
        resolvedNumber(
          parameters.playerCountB,
          arm,
        );

      if (attempted !== undefined) {
        required =
          Math.max(
            required,
            attempted,
          );
      }
      if (
        playerCount !==
        undefined
      ) {
        required =
          Math.max(
            required,
            playerCount,
          );
      }
      if (
        playerCountA !==
          undefined ||
        playerCountB !==
          undefined
      ) {
        required =
          Math.max(
            required,
            (playerCountA ?? 0) +
              (playerCountB ?? 0),
          );
      }
    }
  }

  return Math.max(
    1,
    Math.ceil(required),
  );
}
