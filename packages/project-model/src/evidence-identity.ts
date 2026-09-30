import { createHash } from "node:crypto";
import type {
  SourceRef,
} from "./source-ref.js";

export type EvidenceIdentityKind =
  | "source"
  | "structure"
  | "world-db"
  | "runtime"
  | "tester"
  | "validation";

export interface EvidenceIdentityInput {
  kind: EvidenceIdentityKind;
  subject: string;
  source?: SourceRef;
  provenanceKey?: string;
  targetProfileFingerprint?: string;
  scopeKey?: string;
  revision?: string;
}

function stableSource(
  source: SourceRef | undefined,
): unknown {
  if (!source) return null;
  return {
    artifactId: source.artifactId,
    relativePath:
      source.relativePath.replaceAll("\\", "/"),
    range: source.range ?? null,
    jsonPointer: source.jsonPointer ?? null,
  };
}

export function evidenceIdentity(
  input: EvidenceIdentityInput,
): string {
  const payload = JSON.stringify({
    kind: input.kind,
    subject: input.subject.trim(),
    source: stableSource(input.source),
    provenanceKey:
      input.provenanceKey?.trim() ?? null,
    targetProfileFingerprint:
      input.targetProfileFingerprint?.trim() ?? null,
    scopeKey: input.scopeKey?.trim() ?? null,
    revision: input.revision?.trim() ?? null,
  });

  return (
    "evidence_" +
    createHash("sha256")
      .update(payload)
      .digest("hex")
      .slice(0, 24)
  );
}

export function evidenceIdentitySet(
  inputs: readonly EvidenceIdentityInput[],
): readonly string[] {
  return [
    ...new Set(
      inputs.map(evidenceIdentity),
    ),
  ].sort();
}
