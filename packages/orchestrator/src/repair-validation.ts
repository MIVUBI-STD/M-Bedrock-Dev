import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseMcFunction } from "../../../analyzers/functions/src/index.js";
import {
  parseScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import ts from "typescript";
import { analyzeFunctionTopology } from "./topology-analysis.js";
import { inspectDirectory } from "./inspect.js";
import { summarizeValidation } from "../../validation/src/index.js";
import type {
  TransactionValidationResult,
  ValidationStep,
  ValidationStepResult,
} from "../../validation/src/index.js";
import type { PatchTransaction } from "../../repair/src/index.js";
import type { MutationWorkspace } from "../../repair/src/index.js";
import type { InspectTargetProfile } from "./types.js";

function sameSource(
  actual: { relativePath?: string; range?: { lineStart?: number } } | undefined,
  expected: ValidationStep extends infer _ ? { relativePath: string; range?: { lineStart?: number } } : never,
): boolean {
  if (!actual?.relativePath || actual.relativePath !== expected.relativePath) return false;
  const expectedLine = expected.range?.lineStart;
  if (expectedLine === undefined) return true;
  return actual.range?.lineStart === expectedLine;
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function scriptPath(path: string): boolean {
  return /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/i.test(path);
}

async function validateReparse(
  workingRoot: string,
  step: Extract<ValidationStep, { kind: "reparse" }>,
): Promise<ValidationStepResult> {
  try {
    const text = await readFile(
      join(workingRoot, step.source.relativePath),
      "utf8",
    );

    if (step.source.relativePath.endsWith(".mcfunction")) {
      parseMcFunction(
        step.source.relativePath,
        text,
        step.source,
      );
      return {
        step,
        ok: true,
        message:
          "Affected function reparsed successfully.",
      };
    }

    if (scriptPath(step.source.relativePath)) {
      const file = ts.createSourceFile(
        step.source.relativePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        scriptKind(step.source.relativePath),
      );
      const parseDiagnostics =
        file.parseDiagnostics ?? [];
      if (parseDiagnostics.length > 0) {
        return {
          step,
          ok: false,
          message:
            "Affected script has TypeScript/JavaScript parse diagnostics after mutation.",
        };
      }

      parseScriptFile(
        step.source.relativePath,
        text,
        step.source,
      );
      return {
        step,
        ok: true,
        message:
          "Affected script reparsed and analyzer extraction completed successfully.",
      };
    }

    return {
      step,
      ok: false,
      message:
        "No reparse validator is registered for this source type.",
    };
  } catch (error) {
    return {
      step,
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Reparse failed.",
    };
  }
}

export async function validatePatchTransaction(
  transaction: PatchTransaction,
  workspace: MutationWorkspace,
  target: InspectTargetProfile = {},
): Promise<TransactionValidationResult> {
  let inspection: Awaited<ReturnType<typeof inspectDirectory>> | undefined;
  let topology: ReturnType<typeof analyzeFunctionTopology> | undefined;

  const ensureInspection = async () => {
    if (!inspection) {
      inspection = await inspectDirectory(
        workspace.workingRoot,
        transaction.sourceFingerprint,
        target,
      );
    }
    return inspection;
  };

  const ensureTopology = async () => {
    if (topology) return topology;

    const parsedFunctions = [];
    for (const path of transaction.affectedPaths) {
      if (!path.endsWith(".mcfunction")) continue;
      const text = await readFile(join(workspace.workingRoot, path), "utf8");
      parsedFunctions.push(parseMcFunction(
        path,
        text,
        { artifactId: transaction.sourceFingerprint, relativePath: path },
      ));
    }

    topology = analyzeFunctionTopology(parsedFunctions);
    return topology;
  };

  const results: ValidationStepResult[] = [];

  for (const step of transaction.validation) {
    if (step.kind === "reparse") {
      results.push(await validateReparse(workspace.workingRoot, step));
      continue;
    }

    if (step.kind === "rebuild-graph") {
      try {
        await ensureInspection();
        results.push({ step, ok: true, message: "Integrated semantic graph rebuilt successfully." });
      } catch (error) {
        results.push({
          step,
          ok: false,
          message: error instanceof Error ? error.message : "Graph rebuild failed.",
        });
      }
      continue;
    }

    if (step.kind === "rerun-diagnostic") {
      try {
        const current = await ensureInspection();
        const matching = current.diagnostics.filter((finding) =>
          finding.code === step.code &&
          (!step.source || sameSource(finding.source, step.source))
        );
        results.push({
          step,
          ok: matching.length === 0,
          message: matching.length === 0
            ? `${step.code} is absent at the requested source scope.`
            : `${step.code} is still present at the requested source scope.`,
        });
      } catch (error) {
        results.push({
          step,
          ok: false,
          message: error instanceof Error ? error.message : "Diagnostic rerun failed.",
        });
      }
      continue;
    }

    if (step.kind === "topology-compare") {
      try {
        const current = await ensureTopology();
        const matching = current.linearOutliers.filter((outlier) => {
          if (outlier.sourcePath !== step.source.relativePath) return false;
          const record = current.spatialRecords[outlier.effectIndex];
          const expectedLine = step.source.range?.lineStart;
          return expectedLine === undefined ||
            record?.effect.source.range?.lineStart === expectedLine;
        });

        results.push({
          step,
          ok: matching.length === 0,
          message: matching.length === 0
            ? "Topology outlier is absent at the repaired source location."
            : "Topology outlier remains at the repaired source location.",
        });
      } catch (error) {
        results.push({
          step,
          ok: false,
          message: error instanceof Error ? error.message : "Topology comparison failed.",
        });
      }
    }
  }

  return summarizeValidation(results);
}
