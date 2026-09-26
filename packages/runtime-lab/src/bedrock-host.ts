import {
  parseRuntimeProbeExchange,
  parseRuntimeProbeResponseJson,
  type DiagnosticExecutionContext,
  type RuntimeProbeQuery,
  type RuntimeProbeRequest,
  type RuntimeProbeResponse,
} from "../../project-model/src/index.js";
import type {
  CapturedMinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";
import {
  BEDROCK_PROFILE_PREFIX,
  captureBedrockHarnessProfile,
  parseBedrockHarnessProfileAnnouncement,
} from "./bedrock-profile.js";
import type {
  RuntimeExperimentHost,
} from "./runner.js";
import type {
  RuntimeExperimentArm,
  RuntimeExperimentDefinition,
  RuntimeExperimentProtocolStep,
  RuntimeExperimentTrial,
  RuntimeExperimentTrialIdentity,
} from "./types.js";

export const BEDROCK_PROBE_PREFIX =
  "[M-BEDROCK-PROBE]";

export interface BedrockHarnessWaitOptions {
  prefix: string;
  timeoutMs: number;
  accept(line: string): boolean;
}

export interface BedrockHarnessChannel {
  readonly context: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >;
  readonly environmentFingerprint: string;
  sendScriptEvent(
    id: string,
    message: string,
  ): Promise<void>;
  waitForLine(
    options: BedrockHarnessWaitOptions,
  ): Promise<string>;
}

export interface BedrockHarnessHostOptions {
  channel: BedrockHarnessChannel;
  targetProfile: CapturedMinecraftRuntimeProfile;
  timeoutMs?: number;
}

type ParameterValue = string | number | boolean;

function armFor(
  definition: RuntimeExperimentDefinition,
  armId: string,
): RuntimeExperimentArm {
  const arm = definition.arms.find(
    (candidate) => candidate.id === armId,
  );
  if (!arm) {
    throw new Error(
      "Runtime experiment references unknown arm: " +
        armId +
        ".",
    );
  }
  return arm;
}

function resolveParameter(
  value: ParameterValue,
  arm: RuntimeExperimentArm,
): ParameterValue {
  if (
    typeof value === "string" &&
    value.startsWith("$factor.")
  ) {
    const factorId = value.slice("$factor.".length);
    const resolved = arm.factorValues[factorId];
    if (resolved === undefined) {
      throw new Error(
        "Runtime experiment factor is not defined for arm " +
          arm.id +
          ": " +
          factorId +
          ".",
      );
    }
    return resolved;
  }
  return value;
}

function resolvedParameters(
  step: RuntimeExperimentProtocolStep,
  arm: RuntimeExperimentArm,
): Readonly<Record<string, ParameterValue>> {
  return Object.fromEntries(
    Object.entries(step.parameters ?? {}).map(
      ([key, value]) => [
        key,
        resolveParameter(value, arm),
      ],
    ),
  );
}

function requiredString(
  parameters: Readonly<Record<string, ParameterValue>>,
  key: string,
): string {
  const value = parameters[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      "Bedrock runtime action parameter " +
        key +
        " must be a non-empty string.",
    );
  }
  return value;
}

function requiredNumber(
  parameters: Readonly<Record<string, ParameterValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      "Bedrock runtime action parameter " +
        key +
        " must be a finite number.",
    );
  }
  return value;
}

function optionalNumber(
  parameters: Readonly<Record<string, ParameterValue>>,
  key: string,
): number | undefined {
  const value = parameters[key];
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      "Bedrock runtime action parameter " +
        key +
        " must be a finite number when provided.",
    );
  }
  return value;
}

