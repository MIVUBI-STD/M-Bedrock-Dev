import { basename } from "node:path";
import type {
  ReleaseIdentityObservation,
} from "../../../../analyzers/diagnostics/src/index.js";

const VERSION_PATTERN =
  /(?:^|[\s._-])(?:v|version[\s._-]*|release[\s._-]*)(\d+\.\d+(?:\.\d+){0,2}(?:[-+][0-9A-Za-z.-]+)?)(?=$|[\s._-])/i;

export function extractExplicitReleaseVersion(
  value: string,
): string | undefined {
  const match = VERSION_PATTERN.exec(
    value.trim(),
  );
  return match?.[1];
}

export function artifactFilenameReleaseObservation(
  path: string,
): ReleaseIdentityObservation | undefined {
  const file = basename(path).replace(
    /\.(?:mcworld|zip)$/i,
    "",
  );
  const releaseVersion =
    extractExplicitReleaseVersion(file);
  return releaseVersion === undefined
    ? undefined
    : {
        component: "artifact-filename",
        releaseVersion,
      };
}

export function levelNameReleaseObservation(
  value: string,
  artifactId: string,
): ReleaseIdentityObservation | undefined {
  const releaseVersion =
    extractExplicitReleaseVersion(value);
  return releaseVersion === undefined
    ? undefined
    : {
        component: "levelname.txt",
        releaseVersion,
        source: {
          artifactId,
          relativePath:
            "levelname.txt",
        },
      };
}

export function collectArtifactReleaseObservations(
  input: {
    artifactPath: string;
    artifactId: string;
    levelName?: string;
  },
): ReleaseIdentityObservation[] {
  return [
    artifactFilenameReleaseObservation(
      input.artifactPath,
    ),
    input.levelName === undefined
      ? undefined
      : levelNameReleaseObservation(
          input.levelName,
          input.artifactId,
        ),
  ].filter(
    (
      item,
    ): item is ReleaseIdentityObservation =>
      item !== undefined,
  );
}
