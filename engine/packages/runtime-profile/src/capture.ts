import type {
  MinecraftRuntimeProfile,
} from "./types.js";
import {
  runtimeProfileFingerprint,
} from "./fingerprint.js";
import {
  validateMinecraftRuntimeProfile,
} from "./validate.js";

export type RuntimeProfileEvidenceKind =
  | "runtime-observation"
  | "manifest"
  | "configuration"
  | "operator";

export interface RuntimeProfileEvidenceRef {
  id: string;
  kind: RuntimeProfileEvidenceKind;
  detail?: string;
}

export interface CapturedMinecraftRuntimeProfile {
  schemaVersion: 1;
  profile: MinecraftRuntimeProfile;
  fingerprint: string;
  evidence: readonly RuntimeProfileEvidenceRef[];
  capturedAt?: string;
}

export interface RuntimeProfileCaptureOptions {
  evidence?: readonly RuntimeProfileEvidenceRef[];
  capturedAt?: string;
}

export function captureMinecraftRuntimeProfile(
  profile: MinecraftRuntimeProfile,
  options: RuntimeProfileCaptureOptions = {},
): CapturedMinecraftRuntimeProfile {
  const errors = validateMinecraftRuntimeProfile(profile);
  if (errors.length > 0) {
    throw new Error(
      "Invalid Minecraft runtime profile capture: " +
        errors.join("; "),
    );
  }

  return {
    schemaVersion: 1,
    profile,
    fingerprint: runtimeProfileFingerprint(profile),
    evidence: options.evidence ?? [],
    ...(options.capturedAt !== undefined
      ? { capturedAt: options.capturedAt }
      : {}),
  };
}

export function exportCapturedMinecraftRuntimeProfile(
  capture: CapturedMinecraftRuntimeProfile,
): string {
  const expected = runtimeProfileFingerprint(capture.profile);
  if (capture.fingerprint !== expected) {
    throw new Error(
      "Captured runtime profile fingerprint does not match profile identity.",
    );
  }

  return JSON.stringify(capture, null, 2) + "\n";
}
