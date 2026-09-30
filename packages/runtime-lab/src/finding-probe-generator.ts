import type {
  RuntimeProbeTemplate,
} from "./probe-plan.js";

export interface DiagnosticFindingProbeInput {
  findingId: string;
  domain:
    | "arena-release"
    | "terminal-race"
    | "arena-parity"
    | "structure-residue"
    | "persistent-state";
  subject: string;
  arenaId?: string;
}

export function runtimeProbeTemplateForFinding(
  input: DiagnosticFindingProbeInput,
): RuntimeProbeTemplate {
  const arena = input.arenaId
    ? " in " + input.arenaId
    : "";

  if (input.domain === "arena-release") {
    return {
      probeId: input.findingId,
      title: "Arena release proof",
      goal:
        "Verify that terminal player/session paths release the arena lease" +
        arena +
        ".",
      setup: [
        "Start a controlled match with the minimum required players" + arena + ".",
      ],
      steps: [
        "Trigger the suspected terminal path.",
        "Observe arena/session ownership immediately after termination.",
        "Attempt to allocate the same arena again.",
      ],
      expectedEvidence: [
        "arena lease state",
        "player assignment state",
        "re-allocation result",
      ],
      mutationRisk: "guarded",
    };
  }

  if (input.domain === "terminal-race") {
    return {
      probeId: input.findingId,
      title: "Terminal race proof",
      goal:
        "Determine whether competing terminal paths duplicate completion side effects.",
      setup: [
        "Prepare one deterministic completion trigger.",
      ],
      steps: [
        "Trigger completion once.",
        "Capture completion callbacks, rewards, score writes, and cleanup events for several ticks.",
        "Check whether any terminal side effect executes more than once.",
      ],
      expectedEvidence: [
        "terminal callback count",
        "reward count",
        "score write count",
        "cleanup count",
      ],
      mutationRisk: "guarded",
    };
  }

  if (input.domain === "arena-parity") {
    return {
      probeId: input.findingId,
      title: "Arena parity proof",
      goal:
        "Verify whether the physical arena divergence changes gameplay behavior" +
        arena +
        ".",
      setup: [
        "Use the canonical arena and target arena with equivalent player state.",
      ],
      steps: [
        "Execute the same route/mechanic in the canonical arena.",
        "Repeat the same route/mechanic in the target arena.",
        "Compare progression and interaction outcomes.",
      ],
      expectedEvidence: [
        "progression result",
        "interaction result",
        "runtime position/state trace",
      ],
      mutationRisk: "read-only",
    };
  }

  if (input.domain === "structure-residue") {
    return {
      probeId: input.findingId,
      title: "Structure residue proof",
      goal:
        "Verify whether preserved structure cells leave stale gameplay blocks.",
      setup: [
        "Capture the relevant region before the level/structure transition.",
      ],
      steps: [
        "Trigger the structure transition.",
        "Capture the same region after placement.",
        "Check preserved-by-void cells for stale gameplay state.",
      ],
      expectedEvidence: [
        "before block state",
        "after block state",
        "transition result",
      ],
      mutationRisk: "guarded",
    };
  }

  return {
    probeId: input.findingId,
    title: "Persistent state growth proof",
    goal:
      "Determine whether persisted state grows across repeated sessions without cleanup.",
    setup: [
      "Record the target persisted property size/count before the test.",
    ],
    steps: [
      "Run the same gameplay cycle multiple times.",
      "Record persisted state after each cycle.",
      "Run the documented reset/cleanup path and record state again.",
    ],
    expectedEvidence: [
      "persisted item count per cycle",
      "persisted size per cycle",
      "post-cleanup state",
    ],
    mutationRisk: "guarded",
  };
}