function queryFor(
  step: RuntimeExperimentProtocolStep,
  parameters: Readonly<Record<string, ParameterValue>>,
): RuntimeProbeQuery {
  switch (step.actionId) {
    case "probe.chunk-loaded":
      return {
        kind: "chunk-loaded",
        dimension: requiredString(
          parameters,
          "dimension",
        ),
        location: {
          x: requiredNumber(parameters, "x"),
          y: requiredNumber(parameters, "y"),
          z: requiredNumber(parameters, "z"),
        },
      };
    case "probe.entity-resolvable":
      return {
        kind: "entity-resolvable",
        entityId: requiredString(
          parameters,
          "entityId",
        ),
      };
    case "probe.tag-present": {
      const subjectKind = requiredString(
        parameters,
        "subjectKind",
      );
      if (
        subjectKind !== "player" &&
        subjectKind !== "entity"
      ) {
        throw new Error(
          "Bedrock tag probe subjectKind must be player or entity.",
        );
      }
      return {
        kind: "tag-present",
        subjectKind,
        subjectId: requiredString(
          parameters,
          "subjectId",
        ),
        tag: requiredString(parameters, "tag"),
      };
    }
    case "probe.scoreboard-value": {
      const expected = optionalNumber(
        parameters,
        "expected",
      );
      return {
        kind: "scoreboard-value",
        objectiveId: requiredString(
          parameters,
          "objectiveId",
        ),
        participant: requiredString(
          parameters,
          "participant",
        ),
        ...(expected === undefined
          ? {}
          : { expected }),
      };
    }
    default:
      throw new Error(
        "Unsupported Bedrock Runtime Lab action: " +
          step.actionId +
          ".",
      );
  }
}

function predicateFor(
  definition: RuntimeExperimentDefinition,
  parameters: Readonly<Record<string, ParameterValue>>,
): string {
  const explicit = parameters.predicate;
  if (explicit !== undefined) {
    if (
      typeof explicit !== "string" ||
      !explicit.trim()
    ) {
      throw new Error(
        "Runtime probe predicate parameter must be a non-empty string.",
      );
    }
    if (
      !definition.outcomePredicateIds.includes(explicit)
    ) {
      throw new Error(
        "Runtime probe predicate is not declared by the experiment: " +
          explicit +
          ".",
      );
    }
    return explicit;
  }

  if (definition.outcomePredicateIds.length !== 1) {
    throw new Error(
      "Runtime probe requires an explicit predicate when the experiment declares multiple outcomes.",
    );
  }

  return definition.outcomePredicateIds[0]!;
}

function requestFor(
  definition: RuntimeExperimentDefinition,
  identity: RuntimeExperimentTrialIdentity,
  step: RuntimeExperimentProtocolStep,
): RuntimeProbeRequest {
  const arm = armFor(
    definition,
    identity.armId,
  );
  const parameters = resolvedParameters(
    step,
    arm,
  );
  const predicate = predicateFor(
    definition,
    parameters,
  );
  const requestId = [
    definition.id,
    identity.armId,
    identity.runIndex,
    step.id,
  ].join(":");

  return {
    schemaVersion: 1,
    requestId,
    probeId:
      definition.id + ":" + step.id,
    predicate,
    query: queryFor(step, parameters),
    outcomeByState: {
      present: predicate + ":present",
      absent: predicate + ":absent",
    },
  };
}

function probeLine(
  line: string,
): RuntimeProbeResponse | undefined {
  const offset = line.indexOf(
    BEDROCK_PROBE_PREFIX,
  );
  if (offset < 0) return undefined;
  return parseRuntimeProbeResponseJson(
    line.slice(
      offset + BEDROCK_PROBE_PREFIX.length,
    ),
  );
}

