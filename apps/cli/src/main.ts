import { resolve } from "node:path";
import { compareArtifacts } from "../../../packages/orchestrator/src/compare-artifacts.js";
import { compareArtifactsForUpdate } from "../../../packages/orchestrator/src/version-aware-comparison.js";
import { inspectArtifact } from "../../../packages/orchestrator/src/inspect-artifact.js";
import { loadKnowledgeDirectory } from "../../../packages/knowledge/src/load.js";
import { aggregateScriptApiUsage } from "../../../packages/orchestrator/src/script-api-usage.js";
import { parseCliTargetOptions } from "./target-options.js";
import { loadTelemetryFile } from "../../../packages/orchestrator/src/telemetry-load.js";
import { loadRuntimeProbeTranscript, assertRuntimeProbeTranscriptArtifact } from "../../../packages/orchestrator/src/runtime-probe-load.js";
import { loadRuntimeProbeBindings } from "../../../packages/orchestrator/src/runtime-probe-binding-load.js";
import { prepareRuntimeProbeBundle } from "../../../packages/orchestrator/src/runtime-probe-bundle.js";
import { replayRuntimeProbeTranscript } from "../../../packages/orchestrator/src/runtime-probe-replay.js";
import { compileRuntimeProbeRequests } from "../../../packages/orchestrator/src/runtime-probe-request-compiler.js";

