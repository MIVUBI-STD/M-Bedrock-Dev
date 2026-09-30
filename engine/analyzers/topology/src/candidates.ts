import { createHash } from "node:crypto";
import type { ResolvedEffect } from "./effect-resolution.js";
import { effectSignature, translationBetween, type Translation3 } from "./signature.js";

export type TopologyConfidence = "low" | "medium" | "high";

export interface TopologyMember {
  effectIndex: number;
  sourcePath: string;
  translationFromBase: Translation3;
}

export interface TopologyCandidate {
  id: string;
  baseEffectIndex: number;
  shapeHash: string;
  kind: ResolvedEffect["kind"];
  members: TopologyMember[];
  confidence: TopologyConfidence;
  evidenceCount: number;
}

function translationKey(t: Translation3): string {
  return `${t.x},${t.y},${t.z}`;
}

function candidateId(kind: string, shapeHash: string, members: readonly TopologyMember[]): string {
  const payload = JSON.stringify({
    kind,
    shapeHash,
    members: members.map((m) => [m.effectIndex, translationKey(m.translationFromBase)]),
  });
  return `topo_${createHash("sha256").update(payload).digest("hex").slice(0, 16)}`;
}

function confidenceFor(count: number): TopologyConfidence {
  if (count >= 5) return "high";
  if (count >= 3) return "medium";
  return "low";
}

export function deriveTopologyCandidates(
  effects: readonly ResolvedEffect[],
): TopologyCandidate[] {
  const signatures = effects.map(effectSignature);
  const candidates: TopologyCandidate[] = [];

  for (let baseIndex = 0; baseIndex < effects.length; baseIndex += 1) {
    const baseSig = signatures[baseIndex]!;
    const members: TopologyMember[] = [{
      effectIndex: baseIndex,
      sourcePath: effects[baseIndex]!.sourcePath,
      translationFromBase: { x: 0, y: 0, z: 0 },
    }];

    for (let i = 0; i < effects.length; i += 1) {
      if (i === baseIndex) continue;
      const translation = translationBetween(baseSig, signatures[i]!);
      if (!translation) continue;
      members.push({
        effectIndex: i,
        sourcePath: effects[i]!.sourcePath,
        translationFromBase: translation,
      });
    }

    if (members.length < 2) continue;

    candidates.push({
      id: candidateId(baseSig.kind, baseSig.shapeHash, members),
      baseEffectIndex: baseIndex,
      shapeHash: baseSig.shapeHash,
      kind: baseSig.kind,
      members,
      confidence: confidenceFor(members.length),
      evidenceCount: members.length,
    });
  }

  const unique = new Map<string, TopologyCandidate>();
  for (const candidate of candidates) {
    const membershipKey = candidate.members.map((m) => m.effectIndex).sort((a,b)=>a-b).join(",");
    if (!unique.has(membershipKey)) unique.set(membershipKey, candidate);
  }

  return [...unique.values()];
}
