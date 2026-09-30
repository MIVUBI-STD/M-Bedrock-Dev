import type {
  NondeterminismSurface,
} from "./types.js";

export type CapabilityDegree =
  | "yes"
  | "no"
  | "partial"
  | "unknown";

export interface NondeterminismSurfaceCapability {
  observable: CapabilityDegree;
  controllable: CapabilityDegree;
  replayable: CapabilityDegree;
  simulatable: CapabilityDegree;
  evidenceIds?: readonly string[];
}

export interface NondeterminismCapabilityProfile {
  schemaVersion: 1;
  runtimeClass: string;
  surfaces: Readonly<
    Partial<
      Record<
        NondeterminismSurface,
        NondeterminismSurfaceCapability
      >
    >
  >;
}

const DEGREES = new Set<CapabilityDegree>([
  "yes",
  "no",
  "partial",
  "unknown",
]);

export function validateNondeterminismCapabilityProfile(
  profile: NondeterminismCapabilityProfile,
): string[] {
  const errors: string[] = [];
  if (profile.schemaVersion !== 1) {
    errors.push(
      "Nondeterminism capability profile schemaVersion must be 1.",
    );
  }
  if (!profile.runtimeClass.trim()) {
    errors.push(
      "Nondeterminism capability profile runtimeClass must be non-empty.",
    );
  }

  for (const [surface, capability] of Object.entries(
    profile.surfaces,
  )) {
    if (!capability) continue;
    for (const field of [
      "observable",
      "controllable",
      "replayable",
      "simulatable",
    ] as const) {
      if (!DEGREES.has(capability[field])) {
        errors.push(
          "Nondeterminism capability " +
            surface +
            "." +
            field +
            " is invalid.",
        );
      }
    }
  }

  return errors;
}

export function unknownNondeterminismCapabilityProfile(
  runtimeClass: string,
  surfaces: readonly NondeterminismSurface[],
): NondeterminismCapabilityProfile {
  return {
    schemaVersion: 1,
    runtimeClass,
    surfaces: Object.fromEntries(
      surfaces.map((surface) => [
        surface,
        {
          observable: "unknown",
          controllable: "unknown",
          replayable: "unknown",
          simulatable: "unknown",
        } satisfies NondeterminismSurfaceCapability,
      ]),
    ),
  };
}