async function bindTargetProfile(
  options: BedrockHarnessHostOptions,
  definition: RuntimeExperimentDefinition,
  identity: RuntimeExperimentTrialIdentity,
): Promise<void> {
  if (
    options.targetProfile.fingerprint !==
      definition.targetProfileFingerprint ||
    options.targetProfile.fingerprint !==
      identity.targetProfileFingerprint
  ) {
    throw new Error(
      "Bedrock host target profile fingerprint does not match experiment identity.",
    );
  }

  const bindingId = [
    definition.id,
    identity.armId,
    identity.runIndex,
    "profile",
  ].join(":");

  await options.channel.sendScriptEvent(
    "m-bedrock:target-profile",
    JSON.stringify({
      schemaVersion: 1,
      bindingId,
      profile: options.targetProfile.profile,
    }),
  );

  const line = await options.channel.waitForLine({
    prefix: BEDROCK_PROFILE_PREFIX,
    timeoutMs: options.timeoutMs ?? 5000,
    accept(candidate) {
      try {
        const announcement =
          parseBedrockHarnessProfileAnnouncement(
            candidate,
          );
        return announcement?.bindingId ===
          bindingId;
      } catch {
        return false;
      }
    },
  });

  const announcement =
    parseBedrockHarnessProfileAnnouncement(line);
  if (!announcement) {
    throw new Error(
      "Bedrock target profile binding acknowledgement is missing.",
    );
  }

  const observed =
    captureBedrockHarnessProfile(
      announcement,
    );
  if (
    observed.fingerprint !==
      options.targetProfile.fingerprint
  ) {
    throw new Error(
      "Bedrock runtime profile acknowledgement does not match the requested target profile.",
    );
  }
}

async function executeProbe(
  options: BedrockHarnessHostOptions,
  request: RuntimeProbeRequest,
): Promise<RuntimeProbeResponse> {
  await options.channel.sendScriptEvent(
    "m-bedrock:probe",
    JSON.stringify(request),
  );

  const line = await options.channel.waitForLine({
    prefix: BEDROCK_PROBE_PREFIX,
    timeoutMs: options.timeoutMs ?? 5000,
    accept(candidate) {
      try {
        return probeLine(candidate)?.requestId ===
          request.requestId;
      } catch {
        return false;
      }
    },
  });

  const response = probeLine(line);
  if (!response) {
    throw new Error(
      "Bedrock runtime probe response is missing.",
    );
  }

  return parseRuntimeProbeExchange(
    request,
    response,
  ).response;
}

export function createBedrockHarnessExperimentHost(
  options: BedrockHarnessHostOptions,
): RuntimeExperimentHost {
  if (
    !options.channel.environmentFingerprint.trim()
  ) {
    throw new Error(
      "Bedrock harness channel environmentFingerprint is required.",
    );
  }
  if (
    options.timeoutMs !== undefined &&
    (
      !Number.isInteger(options.timeoutMs) ||
      options.timeoutMs < 1
    )
  ) {
    throw new Error(
      "Bedrock harness timeoutMs must be a positive integer.",
    );
  }

  return {
    context: options.channel.context,
    environmentFingerprint:
      options.channel.environmentFingerprint,

    async executeTrial(
      definition,
      identity,
    ): Promise<RuntimeExperimentTrial> {
      if (definition.mutationRisk !== "read-only") {
        throw new Error(
          "The first Bedrock Runtime Lab host supports read-only experiments only.",
        );
      }

      await bindTargetProfile(
        options,
        definition,
        identity,
      );

      const evidence = [];
      let startTick: number | undefined;
      let endTick: number | undefined;

      for (const step of definition.protocol) {
        if (step.phase !== "observe") {
          throw new Error(
            "The first Bedrock Runtime Lab host supports observe-only protocol steps.",
          );
        }

        const response = await executeProbe(
          options,
          requestFor(
            definition,
            identity,
            step,
          ),
        );

        startTick ??= response.runtimeTick;
        endTick = response.runtimeTick;
        evidence.push(response.evidence);
      }

      return {
        schemaVersion: 1,
        id: [
          definition.id,
          identity.armId,
          identity.runIndex,
        ].join(":"),
        identity,
        status: "completed",
        ...(startTick === undefined
          ? {}
          : { startTick }),
        ...(endTick === undefined
          ? {}
          : { endTick }),
        evidence,
      };
    },
  };
}
