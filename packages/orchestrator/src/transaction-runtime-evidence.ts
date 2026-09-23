import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import type {
  TransactionOrderingFinding,
  TransactionTrace,
  TransactionTraceStep,
} from "./transaction-order-analysis.js";
import { analyzeTransactionOrdering } from "./transaction-order-analysis.js";

function operationId(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

function findingForApply(
  findings: readonly TransactionOrderingFinding[],
  apply: TransactionTraceStep,
): TransactionOrderingFinding | undefined {
  return findings.find((item) => item.applyStep.index === apply.index);
}

export function transactionRuntimeEvidence(
  trace: TransactionTrace,
): RuntimeEvidenceRecord[] {
  const findings = analyzeTransactionOrdering(trace);
  const records: RuntimeEvidenceRecord[] = [];

  for (const apply of trace.steps.filter((step) => step.stage === "APPLY")) {
    const scope = {
      operationId:
        "tx:" +
        trace.rootFunctionId +
        ":" +
        apply.callStack.join(">") +
        ":" +
        operationId(apply.source),
    };
    records.push({
      predicate: "mutation-apply",
      state: "present",
      confidence: "derived",
      scope,
      sourceRefs: [apply.source],
      note: "Transaction APPLY in " + apply.functionId,
    });

    const finding = findingForApply(findings, apply);
    if (!finding) {
      records.push({
        predicate: "transaction-verification-before-dependent-work",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [apply.source],
      });
      continue;
    }

    if (finding.kind === "dependent-before-verify") {
      records.push({
        predicate: "transaction-verification-before-dependent-work",
        state: "absent",
        confidence: "derived",
        scope,
        sourceRefs: [
          apply.source,
          ...(finding.evidenceStep ? [finding.evidenceStep.source] : []),
        ],
        note: finding.message,
      });
      records.push({
        predicate: "dependent-work-before-verify",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          apply.source,
          ...(finding.evidenceStep ? [finding.evidenceStep.source] : []),
        ],
      });
      continue;
    }

    if (
      finding.kind === "unresolved-call-after-apply" ||
      finding.kind === "call-cycle-after-apply" ||
      finding.kind === "depth-limit-after-apply"
    ) {
      records.push({
        predicate: "transaction-order-proof-incomplete",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          apply.source,
          ...(finding.evidenceStep ? [finding.evidenceStep.source] : []),
        ],
        note: finding.message,
      });
      continue;
    }

    // apply-without-verify is intentionally left without an ABSENT proof.
    // Static analysis knows VERIFY was not found in the bounded trace, but
    // cannot prove runtime verification does not happen through another path.
  }

  return records;
}
