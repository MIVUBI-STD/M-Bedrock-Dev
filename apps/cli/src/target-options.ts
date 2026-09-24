import type { InspectTargetProfile } from "../../../packages/orchestrator/src/types.js";

export interface ParsedCliTargetOptions {
  positionals: string[];
  target: InspectTargetProfile;
  telemetryPath?: string;
  probeTranscriptPath?: string;
}

export function parseCliTargetOptions(args: readonly string[]): ParsedCliTargetOptions {
  const positionals: string[] = [];
  const experiments: string[] = [];
  const target: InspectTargetProfile = {};
  let telemetryPath: string | undefined;
  let probeTranscriptPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]!;

    if (token === "--edition") {
      const value = args[index + 1];
      if (value !== "bedrock" && value !== "education") {
        throw new Error("--edition requires bedrock or education");
      }
      target.edition = value;
      index += 1;
      continue;
    }

    if (token === "--version") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--version requires a Minecraft version");
      }
      target.version = value;
      index += 1;
      continue;
    }

    if (token === "--experiment") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--experiment requires an experiment id");
      }
      experiments.push(value);
      index += 1;
      continue;
    }

    if (token === "--telemetry") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--telemetry requires a JSON file path");
      }
      telemetryPath = value;
      index += 1;
      continue;
    }

    if (token === "--probe-transcript") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--probe-transcript requires a JSON file path");
      }
      probeTranscriptPath = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--")) {
      throw new Error("Unknown option: " + token);
    }

    positionals.push(token);
  }

  if (experiments.length > 0) target.experiments = experiments;
  return {
    positionals,
    target,
    ...(telemetryPath === undefined ? {} : { telemetryPath }),
    ...(probeTranscriptPath === undefined
      ? {}
      : { probeTranscriptPath }),
  };
}