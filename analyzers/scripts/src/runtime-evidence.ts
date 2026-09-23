import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { ParsedScriptFile, ScriptMethodCall } from "./types.js";

function operationId(source: SourceRef): string {
  return source.artifactId + ":" + source.relativePath + ":" + (source.range?.lineStart ?? 0);
}

function observed(
  predicate: string,
  source: SourceRef,
  note?: string,
): RuntimeEvidenceRecord {
  return {
    predicate,
    state: "present",
    confidence: "observed",
    scope: { operationId: operationId(source) },
    sourceRefs: [source],
    ...(note === undefined ? {} : { note }),
  };
}

function methodEvidence(call: ScriptMethodCall): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [
    observed("script-api-call", call.source, call.symbol),
    observed("script-call:" + call.symbol, call.source),
  ];

  if (call.receiverType === "Entity" && call.method === "teleport") {
    records.push(observed("teleport-apply-request", call.source, call.symbol));
    records.push(observed("teleport-apply", call.source, call.symbol));
  }
  if (call.receiverType === "Entity" && call.method === "applyKnockback") {
    records.push(observed("gameplay-knockback-request", call.source, call.symbol));
  }
  if (call.receiverType === "Entity" && call.method === "applyImpulse") {
    records.push(observed("gameplay-impulse-request", call.source, call.symbol));
  }
  if (call.receiverType === "Entity" && call.method === "clearVelocity") {
    records.push(observed("velocity-normalization", call.source, call.symbol));
  }
  if (call.receiverType === "Block" && (call.method === "setPermutation" || call.method === "setType")) {
    records.push(observed("block-write", call.source, call.symbol));
    records.push(observed("world-mutation-request", call.source, call.symbol));
  }
  if (call.receiverType === "PlayerInputPermissions") {
    records.push(observed("input-permission-mutation", call.source, call.symbol));
  }
  if (call.receiverType === "System" && ["run", "runTimeout", "runInterval", "runJob"].includes(call.method)) {
    records.push(observed("deferred-script-work", call.source, call.symbol));
  }
  return records;
}

export function scriptRuntimeEvidence(
  script: ParsedScriptFile,
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [{
    predicate: "script-file",
    state: "present",
    confidence: "observed",
    sourceRefs: [script.source],
    note: script.identifier,
  }];

  for (const event of script.events) {
    records.push(observed(
      event.phase === "beforeEvents" ? "before-event-subscription" :
      event.phase === "afterEvents" ? "after-event-subscription" :
      "event-subscription",
      event.source,
      event.root + "." + event.phase + "." + event.event,
    ));
  }

  for (const mutation of script.restrictedMutations) {
    records.push(observed(
      "restricted-execution-mutation-attempt",
      mutation.source,
      mutation.symbol + " in " + mutation.context + ":" + mutation.event,
    ));
  }

  for (const access of script.dynamicProperties) {
    records.push(observed(
      access.operation === "get" ? "durable-state-read" : "durable-state-write",
      access.source,
      (access.propertyId ?? "<dynamic>") + ":" + access.operation,
    ));
  }

  for (const call of script.methodCalls) {
    records.push(...methodEvidence(call));
  }

  for (const trigger of script.entityEventTriggers) {
    records.push(observed(
      "entity-event-mutation-request",
      trigger.source,
      trigger.event,
    ));
  }

  for (const command of script.commandLiterals) {
    records.push(observed(
      "script-embedded-command",
      command.source,
      command.command,
    ));
  }

  return records;
}