async function main(): Promise<void> {
  const [, , command, ...rawArgs] = process.argv;
  const {
    positionals: args,
    target,
    telemetryPath,
    probeTranscriptPath,
    probeBindingsPath,
    probeContext,
  } = parseCliTargetOptions(rawArgs);
  const [input, secondInput, thirdInput] = args;
  const knowledge = await loadKnowledgeDirectory(resolve("knowledge"));

  if (command === "probe-plan" && input) {
    if (!probeBindingsPath) {
      throw new Error(
        "probe-plan requires --probe-bindings <bindings.json>",
      );
    }
    if (
      probeContext !== "LOCAL_MINECRAFT" &&
      probeContext !== "LIVE_MINECRAFT"
    ) {
      throw new Error(
        "probe-plan requires --probe-context LOCAL_MINECRAFT or LIVE_MINECRAFT",
      );
    }

    const telemetry = telemetryPath
      ? await loadTelemetryFile(resolve(telemetryPath))
      : undefined;
    const probeTranscript = probeTranscriptPath
      ? await loadRuntimeProbeTranscript(resolve(probeTranscriptPath))
      : undefined;
    const bindings = await loadRuntimeProbeBindings(
      resolve(probeBindingsPath),
    );

    const result = await inspectArtifact(
      resolve(input),
      target,
      knowledge,
      telemetry ?? [],
      probeTranscript,
    );

    const prepared = prepareRuntimeProbeBundle(
      result,
      {
        availableContext: probeContext,
        bindings: bindings.bindings,
        artifactId: result.artifactId,
        sessionId: "probe-plan:" + result.artifactId,
      },
    );

    console.log(JSON.stringify({
      artifactId: result.artifactId,
      diagnosticProbeAnalysis: result.diagnosticProbeAnalysis,
      prepared,
    }, null, 2));

    if (prepared.issues.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "probe-replay" && input) {
    if (!probeTranscriptPath) {
      throw new Error(
        "probe-replay requires --probe-transcript <probes.json>",
      );
    }
    if (!probeContext) {
      throw new Error(
        "probe-replay requires --probe-context",
      );
    }

    const telemetry = telemetryPath
      ? await loadTelemetryFile(resolve(telemetryPath))
      : undefined;
    const transcript = await loadRuntimeProbeTranscript(
      resolve(probeTranscriptPath),
    );
    const bindings = probeBindingsPath
      ? await loadRuntimeProbeBindings(resolve(probeBindingsPath))
      : undefined;

    const baseline = await inspectArtifact(
      resolve(input),
      target,
      knowledge,
      telemetry ?? [],
    );
    assertRuntimeProbeTranscriptArtifact(
      transcript,
      baseline.artifactId,
    );

    const incidentsById = new Map(
      baseline.causalAnalysis.incidents.map((incident) => [
        incident.id,
        incident,
      ]),
    );
    const replays = baseline.diagnosticProbeAnalysis.incidents
      .flatMap((analysis) => {
        const incident = incidentsById.get(analysis.incidentId);
        if (!incident) return [];

        const replay = replayRuntimeProbeTranscript(
          incident,
          analysis.definitions,
          transcript,
          {
            availableContext: probeContext,
          },
        );

        const nextCompilation = bindings
          ? compileRuntimeProbeRequests(
              replay.nextPlan,
              analysis.definitions,
              bindings.bindings,
              {
                requestId: (probeId, index) =>
                  replay.incident.id +
                  "::" +
                  probeId +
                  "::retry-" +
                  (transcript.exchanges.length + index + 1),
              },
            )
          : undefined;

        return [{
          incidentId: incident.id,
          replay,
          ...(nextCompilation === undefined
            ? {}
            : { nextCompilation }),
        }];
      });

    const knownIncidentIds = new Set(
      baseline.causalAnalysis.incidents.map((incident) => incident.id),
    );
    const transcriptIncidentIds = new Set(
      transcript.exchanges
        .map((exchange) => exchange.request.incidentId)
        .filter((id): id is string => typeof id === "string"),
    );
    const orphanTranscriptIncidentIds = [...transcriptIncidentIds]
      .filter((id) => !knownIncidentIds.has(id))
      .sort();

    console.log(JSON.stringify({
      artifactId: baseline.artifactId,
      transcriptIncomplete:
        (transcript.droppedExchanges ?? 0) > 0,
      orphanTranscriptIncidentIds,
      replays,
    }, null, 2));
    return;
  }

  if (command === "inspect" && input) {
    const telemetry = telemetryPath
      ? await loadTelemetryFile(resolve(telemetryPath))
      : undefined;
    const probeTranscript = probeTranscriptPath
      ? await loadRuntimeProbeTranscript(resolve(probeTranscriptPath))
      : undefined;
    const result = await inspectArtifact(
      resolve(input),
      target,
      knowledge,
      telemetry ?? [],
      probeTranscript,
    );
    console.log(JSON.stringify(result, null, 2));

    if (result.diagnostics.some((finding) => finding.severity === "critical")) {
      process.exitCode = 1;
    }
    return;
  }

  if (
    (telemetryPath || probeTranscriptPath) &&
    command !== "inspect" &&
    command !== "probe-plan" &&
    command !== "probe-replay"
  ) {
    throw new Error(
      "Telemetry and runtime probe transcript inputs are only supported by inspect or probe-plan.",
    );
  }

  if (
    (probeBindingsPath || probeContext) &&
    command !== "probe-plan" &&
    command !== "probe-replay"
  ) {
    throw new Error(
      "Probe binding/context options are only supported by probe-plan or probe-replay.",
    );
  }

  if (command === "script-usage" && args.length > 0) {
    const maps = [];
    for (const artifactPath of args) {
      const result = await inspectArtifact(resolve(artifactPath), target, knowledge);
      maps.push({
        mapId: result.artifactId,
        label: artifactPath,
        usage: result.scriptApiUsage,
      });
    }
    console.log(JSON.stringify(aggregateScriptApiUsage(maps), null, 2));
    return;
  }

  if (command === "compare-update" && input && secondInput && thirdInput) {
    const result = await compareArtifactsForUpdate(
      resolve(input),
      resolve(secondInput),
      thirdInput,
      resolve("reliability/catalogs"),
      target,
      knowledge,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "compare" && input && secondInput) {
    const result = await compareArtifacts(
      resolve(input),
      resolve(secondInput),
      target,
      knowledge,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error([
    "Usage:",
    "  npm run cli -- inspect <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--experiment id] [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- probe-plan <map.mcworld> --probe-bindings bindings.json --probe-context LIVE_MINECRAFT [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- probe-replay <map.mcworld> --probe-transcript probes.json --probe-context LIVE_MINECRAFT [--probe-bindings bindings.json] [--telemetry qa.json]",
    "  npm run cli -- script-usage <map1.mcworld> [map2.mcworld ...] [--edition ...] [--version ...]",
    "  npm run cli -- compare <before-mcworld> <after-mcworld> [--edition ...] [--version ...]",
    "  npm run cli -- compare-update <before-mcworld> <after-mcworld> <target-version> [--edition ...] [--experiment id]",
  ].join("\n"));
  process.exitCode = 2;
}

await main();
