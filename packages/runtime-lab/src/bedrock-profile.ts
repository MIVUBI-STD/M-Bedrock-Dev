import {
  captureMinecraftRuntimeProfile,
  type CapturedMinecraftRuntimeProfile,
  type MinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";

export const BEDROCK_PROFILE_PREFIX =
  "[M-BEDROCK-PROFILE]";

export interface BedrockHarnessProfileAnnouncement {
  schemaVersion: 1;
  bindingId: string;
  runtimeTick: number;
  profile: MinecraftRuntimeProfile;
  binding: {
    source: "script-event";
    sessionBound: true;
  };
}

function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value);
}

export function parseBedrockHarnessProfileAnnouncement(
  line: string,
): BedrockHarnessProfileAnnouncement | undefined {
  const offset = line.indexOf(BEDROCK_PROFILE_PREFIX);
  if (offset < 0) return undefined;

  const payload = line.slice(
    offset + BEDROCK_PROFILE_PREFIX.length,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new Error(
      "Invalid Bedrock runtime profile JSON: " +
        (error instanceof Error
          ? error.message
          : String(error)),
    );
  }

  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.bindingId !== "string" ||
    !parsed.bindingId.trim() ||
    !Number.isInteger(parsed.runtimeTick) ||
    !isRecord(parsed.profile) ||
    !isRecord(parsed.binding) ||
    parsed.binding.source !== "script-event" ||
    parsed.binding.sessionBound !== true
  ) {
    throw new Error(
      "Invalid Bedrock runtime profile announcement.",
    );
  }

  return parsed as unknown as
    BedrockHarnessProfileAnnouncement;
}

export function captureBedrockHarnessProfile(
  announcement: BedrockHarnessProfileAnnouncement,
): CapturedMinecraftRuntimeProfile {
  return captureMinecraftRuntimeProfile(
    announcement.profile,
    {
      evidence: [
        {
          id:
            "bedrock-harness:profile-binding:" +
            announcement.bindingId +
            ":" +
            announcement.runtimeTick,
          kind: "runtime-observation",
          detail:
            "Target profile was explicitly bound to the active Minecraft script session.",
        },
      ],
    },
  );
}

export function captureBedrockHarnessProfileLine(
  line: string,
): CapturedMinecraftRuntimeProfile | undefined {
  const announcement =
    parseBedrockHarnessProfileAnnouncement(line);
  return announcement
    ? captureBedrockHarnessProfile(announcement)
    : undefined;
}
