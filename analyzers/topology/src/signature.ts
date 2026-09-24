import { createHash } from "node:crypto";
import type { ResolvedEffect } from "./effect-resolution.js";
import type { Translation3 } from "../../../packages/common/src/index.js";

export type { Translation3 } from "../../../packages/common/src/index.js";

export interface EffectSignature {
  kind: ResolvedEffect["kind"];
  shapeHash: string;
  anchor: { x: number; y: number; z: number };
}

function normalizedPayload(effect: ResolvedEffect) {
  if (effect.kind === "fill" || effect.kind === "clone") {
    return {
      kind: effect.kind,
      dx: effect.to.x - effect.from.x,
      dy: effect.to.y - effect.from.y,
      dz: effect.to.z - effect.from.z,
      block: effect.kind === "fill" ? effect.block : undefined,
    };
  }
  if (effect.kind === "setblock") {
    return { kind: effect.kind, block: effect.block };
  }
  if (effect.kind === "entity-spawn") {
    return {
      kind: effect.kind,
      entityIdentifier: effect.entityIdentifier,
    };
  }
  return { kind: effect.kind, target: effect.target };
}

export function effectSignature(effect: ResolvedEffect): EffectSignature {
  const anchor =
    effect.kind === "fill" || effect.kind === "clone"
      ? effect.from
      : effect.kind === "setblock" || effect.kind === "entity-spawn"
        ? effect.position
        : effect.destination;

  const shapeHash = createHash("sha256")
    .update(JSON.stringify(normalizedPayload(effect)))
    .digest("hex")
    .slice(0, 16);

  return { kind: effect.kind, shapeHash, anchor };
}

export function translationBetween(a: EffectSignature, b: EffectSignature): Translation3 | undefined {
  if (a.kind !== b.kind || a.shapeHash !== b.shapeHash) return undefined;
  return { x: b.anchor.x - a.anchor.x, y: b.anchor.y - a.anchor.y, z: b.anchor.z - a.anchor.z };
}
