import {
  analyzeCommand,
  flattenCommandEffects,
  type CommandEffect,
  type ParsedSelector,
} from "../../../../analyzers/commands/src/index.js";
import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";

export type CommandRelativeContextStatus =
  | "not-used"
  | "proven"
  | "unresolved";

export interface CommandContextAssessment {
  readonly scriptId: string;
  readonly executionRegion: string;
  readonly command: string;
  readonly tracedModifiers:
    readonly string[];
  readonly bareGlobalSelectors:
    readonly string[];
  readonly tagOnlySelectors:
    readonly string[];
  readonly relativeContext:
    CommandRelativeContextStatus;
}

export interface CommandContextAnalysis {
  readonly commands: number;
  readonly tracedExecuteCommands: number;
  readonly bareGlobalMutationCandidates: number;
  readonly tagOnlyMembershipCandidates: number;
  readonly relativeContextUnresolved: number;
  readonly assessments:
    readonly CommandContextAssessment[];
}

function coordinateModes(
  effect: CommandEffect,
): string[] {
  const fromCoordinate = (
    value:
      | {
          x: { mode: string };
          y: { mode: string };
          z: { mode: string };
        }
      | undefined,
  ) =>
    value === undefined
      ? []
      : [
          value.x.mode,
          value.y.mode,
          value.z.mode,
        ];

  switch (effect.kind) {
    case "teleport":
      return fromCoordinate(
        effect.destination,
      );
    case "entity-spawn":
    case "structure-load":
      return fromCoordinate(
        effect.position,
      );
    case "setblock":
      return fromCoordinate(
        effect.position,
      );
    case "fill":
      return [
        ...fromCoordinate(
          effect.region.from,
        ),
        ...fromCoordinate(
          effect.region.to,
        ),
      ];
    case "clone":
      return [
        ...fromCoordinate(
          effect.sourceRegion.from,
        ),
        ...fromCoordinate(
          effect.sourceRegion.to,
        ),
        ...fromCoordinate(
          effect.destination,
        ),
      ];
    default:
      return [];
  }
}

function mutatingEffect(
  effect: CommandEffect,
): boolean {
  return (
    effect.kind === "teleport" ||
    effect.kind === "entity-spawn" ||
    effect.kind === "fill" ||
    effect.kind === "setblock" ||
    effect.kind === "clone" ||
    effect.kind === "structure-load" ||
    (
      effect.kind ===
        "scoreboard-access" &&
      effect.access !== "read"
    ) ||
    effect.kind === "tag-mutation" ||
    effect.kind ===
      "entity-event-trigger" ||
    effect.kind === "dialogue"
  );
}

function tagOnly(
  selector: ParsedSelector,
): boolean {
  const keys =
    Object.keys(selector.arguments);
  return (
    selector.tags.length > 0 &&
    keys.length > 0 &&
    keys.every((key) =>
      key === "tag"
    )
  );
}

