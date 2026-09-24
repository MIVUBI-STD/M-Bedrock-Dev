import type {
  ParsedScriptFile,
  ScriptCommandLiteral,
  ScriptLocalFunctionCall,
} from "../../../analyzers/scripts/src/index.js";
import { analyzeCommand } from "../../../analyzers/commands/src/index.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/index.js";
import type { CommandEffect } from "../../../analyzers/commands/src/index.js";
import type { Coordinate3 } from "../../../analyzers/commands/src/index.js";
import { parseBlockVerificationSemantics } from "../../../analyzers/commands/src/index.js";
import { parseStructureLoadSemantics } from "../../../analyzers/commands/src/index.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { ParsedStructureSummary } from "./structure-runtime-analysis.js";
import {
  mutationDependentActionLabel,
  type MutationDependentActionContract,
} from "../../project-model/src/mutation-dependent-action.js";
import {
  deriveStructurePlacementBounds,
  type PlacementBounds,
} from "./structure-proof-analysis.js";

export type ScriptCommandMutationOrderingStatus =
  | "verified-before-dependent"
  | "dependent-before-verification"
  | "verification-unresolved"
  | "no-dependent-action";

type TimelineEntry =
  | {
      kind: "command";
      region: string;
      literal: ScriptCommandLiteral;
    }
  | {
      kind: "recursive-call";
      region: string;
      source: SourceRef;
      targetRegion: string;
    }
  | {
      kind: "depth-limit";
      region: string;
      source: SourceRef;
      targetRegion: string;
    };

export interface ScriptCommandMutationAssessment {
  id: string;
  scriptId: string;
  executionRegion: string;
  applyLiteral: ScriptCommandLiteral;
  dependentLiteral?: ScriptCommandLiteral;
  dependentLabel?: string;
  verificationLiteral?: ScriptCommandLiteral;
  status: ScriptCommandMutationOrderingStatus;
  barriers: readonly TimelineEntry[];
}

interface BlockBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

function position(source: SourceRef): [number, number] {
  return [
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ];
}

function compareSource(a: SourceRef, b: SourceRef): number {
  const [aLine, aColumn] = position(a);
  const [bLine, bColumn] = position(b);
  return aLine - bLine || aColumn - bColumn;
}

