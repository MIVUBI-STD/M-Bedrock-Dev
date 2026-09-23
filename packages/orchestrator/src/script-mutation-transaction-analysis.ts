import type { ParsedScriptFile, ScriptMethodCall } from "../../../analyzers/scripts/src/types.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";

export type ScriptMutationOrderingStatus =
  | "verified-before-dependent"
  | "late-verification-candidate"
  | "verification-unresolved"
  | "no-dependent-action";

export interface ScriptMutationTransactionAssessment {
  id: string;
  scriptId: string;
  executionRegion: string;
  receiver: string;
  applyCall: ScriptMethodCall;
  dependentCall?: ScriptMethodCall;
  verificationCall?: ScriptMethodCall;
  status: ScriptMutationOrderingStatus;
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

function normalizedReceiver(call: ScriptMethodCall): string | undefined {
  const receiver = call.receiverHint?.trim();
  if (!receiver) return undefined;
  if (
    call.receiverType === "BlockPermutation" &&
    receiver.endsWith(".permutation")
  ) {
    return receiver.slice(0, -".permutation".length);
  }
  return receiver;
}

function isApply(call: ScriptMethodCall): boolean {
  return (
    call.receiverType === "Block" &&
    (call.method === "setType" || call.method === "setPermutation")
  );
}

function isVerification(call: ScriptMethodCall): boolean {
  return (
    call.resultUse === "guard-condition" &&
    (
      (call.receiverType === "Block" && call.method === "matches") ||
      (
        call.receiverType === "BlockPermutation" &&
        call.method === "matches"
      )
    )
  );
}

function isDependent(call: ScriptMethodCall): boolean {
  return (
    (call.receiverType === "Entity" || call.receiverType === "Player") &&
    call.method === "teleport"
  );
}

export function analyzeScriptMutationTransactions(
  scripts: readonly ParsedScriptFile[],
): ScriptMutationTransactionAssessment[] {
  const output: ScriptMutationTransactionAssessment[] = [];

  for (const script of scripts) {
    const byRegion = new Map<string, ScriptMethodCall[]>();
    for (const call of script.methodCalls) {
      const region = call.executionRegion ?? "unresolved-region";
      const list = byRegion.get(region) ?? [];
      list.push(call);
      byRegion.set(region, list);
    }

    for (const [region, unsorted] of byRegion) {
      const calls = [...unsorted].sort((a, b) =>
        compareSource(a.source, b.source)
      );

      for (let index = 0; index < calls.length; index += 1) {
        const apply = calls[index];
        if (!apply || !isApply(apply)) continue;
        const receiver = normalizedReceiver(apply);
        if (!receiver) continue;

        const segment: ScriptMethodCall[] = [];
        for (let cursor = index + 1; cursor < calls.length; cursor += 1) {
          const call = calls[cursor]!;
          if (
            isApply(call) &&
            normalizedReceiver(call) === receiver
          ) {
            break;
          }
          segment.push(call);
        }

        const dependentIndex = segment.findIndex(isDependent);
        const dependent = dependentIndex >= 0
          ? segment[dependentIndex]
          : undefined;

        if (!dependent) {
          output.push({
            id:
              "script-mutation:" +
              script.identifier +
              ":" +
              region +
              ":" +
              operationId(apply.source),
            scriptId: script.identifier,
            executionRegion: region,
            receiver,
            applyCall: apply,
            status: "no-dependent-action",
          });
          continue;
        }

        const matchesReceiver = (call: ScriptMethodCall) =>
          isVerification(call) &&
          normalizedReceiver(call) === receiver;

        const verifyBefore = segment
          .slice(0, dependentIndex)
          .find(matchesReceiver);
        const verifyAfter = segment
          .slice(dependentIndex + 1)
          .find(matchesReceiver);

        let status: ScriptMutationOrderingStatus =
          "verification-unresolved";
        let verificationCall: ScriptMethodCall | undefined;

        if (verifyBefore) {
          status = "verified-before-dependent";
          verificationCall = verifyBefore;
        } else if (verifyAfter) {
          status = "late-verification-candidate";
          verificationCall = verifyAfter;
        }

        output.push({
          id:
            "script-mutation:" +
            script.identifier +
            ":" +
            region +
            ":" +
            operationId(apply.source),
          scriptId: script.identifier,
          executionRegion: region,
          receiver,
          applyCall: apply,
          dependentCall: dependent,
          ...(verificationCall === undefined
            ? {}
            : { verificationCall }),
          status,
        });
      }
    }
  }

  return output.sort((a, b) => a.id.localeCompare(b.id));
}

export function scriptMutationTransactionRuntimeEvidence(
  assessments: readonly ScriptMutationTransactionAssessment[],
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [];

  for (const item of assessments) {
    if (!item.dependentCall) continue;
    const scope = { operationId: item.id };

    records.push({
      predicate: "script-mutation-dependent-action-candidate",
      state: "present",
      confidence: "derived",
      scope,
      sourceRefs: [
        item.applyCall.source,
        item.dependentCall.source,
      ],
      note:
        item.receiver +
        " mutation precedes " +
        item.dependentCall.symbol +
        " in " +
        item.executionRegion,
    });

    if (item.status === "verified-before-dependent") {
      records.push({
        predicate: "script-verification-before-dependent-action",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyCall.source,
          item.verificationCall!.source,
          item.dependentCall.source,
        ],
      });
    } else if (item.status === "late-verification-candidate") {
      records.push({
        predicate: "script-late-verification-candidate",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyCall.source,
          item.dependentCall.source,
          item.verificationCall!.source,
        ],
        note:
          "A guard on the same block receiver appears only after the dependent action.",
      });
    }
  }

  return records;
}
