import { basename, resolve } from "node:path";
import { compareArtifacts } from "../../../engine/packages/orchestrator/src/index.js";
import { compareArtifactsForUpdate } from "../../../engine/packages/orchestrator/src/index.js";
import { inspectArtifact } from "../../../engine/packages/orchestrator/src/index.js";
import { buildEngineeringReviewProjection } from "../../../engine/packages/orchestrator/src/index.js";
import { buildArenaEngineeringProjection } from "../../../engine/packages/orchestrator/src/index.js";
import { buildMapEngineeringWorkflow } from "../../../engine/packages/orchestrator/src/index.js";
import { planRepositoryTasks } from "../../../engine/packages/orchestrator/src/index.js";
import { verifyPostRepairOutcome } from "../../../engine/packages/orchestrator/src/index.js";
import { buildArenaGoldenBaselineCandidate } from "../../../engine/packages/orchestrator/src/index.js";
import { buildArenaRuntimeAdapterScaffold } from "../../../engine/packages/orchestrator/src/index.js";
import { inspectArenaGoldenCorpusStatusFromFile } from "../../../engine/packages/orchestrator/src/index.js";
import { loadKnowledgeDirectory } from "../../../engine/packages/knowledge/src/index.js";
import { loadGameDesignSpec } from "../../../engine/packages/game-design/src/index.js";
import { aggregateScriptApiUsage } from "../../../engine/packages/orchestrator/src/index.js";
import { parseCliTargetOptions } from "./target-options.js";
import { loadTelemetryFile } from "../../../engine/packages/orchestrator/src/index.js";
import { loadRuntimeProbeTranscript, assertRuntimeProbeTranscriptArtifact } from "../../../engine/packages/orchestrator/src/index.js";
import { loadRuntimeProbeBindings } from "../../../engine/packages/orchestrator/src/index.js";
import { prepareRuntimeProbeBundle } from "../../../engine/packages/orchestrator/src/index.js";
import { replayRuntimeProbeTranscript } from "../../../engine/packages/orchestrator/src/index.js";
import { compileRuntimeProbeRequests } from "../../../engine/packages/orchestrator/src/index.js";
import {
  calibrateGameplayCorpusFromFile,
  loadArenaRegionContractsFile,
  runArenaGoldenCorpusFromFile,
} from "../../../engine/packages/orchestrator/src/index.js";

