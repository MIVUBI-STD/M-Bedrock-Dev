import {
  validateRuntimeActionCapabilityRegistry,
  type RuntimeActionCapabilityRegistry,
} from "./action-capability.js";

export const BEDROCK_CAPABILITIES_PREFIX =
  "[M-BEDROCK-CAPABILITIES]";

export interface BedrockCapabilityDiscoveryRequest {
  schemaVersion: 1;
  requestId: string;
}

export interface BedrockCapabilityAnnouncement {
  schemaVersion: 1;
  requestId: string;
  runtimeTick: number;
  registry: RuntimeActionCapabilityRegistry;
}

export function parseBedrockCapabilityAnnouncement(
  value: string,
): BedrockCapabilityAnnouncement {
  const parsed = JSON.parse(value) as Partial<
    BedrockCapabilityAnnouncement
  >;

  if (parsed.schemaVersion !== 1) {
    throw new Error(
      "Bedrock capability announcement schemaVersion must be 1.",
    );
  }
  if (
    typeof parsed.requestId !== "string" ||
    !parsed.requestId.trim()
  ) {
    throw new Error(
      "Bedrock capability announcement requestId is required.",
    );
  }
  if (
    typeof parsed.runtimeTick !== "number" ||
    !Number.isFinite(parsed.runtimeTick)
  ) {
    throw new Error(
      "Bedrock capability announcement runtimeTick must be finite.",
    );
  }
  if (!parsed.registry) {
    throw new Error(
      "Bedrock capability announcement registry is required.",
    );
  }

  const errors =
    validateRuntimeActionCapabilityRegistry(
      parsed.registry,
    );
  if (errors.length > 0) {
    throw new Error(
      "Invalid Bedrock capability announcement: " +
        errors.join("; "),
    );
  }

  return parsed as BedrockCapabilityAnnouncement;
}

function canonicalRegistry(
  registry: RuntimeActionCapabilityRegistry,
): string {
  return JSON.stringify({
    schemaVersion: registry.schemaVersion,
    actions: [...registry.actions]
      .map((action) => ({
        ...action,
        phases: [...action.phases].sort(),
        requiredParameters:
          action.requiredParameters === undefined
            ? undefined
            : Object.fromEntries(
                Object.entries(
                  action.requiredParameters,
                ).sort(([a], [b]) =>
                  a.localeCompare(b)
                ),
              ),
        optionalParameters:
          action.optionalParameters === undefined
            ? undefined
            : Object.fromEntries(
                Object.entries(
                  action.optionalParameters,
                ).sort(([a], [b]) =>
                  a.localeCompare(b)
                ),
              ),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export function compareRuntimeActionRegistries(
  expected: RuntimeActionCapabilityRegistry,
  announced: RuntimeActionCapabilityRegistry,
): string[] {
  const errors = [
    ...validateRuntimeActionCapabilityRegistry(
      expected,
    ),
    ...validateRuntimeActionCapabilityRegistry(
      announced,
    ),
  ];
  if (
    canonicalRegistry(expected) !==
      canonicalRegistry(announced)
  ) {
    errors.push(
      "Runtime-announced action capabilities do not match the expected host registry.",
    );
  }
  return errors;
}
