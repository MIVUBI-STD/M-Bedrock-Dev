import type {
  InspectArtifactResult,
} from "./inspect-artifact.js";
import {
  deriveArenaRuntimeAdapterRequirements,
} from "./arena-runtime-adapter-requirements.js";

export interface ArenaRuntimeAdapterScaffold {
  schemaVersion: 1;
  requirements: ReturnType<
    typeof deriveArenaRuntimeAdapterRequirements
  >;
  javascript: string;
}

function jsString(
  value: string,
): string {
  return JSON.stringify(value);
}

function methodStub(
  name: string,
  params: readonly string[],
  body: readonly string[],
): string {
  return [
    "  " +
      name +
      "(" +
      params.join(", ") +
      ") {",
    ...body.map(
      (line) => "    " + line,
    ),
    "  },",
  ].join("\n");
}

export function buildArenaRuntimeAdapterScaffold(
  result: InspectArtifactResult,
): ArenaRuntimeAdapterScaffold {
  const requirements =
    deriveArenaRuntimeAdapterRequirements(
      result,
    );
  const hooks =
    new Set(
      requirements.requiredHooks,
    );

  const lines: string[] = [
    'import { world } from "@minecraft/server";',
    "",
    "/**",
    " * Generated map-specific Runtime Lab adapter scaffold.",
    " *",
    " * Replace each TODO with the real authored map entrypoint/state.",
    " * Keep arena/generation scope explicit; never broaden selectors only",
    " * to make the experiment pass.",
    " */",
    "export const MAP_ADAPTER = {",
    '  proofAuthority: "server-simulated",',
    "",
    "  supportedBaselineSurfaces: " +
      JSON.stringify(
        requirements
          .requiredBaselineSurfaces,
        null,
        2,
      )
        .split("\n")
        .join("\n  ") +
      ",",
    "",
  ];

  if (hooks.has("resetArena")) {
    lines.push(
      methodStub(
        "resetArena",
        [
          "arenaId",
          "arenaGeneration",
        ],
        [
          'throw new Error("TODO: bind resetArena to the authored map reset path.");',
        ],
      ),
      "",
    );
  }

  if (hooks.has("startArena")) {
    lines.push(
      methodStub(
        "startArena",
        [
          "arenaId",
          "arenaGeneration",
          "playerCount",
        ],
        [
          'throw new Error("TODO: bind startArena to the authored per-arena start transaction.");',
        ],
      ),
      "",
    );
  }

  if (hooks.has("finishArena")) {
    lines.push(
      methodStub(
        "finishArena",
        [
          "arenaId",
          "arenaGeneration",
        ],
        [
          'throw new Error("TODO: bind finishArena to the authored terminal/cleanup path.");',
        ],
      ),
      "",
    );
  }

  if (hooks.has("staggeredJoin")) {
    lines.push(
      methodStub(
        "staggeredJoin",
        [
          "arenaId",
          "arenaGeneration",
          "playerCount",
        ],
        [
          'throw new Error("TODO: drive the authored join/assignment path for the requested arena.");',
        ],
      ),
      "",
    );
  }

  if (hooks.has("disconnectPlayer")) {
    lines.push(
      methodStub(
        "disconnectPlayer",
        [
          "playerKey",
          "scope",
          "phase",
        ],
        requirements
          .liveClientLifecycleRequired
          ? [
              'throw new Error("Live client disconnect/reconnect proof requires an external multi-client adapter; do not emulate it with tags here.");',
            ]
          : [
              'throw new Error("TODO: implement the map-specific server-side disconnect reconciliation fixture.");',
            ],
      ),
      "",
    );
  }

  if (hooks.has("captureArenaBaseline")) {
    lines.push(
      methodStub(
        "captureArenaBaseline",
        [
          "arenaId",
          "arenaGeneration",
          "compareSurfaces",
        ],
        [
          "return {",
          "  arenaId,",
          "  arenaGeneration,",
          "  compareSurfaces: [...compareSurfaces],",
          "  // TODO: capture exact baseline values for every supported surface.",
          "};",
        ],
      ),
      "",
    );
  }

  if (hooks.has("compareArenaBaseline")) {
    lines.push(
      methodStub(
        "compareArenaBaseline",
        ["baseline"],
        [
          "return {",
          "  matches: false,",
          "  complete: false,",
          "  unsupportedSurfaces: baseline.compareSurfaces ?? [],",
          "  actualPlayers: -1,",
          "  residueCount: -1,",
          "};",
        ],
      ),
      "",
    );
  }

  if (hooks.has("executeArenaCycle")) {
    lines.push(
      methodStub(
        "executeArenaCycle",
        [
          "arenaId",
          "arenaGeneration",
          "playerCount",
        ],
        [
          "this.startArena(arenaId, arenaGeneration, playerCount);",
          "this.finishArena(arenaId, arenaGeneration);",
        ],
      ),
      "",
    );
  }

  lines.push("};", "");

  if (
    requirements.requiredGlobalResources
      .length > 0
  ) {
    lines.push(
      "// World-global resources requiring generation-scoped ownership:",
      ...requirements.requiredGlobalResources.map(
        (resource) =>
          "// - " +
          jsString(resource),
      ),
      "",
      "// Implement/verify acquire, stale-owner cleanup rejection, and final baseline restore",
      "// through the Runtime Lab worldstate lease action provider.",
      "",
    );
  }

  if (
    requirements.liveClientLifecycleRequired
  ) {
    lines.push(
      "// IMPORTANT: this map requires real client lifecycle validation.",
      "// Keep MAP_ADAPTER.proofAuthority as server-simulated for server-only hooks.",
      "// Use an external multi-client controller for live disconnect/reconnect authority.",
      "",
    );
  }

  return {
    schemaVersion: 1,
    requirements,
    javascript:
      lines.join("\n"),
  };
}