export function analyzeCommandContext(
  scripts: readonly ParsedScriptFile[],
  multiArena: boolean,
): CommandContextAnalysis {
  const assessments:
    CommandContextAssessment[] = [];

  for (const script of scripts) {
    for (
      const literal of
        script.commandLiterals
    ) {
      const analysis =
        analyzeCommand(
          literal.command,
          literal.source,
        );
      const effects =
        flattenCommandEffects(
          analysis,
        );
      const selectors =
        effects.flatMap((effect) =>
          effect.kind ===
            "selector-read"
            ? [effect.selector]
            : []
        );
      const hasMutation =
        effects.some(mutatingEffect);
      const bareGlobalSelectors =
        !hasMutation || !multiArena
          ? []
          : [
              ...new Set(
                selectors
                  .filter(
                    (selector) =>
                      (
                        selector.base ===
                          "@a" ||
                        selector.base ===
                          "@e"
                      ) &&
                      Object.keys(
                        selector.arguments,
                      ).length === 0,
                  )
                  .map((selector) =>
                    selector.raw
                  ),
              ),
            ].sort();
      const tagOnlySelectors =
        !hasMutation || !multiArena
          ? []
          : [
              ...new Set(
                selectors
                  .filter(tagOnly)
                  .map((selector) =>
                    selector.raw
                  ),
              ),
            ].sort();

      const modes =
        effects.flatMap(
          coordinateModes,
        );
      const usesRelative =
        modes.includes("relative");
      const usesLocal =
        modes.includes("local");
      const modifierKinds =
        new Set(
          analysis.contextTrace
            ?.modifiers.map(
              (item) =>
                item.kind,
            ) ?? [],
        );
      const positionProven =
        modifierKinds.has("at") ||
        modifierKinds.has(
          "positioned",
        );
      const rotationProven =
        modifierKinds.has(
          "rotated",
        );
      const anchorProven =
        modifierKinds.has(
          "anchored",
        );

      const relativeContext:
        CommandRelativeContextStatus =
        !usesRelative && !usesLocal
          ? "not-used"
          : usesLocal
            ? (
                positionProven &&
                rotationProven &&
                anchorProven
                  ? "proven"
                  : "unresolved"
              )
            : positionProven
              ? "proven"
              : "unresolved";

      assessments.push({
        scriptId:
          script.identifier,
        executionRegion:
          literal.executionRegion ??
          "module",
        command:
          literal.command,
        tracedModifiers:
          analysis.contextTrace
            ?.modifiers.map(
              (item) =>
                item.kind +
                "=" +
                item.value,
            ) ?? [],
        bareGlobalSelectors,
        tagOnlySelectors,
        relativeContext,
      });
    }
  }

  return {
    commands:
      assessments.length,
    tracedExecuteCommands:
      assessments.filter(
        (item) =>
          item.tracedModifiers.length >
          0,
      ).length,
    bareGlobalMutationCandidates:
      assessments.filter(
        (item) =>
          item.bareGlobalSelectors
            .length > 0,
      ).length,
    tagOnlyMembershipCandidates:
      assessments.filter(
        (item) =>
          item.tagOnlySelectors
            .length > 0,
      ).length,
    relativeContextUnresolved:
      assessments.filter(
        (item) =>
          item.relativeContext ===
          "unresolved",
      ).length,
    assessments,
  };
}

export function commandContextDiagnostics(
  analysis: CommandContextAnalysis,
): DiagnosticFinding[] {
  const output:
    DiagnosticFinding[] = [];

  for (
    const item of
      analysis.assessments
  ) {
    if (
      item.bareGlobalSelectors
        .length > 0
    ) {
      output.push(
        createDiagnostic({
          code:
            "COMMAND_SELECTOR_GLOBAL_SCOPE",
          severity: "minor",
          message:
            "A mutating command in a multi-arena context uses bare global selector(s) without project-owned arena/generation scope.",
          data: {
            scriptId:
              item.scriptId,
            executionRegion:
              item.executionRegion,
            selectors:
              [...item.bareGlobalSelectors],
            command:
              item.command,
          },
        }),
      );
    }

    if (
      item.tagOnlySelectors.length >
      0
    ) {
      output.push(
        createDiagnostic({
          code:
            "COMMAND_SELECTOR_STALE_TAG_SCOPE",
          severity: "info",
          message:
            "A mutating multi-arena command uses tag-only selector membership; current arena/generation ownership remains unproven.",
          data: {
            scriptId:
              item.scriptId,
            executionRegion:
              item.executionRegion,
            selectors:
              [...item.tagOnlySelectors],
            command:
              item.command,
          },
        }),
      );
    }

    if (
      item.relativeContext ===
      "unresolved"
    ) {
      output.push(
        createDiagnostic({
          code:
            "COMMAND_RELATIVE_ORIGIN_UNPROVEN",
          severity: "info",
          message:
            "A command uses relative/local coordinates without a fully explicit execute position/rotation/anchor context trace.",
          data: {
            scriptId:
              item.scriptId,
            executionRegion:
              item.executionRegion,
            command:
              item.command,
            tracedModifiers:
              [...item.tracedModifiers],
          },
        }),
      );
    }
  }

  return output.sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}
