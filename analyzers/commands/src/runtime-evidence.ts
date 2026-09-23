import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { CommandAnalysis, CommandEffect } from "./effects.js";
import { flattenCommandEffects } from "./flatten.js";
import { parseStructureLoadSemantics } from "./structure-semantics.js";

function operationId(source: SourceRef): string {
  const line = source.range?.lineStart ?? 0;
  return source.artifactId + ":" + source.relativePath + ":" + line;
}

function observed(
  predicate: string,
  effect: CommandEffect,
  note?: string,
): RuntimeEvidenceRecord {
  return {
    predicate,
    state: "present",
    confidence: "observed",
    scope: { operationId: operationId(effect.source) },
    sourceRefs: [effect.source],
    ...(note === undefined ? {} : { note }),
  };
}

function evidenceFromEffect(effect: CommandEffect): RuntimeEvidenceRecord[] {
  switch (effect.kind) {
    case "structure-load":
      return [
        observed("structure-placement-request", effect, "Structure load target: " + effect.target),
        observed("world-mutation-request", effect, "Structure load target: " + effect.target),
      ];
    case "fill":
    case "setblock":
    case "clone":
      return [
        observed("block-write", effect),
        observed("world-mutation-request", effect),
      ];
    case "teleport":
      return [
        observed("teleport-destination", effect),
        observed("teleport-apply-request", effect),
        observed("teleport-apply", effect),
      ];
    case "function-call":
      return [observed("function-call", effect, "Function target: " + effect.target)];
    case "dialogue":
      return [observed("dialogue-gameplay-surface", effect)];
    case "scoreboard-access":
      return [
        observed(
          effect.access === "read" ? "scoreboard-read" : "scoreboard-write",
          effect,
          "Objective: " + effect.objective,
        ),
      ];
    case "tag-mutation":
      return [observed("tag-mutation", effect, "Tag: " + effect.tag)];
    case "entity-event-trigger":
      return [observed("entity-event-mutation-request", effect, "Event: " + effect.event)];
    case "selector-read":
      return [observed("selector-read", effect, effect.selector.raw)];
    case "nested-command":
    case "unknown":
      return [];
  }
}

export function commandRuntimeEvidence(
  analysis: CommandAnalysis,
): RuntimeEvidenceRecord[] {
  const effects = flattenCommandEffects(analysis);
  const records = effects.flatMap(evidenceFromEffect);

  const structure = parseStructureLoadSemantics(analysis.command);
  if (structure) {
    const structureEffect = effects.find(
      (effect): effect is Extract<CommandEffect, { kind: "structure-load" }> =>
        effect.kind === "structure-load",
    );
    if (structureEffect) {
      if (structure.animationMode && structure.animationMode !== "none") {
        records.push(observed(
          "animated-structure-load",
          structureEffect,
          "Animation: " + structure.animationMode,
        ));
      }
      if (structure.integrity !== undefined && structure.integrity < 100) {
        records.push(observed(
          "partial-integrity-structure-load",
          structureEffect,
          "Integrity: " + structure.integrity,
        ));
      }
      if (structure.includeEntities === true) {
        records.push(observed("structure-entities-included", structureEffect));
      } else if (structure.includeEntities === false) {
        records.push({
          predicate: "structure-entities-included",
          state: "absent",
          confidence: "observed",
          scope: { operationId: operationId(structureEffect.source) },
          sourceRefs: [structureEffect.source],
        });
      }
    }
  }

  return records;
}