async function main(): Promise<void> {
  const [, , command, ...rawArgs] = process.argv;
  const {
    positionals: args,
    target,
    telemetryPath,
    gameDesignPath,
    arenaRegionContractsPath,
    probeTranscriptPath,
    probeBindingsPath,
    probeContext,
  } = parseCliTargetOptions(rawArgs);
  const [input, secondInput, thirdInput] = args;

  if (
    (command === "affected" ||
      command === "plan") &&
    args.length > 0
  ) {
    const taskPlan = planRepositoryTasks({
      changedPaths: args,
      context: "LOCAL_ARTIFACT",
    });

    console.log(
      JSON.stringify(
        command === "affected"
          ? {
              schemaVersion: taskPlan.schemaVersion,
              status: taskPlan.status,
              affected: taskPlan.affected,
              reasons: taskPlan.reasons,
            }
          : taskPlan,
        null,
        2,
      ),
    );
    return;
  }

  if (arenaRegionContractsPath) {
    target.arenaRegionContracts =
      await loadArenaRegionContractsFile(
        resolve(arenaRegionContractsPath),
      );
  }
  const knowledge = await loadKnowledgeDirectory(resolve("engine/knowledge"));
  if (gameDesignPath) {
    target.gameDesign = await loadGameDesignSpec(resolve(gameDesignPath));
  }

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

  if (command === "arena-adapter" && input) {
    const result = await inspectArtifact(
      resolve(input),
      target,
      knowledge,
    );
    const scaffold =
      buildArenaRuntimeAdapterScaffold(
        result,
      );
    console.log(
      JSON.stringify(
        scaffold,
        null,
        2,
      ),
    );
    return;
  }

  if (command === "arena-baseline" && input) {
    const proofTarget = {
      ...target,
      arenaProofMode: "full" as const,
    };
    const result = await inspectArtifact(
      resolve(input),
      proofTarget,
      knowledge,
    );
    const fileName = basename(input);
    const label = fileName.replace(
      /\.(?:mcworld|zip)$/i,
      "",
    );
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
      "arena-map";

    const candidate =
      buildArenaGoldenBaselineCandidate(
        result,
        {
          id,
          label,
          artifactFile: fileName,
          ...(arenaRegionContractsPath ===
          undefined
            ? {}
            : {
                regionContractsFile:
                  basename(
                    arenaRegionContractsPath,
                  ),
              }),
        },
      );

    console.log(
      JSON.stringify(
        candidate,
        null,
        2,
      ),
    );
    if (candidate.warnings.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "arena-corpus-status" && input) {
    const status =
      await inspectArenaGoldenCorpusStatusFromFile(
        resolve(input),
        secondInput === undefined
          ? undefined
          : resolve(secondInput),
      );
    console.log(
      JSON.stringify(
        status,
        null,
        2,
      ),
    );
    if (status.blocked > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "arena-corpus" && input) {
    const report = await runArenaGoldenCorpusFromFile(
      resolve(input),
      secondInput === undefined
        ? undefined
        : resolve(secondInput),
      target,
      knowledge,
    );
    console.log(JSON.stringify(report, null, 2));
    if (report.totalAssertionFailures > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "corpus-calibrate" && input) {
    const report =
      await calibrateGameplayCorpusFromFile(
        resolve(input),
        secondInput === undefined
          ? undefined
          : resolve(secondInput),
        target,
        knowledge,
      );
    console.log(JSON.stringify(report, null, 2));
    if (
      report.aggregate.totalAssertionFailures > 0
    ) {
      process.exitCode = 1;
    }
    return;
  }


  if (
    command === "verify-repair" &&
    input &&
    secondInput
  ) {
    const beforeTarget = {
      ...target,
      arenaProofMode: "full" as const,
    };
    const afterTarget = {
      ...target,
      arenaProofMode:
        target.arenaProofMode ??
        "progressive",
    };
    const before = await inspectArtifact(
      resolve(input),
      beforeTarget,
      knowledge,
    );
    const after = await inspectArtifact(
      resolve(secondInput),
      afterTarget,
      knowledge,
    );
    const report =
      verifyPostRepairOutcome({
        before,
        after,
      });
    console.log(
      JSON.stringify(report, null, 2),
    );
    if (!report.releaseReady) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "workflow" && input) {
    const telemetry = telemetryPath
      ? await loadTelemetryFile(resolve(telemetryPath))
      : undefined;
    const probeTranscript = probeTranscriptPath
      ? await loadRuntimeProbeTranscript(
          resolve(probeTranscriptPath),
        )
      : undefined;
    const result = await inspectArtifact(
      resolve(input),
      target,
      knowledge,
      telemetry ?? [],
      probeTranscript,
    );
    const workflow =
      buildMapEngineeringWorkflow(result);
    console.log(
      JSON.stringify(workflow, null, 2),
    );

    if (
      workflow.stages.some(
        (stage) =>
          stage.id === "release" &&
          stage.status === "blocked",
      )
    ) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "arena-audit" && input) {
    const telemetry = telemetryPath
      ? await loadTelemetryFile(resolve(telemetryPath))
      : undefined;
    const probeTranscript = probeTranscriptPath
      ? await loadRuntimeProbeTranscript(
          resolve(probeTranscriptPath),
        )
      : undefined;
    const result = await inspectArtifact(
      resolve(input),
      {
        ...target,
        arenaProofMode:
          target.arenaProofMode ?? "full",
      },
      knowledge,
      telemetry ?? [],
      probeTranscript,
    );
    const projection =
      buildArenaEngineeringProjection(result);
    console.log(JSON.stringify(projection, null, 2));

    if (
      projection.diagnostics.some(
        (finding) => finding.severity === "critical",
      )
    ) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "review" && input) {
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
    console.log(JSON.stringify(
      buildEngineeringReviewProjection(result),
      null,
      2,
    ));
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
    command !== "review" &&
    command !== "arena-audit" &&
    command !== "workflow" &&
    command !== "verify-repair" &&
    command !== "review-model" &&
    command !== "probe-plan" &&
    command !== "probe-replay"
  ) {
    throw new Error(
      "Telemetry and runtime probe transcript inputs are only supported by inspect, review, probe-plan, or probe-replay.",
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
      resolve("engine/reliability/catalogs"),
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
    "  npm run cli -- affected <changed-path> [changed-path ...]",
    "  npm run cli -- plan <changed-path> [changed-path ...]",
    "  npm run cli -- arena-corpus <manifest.json> [artifact-root] [--edition ...] [--version ...] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full]",
    "  npm run cli -- corpus-calibrate <manifest.json> [artifact-root] [--edition ...] [--version ...] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full]",
    "  npm run cli -- inspect <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--experiment id] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full] [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- arena-audit <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full] [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- arena-baseline <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--authored-source-root path] [--arena-region-contracts regions.json]",
    "  npm run cli -- arena-corpus-status <manifest.json> [artifact-root]",
    "  npm run cli -- arena-adapter <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--authored-source-root path] [--arena-region-contracts regions.json]",
    "  npm run cli -- workflow <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full] [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- verify-repair <before-mcworld> <after-mcworld> [--edition bedrock|education] [--version x.y.z] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full]",
    "  npm run cli -- review <path-to-mcworld-or-zip> [--edition bedrock|education] [--version x.y.z] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full] [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- probe-plan <map.mcworld> --probe-bindings bindings.json --probe-context LIVE_MINECRAFT [--telemetry qa.json] [--probe-transcript probes.json]",
    "  npm run cli -- probe-replay <map.mcworld> --probe-transcript probes.json --probe-context LIVE_MINECRAFT [--probe-bindings bindings.json] [--telemetry qa.json]",
    "  npm run cli -- script-usage <map1.mcworld> [map2.mcworld ...] [--edition ...] [--version ...] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full]",
    "  npm run cli -- compare <before-mcworld> <after-mcworld> [--edition ...] [--version ...] [--authored-source-root path] [--arena-region-contracts regions.json] [--arena-proof-mode progressive|full]",
    "  npm run cli -- compare-update <before-mcworld> <after-mcworld> <target-version> [--edition ...] [--experiment id]",
  ].join("\n"));
  process.exitCode = 2;
}

await main();
