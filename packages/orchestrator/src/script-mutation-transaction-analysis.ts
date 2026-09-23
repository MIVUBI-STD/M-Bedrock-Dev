import type {
  ParsedScriptFile,
  ScriptLocalFunctionCall,
  ScriptMethodCall,
} from "../../../analyzers/scripts/src/types.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";

export type ScriptMutationOrderingStatus =
  | "verified-before-dependent"
  | "late-verification-candidate"
  | "verification-unresolved"
  | "no-dependent-action";

type ScriptTimelineEntry =
  | {
      kind: "method";
      region: string;
      call: ScriptMethodCall;
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

export interface ScriptMutationTransactionAssessment {
  id: string;
  scriptId: string;
  executionRegion: string;
  applyRegion: string;
  receiver: string;
  applyCall: ScriptMethodCall;
  dependentCall?: ScriptMethodCall;
  verificationCall?: ScriptMethodCall;
  status: ScriptMutationOrderingStatus;
  barriers: readonly ScriptTimelineEntry[];
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

function entrySource(entry: ScriptTimelineEntry): SourceRef {
  return entry.kind === "method" ? entry.call.source : entry.source;
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

function rootsForScript(script: ParsedScriptFile): string[] {
  const regions = new Set<string>([
    ...script.methodCalls.map((call) => call.executionRegion ?? "unresolved-region"),
    ...script.localFunctionCalls.map((call) => call.callerRegion),
    ...script.localFunctionCalls.map((call) => call.targetRegion),
  ]);
  const calledTargets = new Set(
    script.localFunctionCalls.map((call) => call.targetRegion),
  );

  const roots = [...regions].filter((region) =>
    region === "module" ||
    region.startsWith("callback@") ||
    !calledTargets.has(region)
  );

  return roots.length > 0
    ? roots.sort()
    : [...regions].sort();
}

function regionEvents(
  script: ParsedScriptFile,
  region: string,
): Array<
  | { kind: "method"; source: SourceRef; call: ScriptMethodCall }
  | { kind: "local-call"; source: SourceRef; call: ScriptLocalFunctionCall }
> {
  return [
    ...script.methodCalls
      .filter((call) => (call.executionRegion ?? "unresolved-region") === region)
      .map((call) => ({
        kind: "method" as const,
        source: call.source,
        call,
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
): ScriptTimelineEntry[] {
  const output: ScriptTimelineEntry[] = [];

  for (const event of regionEvents(script, region)) {
    if (event.kind === "method") {
      output.push({
        kind: "method",
        region,
        call: event.call,
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

export function analyzeScriptMutationTransactions(
  scripts: readonly ParsedScriptFile[],
  maxDepth = 16,
): ScriptMutationTransactionAssessment[] {
  const output: ScriptMutationTransactionAssessment[] = [];

  for (const script of scripts) {
    for (const rootRegion of rootsForScript(script)) {
      const timeline = expandRegion(
        script,
        rootRegion,
        [],
        0,
        maxDepth,
      );

      for (let index = 0; index < timeline.length; index += 1) {
        const entry = timeline[index];
        if (
          !entry ||
          entry.kind !== "method" ||
          !isApply(entry.call)
        ) continue;

        const apply = entry.call;
        const receiver = normalizedReceiver(apply);
        if (!receiver) continue;

        const segment: ScriptTimelineEntry[] = [];
        for (let cursor = index + 1; cursor < timeline.length; cursor += 1) {
          const candidate = timeline[cursor]!;
          if (
            candidate.kind === "method" &&
            isApply(candidate.call) &&
            normalizedReceiver(candidate.call) === receiver
          ) {
            break;
          }
          segment.push(candidate);
        }

        const dependentIndex = segment.findIndex((candidate) =>
          candidate.kind === "method" && isDependent(candidate.call)
        );
        const dependentEntry = dependentIndex >= 0
          ? segment[dependentIndex]
          : undefined;
        const dependent = dependentEntry?.kind === "method"
          ? dependentEntry.call
          : undefined;

        const id =
          "script-mutation:" +
          script.identifier +
          ":" +
          rootRegion +
          ":" +
          operationId(apply.source);

        if (!dependent) {
          output.push({
            id,
            scriptId: script.identifier,
            executionRegion: rootRegion,
            applyRegion: entry.region,
            receiver,
            applyCall: apply,
            status: "no-dependent-action",
            barriers: segment.filter((candidate) =>
              candidate.kind !== "method"
            ),
          });
          continue;
        }

        const beforeDependent = segment.slice(0, dependentIndex);
        const barriers = beforeDependent.filter(
          (candidate) => candidate.kind !== "method",
        );

        const matchesReceiver = (candidate: ScriptTimelineEntry) =>
          candidate.kind === "method" &&
          isVerification(candidate.call) &&
          normalizedReceiver(candidate.call) === receiver;

        const verifyBeforeEntry = beforeDependent.find(matchesReceiver);
        const verifyAfterEntry = segment
          .slice(dependentIndex + 1)
          .find(matchesReceiver);

        const verifyBefore = verifyBeforeEntry?.kind === "method"
          ? verifyBeforeEntry.call
          : undefined;
        const verifyAfter = verifyAfterEntry?.kind === "method"
          ? verifyAfterEntry.call
          : undefined;

        let status: ScriptMutationOrderingStatus =
          "verification-unresolved";
        let verificationCall: ScriptMethodCall | undefined;

        if (barriers.length === 0 && verifyBefore) {
          status = "verified-before-dependent";
          verificationCall = verifyBefore;
        } else if (barriers.length === 0 && verifyAfter) {
          status = "late-verification-candidate";
          verificationCall = verifyAfter;
        }

        output.push({
          id,
          scriptId: script.identifier,
          executionRegion: rootRegion,
          applyRegion: entry.region,
          receiver,
          applyCall: apply,
          dependentCall: dependent,
          ...(verificationCall === undefined
            ? {}
            : { verificationCall }),
          status,
          barriers,
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
        " from " +
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
