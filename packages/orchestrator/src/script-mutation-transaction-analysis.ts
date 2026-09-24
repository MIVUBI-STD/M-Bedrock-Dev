import type {
  ParsedScriptFile,
  ScriptLocalFunctionCall,
  ScriptMethodCall,
} from "../../../analyzers/scripts/src/index.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import {
  mutationDependentActionLabel,
  type MutationDependentActionContract,
} from "../../project-model/src/mutation-dependent-action.js";

export type ScriptMutationOrderingStatus =
  | "verified-before-dependent"
  | "dependent-before-verification"
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
  dependentLabel?: string;
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

function sourceInside(inner: SourceRef, outer: SourceRef): boolean {
  const innerStartLine = inner.range?.lineStart;
  const innerEndLine = inner.range?.lineEnd;
  const outerStartLine = outer.range?.lineStart;
  const outerEndLine = outer.range?.lineEnd;
  if (
    innerStartLine === undefined ||
    innerEndLine === undefined ||
    outerStartLine === undefined ||
    outerEndLine === undefined
  ) return false;

  const innerStartColumn = inner.range?.columnStart ?? 0;
  const innerEndColumn = inner.range?.columnEnd ?? Number.MAX_SAFE_INTEGER;
  const outerStartColumn = outer.range?.columnStart ?? 0;
  const outerEndColumn = outer.range?.columnEnd ?? Number.MAX_SAFE_INTEGER;

  const startsInside =
    innerStartLine > outerStartLine ||
    (
      innerStartLine === outerStartLine &&
      innerStartColumn >= outerStartColumn
    );
  const endsInside =
    innerEndLine < outerEndLine ||
    (
      innerEndLine === outerEndLine &&
      innerEndColumn <= outerEndColumn
    );
  return startsInside && endsInside;
}

function normalizedGuardReceiver(
  receiverType: "Block" | "BlockPermutation",
  receiverHint: string,
): string {
  if (
    receiverType === "BlockPermutation" &&
    receiverHint.endsWith(".permutation")
  ) {
    return receiverHint.slice(0, -".permutation".length);
  }
  return receiverHint;
}

function verificationGuardsDependent(
  script: ParsedScriptFile,
  verification: ScriptMethodCall,
  dependent: ScriptMethodCall,
  receiver: string,
): boolean {
  return script.blockMatchGuards.some((guard) =>
    normalizedGuardReceiver(
      guard.receiverType,
      guard.receiverHint,
    ) === receiver &&
    sourceInside(verification.source, guard.conditionSource) &&
    sourceInside(dependent.source, guard.guardedSource)
  );
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

function dependentLabel(
  call: ScriptMethodCall,
  contracts: readonly MutationDependentActionContract[],
): string | undefined {
  if (
    (call.receiverType === "Entity" || call.receiverType === "Player") &&
    call.method === "teleport"
  ) {
    return "teleport";
  }
  if (
    call.receiverType === "Dimension" &&
    call.method === "spawnEntity"
  ) {
    return "entity-spawn";
  }

  const contract = contracts.find(
    (item) =>
      item.kind === "script-method" &&
      item.scriptSymbol === call.symbol,
  );
  return contract
    ? mutationDependentActionLabel(contract)
    : undefined;
}

function isDependent(
  call: ScriptMethodCall,
  contracts: readonly MutationDependentActionContract[],
): boolean {
  return dependentLabel(call, contracts) !== undefined;
}

function rootsForScript(script: ParsedScriptFile): string[] {
  const regions = new Set<string>([
    ...script.methodCalls.map(
      (call) => call.executionRegion ?? "unresolved-region",
    ),
    ...script.localFunctionCalls.map((call) => call.callerRegion),
    ...script.localFunctionCalls.map((call) => call.targetRegion),
  ]);

  // A named function is not a runtime entrypoint just because nothing in the
  // current file calls it. It may be dead code or externally exported.
  // Module execution and callbacks are the statically justified roots here.
  return [...regions]
    .filter((region) =>
      region === "module" ||
      region.startsWith("callback@")
    )
    .sort();
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
  dependentContractsOrMaxDepth:
    | readonly MutationDependentActionContract[]
    | number = [],
  maxDepth = 16,
): ScriptMutationTransactionAssessment[] {
  const dependentContracts =
    typeof dependentContractsOrMaxDepth === "number"
      ? []
      : dependentContractsOrMaxDepth;
  const effectiveMaxDepth =
    typeof dependentContractsOrMaxDepth === "number"
      ? dependentContractsOrMaxDepth
      : maxDepth;

  const output: ScriptMutationTransactionAssessment[] = [];

  for (const script of scripts) {
    for (const rootRegion of rootsForScript(script)) {
      const timeline = expandRegion(
        script,
        rootRegion,
        [],
        0,
        effectiveMaxDepth,
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
          candidate.kind === "method" &&
          isDependent(
            candidate.call,
            dependentContracts,
          )
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
          const barriers = segment.filter((candidate) =>
            candidate.kind !== "method"
          );
          output.push({
            id,
            scriptId: script.identifier,
            executionRegion: rootRegion,
            applyRegion: entry.region,
            receiver,
            applyCall: apply,
            status: barriers.length > 0
              ? "verification-unresolved"
              : "no-dependent-action",
            barriers,
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

        const verifyBeforeEntry = beforeDependent.find((candidate) =>
          matchesReceiver(candidate) &&
          candidate.kind === "method" &&
          verificationGuardsDependent(
            script,
            candidate.call,
            dependent,
            receiver,
          )
        );
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
          status = "dependent-before-verification";
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
          dependentLabel:
            dependentLabel(
              dependent,
              dependentContracts,
            ) ?? "unknown",
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
    if (
      item.status === "verification-unresolved" &&
      item.barriers.length > 0
    ) {
      records.push({
        predicate: "transaction-order-proof-incomplete",
        state: "present",
        confidence: "derived",
        scope: { operationId: item.id },
        sourceRefs: [
          item.applyCall.source,
          ...item.barriers.map((barrier) =>
            barrier.kind === "method" ? barrier.call.source : barrier.source
          ),
        ],
        note:
          "Script mutation ordering is blocked by recursive or depth-limited local calls.",
      });
    }

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
        (item.dependentLabel ?? item.dependentCall.symbol) +
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
    } else if (item.status === "dependent-before-verification") {
      records.push({
        predicate: "script-verification-before-dependent-action",
        state: "absent",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyCall.source,
          item.dependentCall.source,
          item.verificationCall!.source,
        ],
        note:
          "Verification on the same mutation receiver occurs only after the dependent action.",
      });
      records.push({
        predicate: "script-dependent-before-verification",
        state: "present",
        confidence: "derived",
        scope,
        sourceRefs: [
          item.applyCall.source,
          item.dependentCall.source,
          item.verificationCall!.source,
        ],
      });
    }
  }

  return records;
}
