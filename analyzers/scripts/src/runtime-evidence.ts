import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { ParsedScriptFile, ScriptMethodCall } from "./types.js";
import { analyzeCommand } from "../../commands/src/parse.js";
import { commandRuntimeEvidence } from "../../commands/src/runtime-evidence.js";

function operationId(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
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

function isEntityLike(call: ScriptMethodCall): boolean {
  return call.receiverType === "Entity" || call.receiverType === "Player";
}

function methodEvidence(call: ScriptMethodCall): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [
    observed("script-api-call", call.source, call.symbol),
    observed("script-call:" + call.symbol, call.source),
  ];

  if (isEntityLike(call) && call.method === "teleport") {
    records.push(observed("teleport-apply-request", call.source, call.symbol));
    records.push(observed("teleport-apply", call.source, call.symbol));
  }
  if (isEntityLike(call) && call.method === "applyKnockback") {
    records.push(observed("gameplay-knockback-request", call.source, call.symbol));
  }
  if (isEntityLike(call) && call.method === "applyImpulse") {
    records.push(observed("gameplay-impulse-request", call.source, call.symbol));
  }
  if (isEntityLike(call) && call.method === "clearVelocity") {
    records.push(observed("velocity-normalization", call.source, call.symbol));
  }
  if (call.receiverType === "Dimension" && call.method === "spawnEntity") {
    records.push(observed("entity-spawn-request", call.source, call.symbol));
  }
  if (call.receiverType === "Block" && (call.method === "setPermutation" || call.method === "setType")) {
    records.push(observed("block-write", call.source, call.symbol));
    records.push(observed("world-mutation-request", call.source, call.symbol));
  }
  if (call.receiverType === "PlayerInputPermissions") {
    records.push(observed("input-permission-mutation", call.source, call.symbol));
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

  for (const deferred of script.deferredCallbacks) {
    records.push(observed(
      "deferred-script-work",
      deferred.source,
      "system." + deferred.scheduler,
    ));
    if (deferred.guardEvidence === "explicit-generation-check") {
      records.push(observed(
        "async-generation-revalidation",
        deferred.source,
        deferred.guardIdentifiers.join(","),
      ));
    }
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

    if (
      command.mechanism === "runCommand" ||
      command.mechanism === "runCommandAsync"
    ) {
      records.push(observed(
        "script-command-execution-request",
        command.source,
        command.mechanism,
      ));
      records.push(...commandRuntimeEvidence(
        analyzeCommand(command.command, command.source),
      ));
    }
  }

  return records;
}