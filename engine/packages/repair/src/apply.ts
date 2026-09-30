import { readFile } from "node:fs/promises";
import { atomicWriteText } from "./atomic-write.js";
import { verifyPreconditions } from "./preconditions.js";
import {
  prepareMutationWorkspace,
  resolveWorkingPathSecure,
  type MutationWorkspace,
} from "./workspace.js";
import type { PatchOperation, PatchTransaction } from "./types.js";

export interface AppliedFileRollback {
  relativePath: string;
  previousText: string;
}

export interface ApplyTransactionContext {
  currentSourceFingerprint: string;
}

export interface RollbackAppliedFilesResult {
  ok: boolean;
  restoredFiles: number;
  failure?: string;
}

export interface ApplyTransactionResult {
  ok: boolean;
  appliedOperations: number;
  rollback: AppliedFileRollback[];
  failure?: string;
  rollbackFailure?: string;
}

function replaceCommandLine(
  text: string,
  operation: Extract<PatchOperation, { kind: "replace-command" }>,
): string {
  const line = operation.source.range?.lineStart;
  if (!line || line < 1) {
    throw new Error("replace-command requires a 1-based source line.");
  }
  if (/\r|\n/.test(operation.replacement)) {
    throw new Error("replace-command replacement must remain a single logical line.");
  }

  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const index = line - 1;
  if (lines[index] !== operation.expected) {
    throw new Error(`Command precondition mismatch at line ${line}.`);
  }
  lines[index] = operation.replacement;
  return lines.join(newline);
}

function applyOperation(text: string, operation: PatchOperation): string {
  if (operation.kind === "replace-command") {
    return replaceCommandLine(text, operation);
  }

  const first = text.indexOf(operation.expected);
  if (first < 0) throw new Error("Expected text not found.");
  if (text.indexOf(operation.expected, first + operation.expected.length) >= 0) {
    throw new Error("replace-text is ambiguous; expected text occurs more than once.");
  }

  return text.slice(0, first) + operation.replacement + text.slice(first + operation.expected.length);
}

export async function applyPatchTransaction(
  transaction: PatchTransaction,
  workspace: MutationWorkspace,
  context: ApplyTransactionContext,
): Promise<ApplyTransactionResult> {
  let prepared;
  try {
    prepared = await prepareMutationWorkspace(workspace);
  } catch (error) {
    return {
      ok: false,
      appliedOperations: 0,
      rollback: [],
      failure: error instanceof Error ? error.message : "WORKSPACE_PREPARATION_FAILED",
    };
  }

  const pathCache = new Map<string, string>();
  const securePath = async (relativePath: string) => {
    const existing = pathCache.get(relativePath);
    if (existing) return existing;
    const resolved = await resolveWorkingPathSecure(prepared, relativePath);
    pathCache.set(relativePath, resolved);
    return resolved;
  };

  const readWorkingText = async (relativePath: string) =>
    await readFile(await securePath(relativePath), "utf8");

  const preconditions = await verifyPreconditions(transaction.preconditions, {
    sourceFingerprint: context.currentSourceFingerprint,
    readText: readWorkingText,
  });

  if (!preconditions.ok) {
    return { ok: false, appliedOperations: 0, rollback: [], failure: "PRECONDITION_FAILED" };
  }

  const byPath = new Map<string, PatchOperation[]>();
  for (const operation of transaction.operations) {
    const path = operation.source.relativePath;
    const operations = byPath.get(path) ?? [];
    operations.push(operation);
    byPath.set(path, operations);
  }

  const rollback: AppliedFileRollback[] = [];
  let appliedOperations = 0;

  try {
    for (const [relativePath, operations] of byPath) {
      const target = await securePath(relativePath);
      const previousText = await readFile(target, "utf8");
      let nextText = previousText;

      for (const operation of operations) {
        nextText = applyOperation(nextText, operation);
        appliedOperations += 1;
      }

      rollback.push({ relativePath, previousText });
      await atomicWriteText(target, nextText);
    }
  } catch (error) {
    let rollbackFailure: string | undefined;
    for (const entry of [...rollback].reverse()) {
      try {
        const target = await resolveWorkingPathSecure(prepared, entry.relativePath);
        await atomicWriteText(target, entry.previousText);
      } catch (rollbackError) {
        rollbackFailure = rollbackError instanceof Error
          ? rollbackError.message
          : "ROLLBACK_FAILED";
        break;
      }
    }

    return {
      ok: false,
      appliedOperations: 0,
      rollback: [],
      failure: rollbackFailure ? "ROLLBACK_FAILED" : (error instanceof Error ? error.message : "TRANSACTION_FAILED"),
      ...(rollbackFailure ? { rollbackFailure } : {}),
    };
  }

  return { ok: true, appliedOperations, rollback };
}


export async function rollbackAppliedFiles(
  workspace: MutationWorkspace,
  rollback: readonly AppliedFileRollback[],
): Promise<RollbackAppliedFilesResult> {
  let prepared;
  try {
    prepared = await prepareMutationWorkspace(workspace);
  } catch (error) {
    return {
      ok: false,
      restoredFiles: 0,
      failure:
        error instanceof Error
          ? error.message
          : "WORKSPACE_PREPARATION_FAILED",
    };
  }

  let restoredFiles = 0;
  try {
    for (const entry of [...rollback].reverse()) {
      const target = await resolveWorkingPathSecure(
        prepared,
        entry.relativePath,
      );
      await atomicWriteText(target, entry.previousText);
      restoredFiles += 1;
    }
    return { ok: true, restoredFiles };
  } catch (error) {
    return {
      ok: false,
      restoredFiles,
      failure:
        error instanceof Error
          ? error.message
          : "ROLLBACK_FAILED",
    };
  }
}
