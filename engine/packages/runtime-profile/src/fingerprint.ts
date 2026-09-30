import { createHash } from "node:crypto";
import type {
  MinecraftRuntimeProfile,
} from "./types.js";
import {
  validateMinecraftRuntimeProfile,
} from "./validate.js";

function stableJson(value: unknown): string {
  if (value === null) return "null";

  if (Array.isArray(value)) {
    return "[" +
      value.map((item) =>
        item === undefined ? "null" : stableJson(item)
      ).join(",") +
      "]";
  }

  if (typeof value === "object") {
    const entries = Object.entries(
      value as Readonly<Record<string, unknown>>,
    )
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return "{" +
      entries.map(([key, item]) =>
        JSON.stringify(key) + ":" + stableJson(item)
      ).join(",") +
      "}";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  throw new Error(
    "Runtime profile contains a non-serializable identity value.",
  );
}

export function runtimeProfileIdentity(
  profile: MinecraftRuntimeProfile,
): MinecraftRuntimeProfile {
  const {
    runtime,
    ...base
  } = profile;

  if (!runtime) return base;

  const stableRuntime = {
    ...(runtime.platform !== undefined
      ? { platform: runtime.platform }
      : {}),
    ...(runtime.dedicatedServerConfigHash !== undefined
      ? {
          dedicatedServerConfigHash:
            runtime.dedicatedServerConfigHash,
        }
      : {}),
  };

  return Object.keys(stableRuntime).length > 0
    ? {
        ...base,
        runtime: stableRuntime,
      }
    : base;
}

export function runtimeProfileFingerprint(
  profile: MinecraftRuntimeProfile,
): string {
  const errors = validateMinecraftRuntimeProfile(profile);
  if (errors.length > 0) {
    throw new Error(
      "Invalid Minecraft runtime profile: " +
        errors.join("; "),
    );
  }

  return "sha256:" +
    createHash("sha256")
      .update(stableJson(runtimeProfileIdentity(profile)))
      .digest("hex");
}

export function canonicalRuntimeProfileJson(
  profile: MinecraftRuntimeProfile,
): string {
  const errors = validateMinecraftRuntimeProfile(profile);
  if (errors.length > 0) {
    throw new Error(
      "Invalid Minecraft runtime profile: " +
        errors.join("; "),
    );
  }
  return stableJson(profile);
}
