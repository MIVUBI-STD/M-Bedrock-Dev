import type { PatchPrecondition } from "./types.js";

export interface PreconditionContext {
  sourceFingerprint: string;
  readText?: (path: string) => Promise<string>;
}

export interface PreconditionResult {
  ok: boolean;
  failed?: PatchPrecondition;
}

export async function verifyPreconditions(
  preconditions: readonly PatchPrecondition[],
  context: PreconditionContext,
): Promise<PreconditionResult> {
  for (const precondition of preconditions) {
    if (precondition.kind === "source-fingerprint") {
      if (context.sourceFingerprint !== precondition.expected) {
        return { ok: false, failed: precondition };
      }
      continue;
    }

    if (!precondition.source || !context.readText) {
      return { ok: false, failed: precondition };
    }

    const text = await context.readText(precondition.source.relativePath);
    if (text !== precondition.expected) {
      return { ok: false, failed: precondition };
    }
  }

  return { ok: true };
}