function operationId(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

function absolute(
  coordinate: Coordinate3 | undefined,
): { x: number; y: number; z: number } | undefined {
  if (!coordinate) return undefined;
  if (
    coordinate.x.mode !== "absolute" ||
    coordinate.y.mode !== "absolute" ||
    coordinate.z.mode !== "absolute"
  ) return undefined;
  return {
    x: coordinate.x.value,
    y: coordinate.y.value,
    z: coordinate.z.value,
  };
}

function normalizedBounds(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): BlockBounds {
  return {
    min: {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      z: Math.min(a.z, b.z),
    },
    max: {
      x: Math.max(a.x, b.x),
      y: Math.max(a.y, b.y),
      z: Math.max(a.z, b.z),
    },
  };
}

function effectBounds(
  effect: CommandEffect,
): BlockBounds | undefined {
  if (effect.kind === "setblock") {
    const point = absolute(effect.position);
    return point ? normalizedBounds(point, point) : undefined;
  }

  if (effect.kind === "fill") {
    const from = absolute(effect.region.from);
    const to = absolute(effect.region.to);
    return from && to ? normalizedBounds(from, to) : undefined;
  }

  if (effect.kind === "clone") {
    const from = absolute(effect.sourceRegion.from);
    const to = absolute(effect.sourceRegion.to);
    const destination = absolute(effect.destination);
    if (!from || !to || !destination) return undefined;

    const size = {
      x: Math.abs(to.x - from.x) + 1,
      y: Math.abs(to.y - from.y) + 1,
      z: Math.abs(to.z - from.z) + 1,
    };
    return normalizedBounds(
      destination,
      {
        x: destination.x + size.x - 1,
        y: destination.y + size.y - 1,
        z: destination.z + size.z - 1,
      },
    );
  }

  return undefined;
}

function placementToBlockBounds(
  bounds: PlacementBounds | undefined,
): BlockBounds | undefined {
  return bounds
    ? { min: bounds.min, max: bounds.max }
    : undefined;
}

function mutationBounds(
  literal: ScriptCommandLiteral,
  structures: readonly ParsedStructureSummary[],
): BlockBounds | undefined {
  const analysis = analyzeCommand(literal.command, literal.source);
  const effects = flattenCommandEffects(analysis);

  for (const effect of effects) {
    const bounds = effectBounds(effect);
    if (bounds) return bounds;
  }

  const structure = parseStructureLoadSemantics(literal.command);
  if (!structure) return undefined;

  const matches = structures.filter(
    (item) => item.identifier === structure.name,
  );
  if (matches.length !== 1) return undefined;

  return placementToBlockBounds(
    deriveStructurePlacementBounds(
      structure,
      matches[0]?.size,
    ),
  );
}

function isApply(
  literal: ScriptCommandLiteral,
): boolean {
  const effects = flattenCommandEffects(
    analyzeCommand(literal.command, literal.source),
  );
  return effects.some((effect) =>
    effect.kind === "structure-load" ||
    effect.kind === "fill" ||
    effect.kind === "setblock" ||
    effect.kind === "clone"
  );
}

function matchingDependentContract(
  literal: ScriptCommandLiteral,
  contracts: readonly MutationDependentActionContract[],
): MutationDependentActionContract | undefined {
  const effects = flattenCommandEffects(
    analyzeCommand(literal.command, literal.source),
  );

  for (const effect of effects) {
    const match = contracts.find((contract) => {
      if (
        contract.kind === "function-call" &&
        effect.kind === "function-call"
      ) {
        return contract.functionTarget === effect.target;
      }
      if (
        contract.kind === "scoreboard-write" &&
        effect.kind === "scoreboard-access" &&
        (
          effect.access === "write" ||
          effect.access === "read-write"
        )
      ) {
        return contract.objective === effect.objective;
      }
      if (
        contract.kind === "tag-write" &&
        effect.kind === "tag-mutation"
      ) {
        return contract.tag === effect.tag;
      }
      if (
        contract.kind === "entity-event" &&
        effect.kind === "entity-event-trigger"
      ) {
        return contract.event === effect.event;
      }
      if (
        contract.kind === "dialogue" &&
        effect.kind === "dialogue"
      ) {
        return contract.dialogueScene === effect.sceneName;
      }
      return false;
    });
    if (match) return match;
  }

  return undefined;
}

function dependentKind(
  literal: ScriptCommandLiteral,
  contracts: readonly MutationDependentActionContract[] = [],
): string | undefined {
  const effects = flattenCommandEffects(
    analyzeCommand(literal.command, literal.source),
  );
  if (effects.some((effect) => effect.kind === "teleport")) {
    return "teleport";
  }
  if (effects.some((effect) => effect.kind === "entity-spawn")) {
    return "entity-spawn";
  }
  const contract = matchingDependentContract(
    literal,
    contracts,
  );
  return contract
    ? mutationDependentActionLabel(contract)
    : undefined;
}

function isDependent(
  literal: ScriptCommandLiteral,
  contracts: readonly MutationDependentActionContract[] = [],
): boolean {
  return dependentKind(literal, contracts) !== undefined;
}

function inside(
  bounds: BlockBounds,
  position: { x: number; y: number; z: number },
): boolean {
  return (
    position.x >= bounds.min.x &&
    position.x <= bounds.max.x &&
    position.y >= bounds.min.y &&
    position.y <= bounds.max.y &&
    position.z >= bounds.min.z &&
    position.z <= bounds.max.z
  );
}

function dependentIsGatedVerification(
  apply: ScriptCommandLiteral,
  dependent: ScriptCommandLiteral,
  structures: readonly ParsedStructureSummary[],
): boolean {
  const bounds = mutationBounds(apply, structures);
  if (!bounds) return false;

  const verification = parseBlockVerificationSemantics(
    dependent.command,
  );
  if (!verification?.gatesDependentCommand) return false;

  const point = absolute(verification.position);
  return point !== undefined && inside(bounds, point);
}

function verificationMatchesApply(
  apply: ScriptCommandLiteral,
  candidate: ScriptCommandLiteral,
  structures: readonly ParsedStructureSummary[],
): boolean {
  const bounds = mutationBounds(apply, structures);
  if (!bounds) return false;

  const verification = parseBlockVerificationSemantics(
    candidate.command,
  );
  if (!verification?.gatesDependentCommand) return false;

  const point = absolute(verification.position);
  return point !== undefined && inside(bounds, point);
}

function executableCommandLiterals(
  script: ParsedScriptFile,
): ScriptCommandLiteral[] {
  return script.commandLiterals.filter((literal) =>
    literal.mechanism === "runCommand" ||
    literal.mechanism === "runCommandAsync"
  );
}

function rootsForScript(script: ParsedScriptFile): string[] {
  const literals = executableCommandLiterals(script);
  const regions = new Set<string>([
    ...literals.map((literal) => literal.executionRegion ?? "unresolved-region"),
    ...script.localFunctionCalls.map((call) => call.callerRegion),
    ...script.localFunctionCalls.map((call) => call.targetRegion),
  ]);
  // Named functions are not assumed runtime entrypoints merely because
  // nothing in this file calls them; they may be dead code or externally
  // exported. Module execution and engine/callback regions are the only
  // statically justified roots here.
  return [...regions]
    .filter((region) =>
      region === "module" ||
      region.startsWith("callback@")
    )
    .sort();
}

function regionEvents(
  script: ParsedScriptFile,
  region: string,
): Array<
  | {
      kind: "command";
      source: SourceRef;
      literal: ScriptCommandLiteral;
    }
  | {
      kind: "local-call";
      source: SourceRef;
      call: ScriptLocalFunctionCall;
    }
> {
  return [
    ...executableCommandLiterals(script)
      .filter(
        (literal) =>
          (literal.executionRegion ?? "unresolved-region") === region,
      )
      .map((literal) => ({
        kind: "command" as const,
        source: literal.source,
        literal,
      })),
    ...script.localFunctionCalls
      .filter((call) => call.callerRegion === region)
      .map((call) => ({
        kind: "local-call" as const,
        source: call.source,
        call,
      })),
  ].sort((a, b) => compareSource(a.source, b.source));
}

function expandRegion(
  script: ParsedScriptFile,
  region: string,
  stack: readonly string[],
  depth: number,
  maxDepth: number,
): TimelineEntry[] {
  const output: TimelineEntry[] = [];

  for (const event of regionEvents(script, region)) {
    if (event.kind === "command") {
      output.push({
        kind: "command",
        region,
        literal: event.literal,
      });
      continue;
    }

    const target = event.call.targetRegion;
    if (stack.includes(target) || target === region) {
      output.push({
        kind: "recursive-call",
        region,
        source: event.source,
        targetRegion: target,
      });
      continue;
    }

    if (depth >= maxDepth) {
      output.push({
        kind: "depth-limit",
        region,
        source: event.source,
        targetRegion: target,
      });
      continue;
    }

    output.push(...expandRegion(
      script,
      target,
      [...stack, region],
      depth + 1,
      maxDepth,
    ));
  }

  return output;
}

export function analyzeScriptCommandMutationTransactions(
  scripts: readonly ParsedScriptFile[],
  structures: readonly ParsedStructureSummary[] = [],
  dependentContractsOrMaxDepth:
    | readonly MutationDependentActionContract[]
    | number = [],
  maxDepth = 16,
): ScriptCommandMutationAssessment[] {
  const dependentContracts =
    typeof dependentContractsOrMaxDepth === "number"
      ? []
      : dependentContractsOrMaxDepth;
  const effectiveMaxDepth =
    typeof dependentContractsOrMaxDepth === "number"
      ? dependentContractsOrMaxDepth
      : maxDepth;

  const output: ScriptCommandMutationAssessment[] = [];

  for (const script of scripts) {
    for (const root of rootsForScript(script)) {
      const timeline = expandRegion(
        script,
        root,
        [],
        0,
        effectiveMaxDepth,
      );

      for (let index = 0; index < timeline.length; index += 1) {
        const applyEntry = timeline[index];
        if (
          !applyEntry ||
          applyEntry.kind !== "command" ||
          !isApply(applyEntry.literal)
        ) continue;

        const segment: TimelineEntry[] = [];
        for (
          let cursor = index + 1;
          cursor < timeline.length;
          cursor += 1
        ) {
          const item = timeline[cursor]!;
          if (item.kind === "command" && isApply(item.literal)) break;
          segment.push(item);
        }

        const dependentIndex = segment.findIndex(
          (item) =>
            item.kind === "command" &&
            isDependent(
              item.literal,
              dependentContracts,
            ),
        );
        const dependentEntry = dependentIndex >= 0
          ? segment[dependentIndex]
          : undefined;
        const dependent = dependentEntry?.kind === "command"
          ? dependentEntry.literal
          : undefined;

        const id =
          "script-command-mutation:" +
          script.identifier +
          ":" +
          root +
          ":" +
          operationId(applyEntry.literal.source);

        if (!dependent) {
          const barriers = segment.filter((item) => item.kind !== "command");
          output.push({
            id,
            scriptId: script.identifier,
            executionRegion: root,
            applyLiteral: applyEntry.literal,
            status: barriers.length > 0
              ? "verification-unresolved"
              : "no-dependent-action",
            barriers,
          });
          continue;
        }

        const barriers = segment
          .slice(0, dependentIndex)
          .filter((item) => item.kind !== "command");

        const verified =
          barriers.length === 0 &&
          dependentIsGatedVerification(
            applyEntry.literal,
            dependent,
            structures,
          );

        let lateVerification: ScriptCommandLiteral | undefined;
        if (!verified) {
          const afterDependent = segment.slice(dependentIndex + 1);
          for (let offset = 0; offset < afterDependent.length; offset += 1) {
            const candidate = afterDependent[offset]!;
            const prior = afterDependent.slice(0, offset);
            if (prior.some((item) => item.kind !== "command")) break;
            if (
              candidate.kind === "command" &&
              verificationMatchesApply(
                applyEntry.literal,
                candidate.literal,
                structures,
              )
            ) {
              lateVerification = candidate.literal;
              break;
            }
          }
        }

        output.push({
          id,
          scriptId: script.identifier,
          executionRegion: root,
          applyLiteral: applyEntry.literal,
          dependentLiteral: dependent,
          dependentLabel:
            dependentKind(
              dependent,
              dependentContracts,
            ) ?? "unknown",
          ...(lateVerification === undefined
            ? {}
            : { verificationLiteral: lateVerification }),
          status: verified
            ? "verified-before-dependent"
            : lateVerification
              ? "dependent-before-verification"
              : "verification-unresolved",
          barriers,
        });
      }
    }
  }

  return output.sort((a, b) => a.id.localeCompare(b.id));
}

export function scriptCommandMutationRuntimeEvidence(
  assessments: readonly ScriptCommandMutationAssessment[],
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [];

  for (const item of assessments) {
    if (
      item.status === "verification-unresolved" &&
      item.barriers.length > 0
    ) {
      records.push({
        predicate: "transaction-order-proof-incomplete",
        state: "present",
        confidence: "derived",
        scope: { operationId: item.id },
        sourceRefs: [
          item.applyLiteral.source,
          ...item.barriers.map((barrier) =>
            barrier.kind === "command" ? barrier.literal.source : barrier.source
          ),
        ],
        note:
          "Script command ordering is blocked by recursive or depth-limited local calls.",
      });
    }

    if (!item.dependentLiteral) continue;
    const scope = { operationId: item.id };

    records.push({
      predicate: "script-mutation-dependent-action-candidate",
      state: "present",
      confidence: "derived",
      scope,
      sourceRefs: [
        item.applyLiteral.source,
        item.dependentLiteral.source,
      ],
      note:
        "Literal command mutation precedes dependent action: " +
        (item.dependentLabel ?? "unknown") +
        ".",
    });

    if (item.status === "verified-before-dependent") {
      records.push({
        predicate: "script-verification-before-dependent-action",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyLiteral.source,
          item.dependentLiteral.source,
        ],
        note:
          "The dependent action is inside a gated block verification command.",
      });
    } else if (
      item.status === "dependent-before-verification" &&
      item.verificationLiteral
    ) {
      records.push({
        predicate: "script-verification-before-dependent-action",
        state: "absent",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyLiteral.source,
          item.dependentLiteral.source,
          item.verificationLiteral.source,
        ],
        note:
          "A matching gated block verification occurs only after the dependent action.",
      });
    }
  }

  return records;
}
