import {
  analyzeCommand,
  flattenCommandEffects,
  scoreboardAccesses,
  tagAccesses,
} from "../../../analyzers/commands/src/index.js";
import type { ParsedFunction } from "../../../analyzers/functions/src/index.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  stateSurfaceKey,
  type SourceRef,
  type StateAuthorityContract,
  type StateSurfaceRef,
} from "../../project-model/src/index.js";
import {
  validateSemanticIr,
  type ExecutionEdge,
  type ExecutionRegion,
  type ExecutionRegionKind,
  type SemanticIr,
  type StateOperation,
  type StateOperationKind,
  type StateSurface,
  type TemporalRelation,
} from "../../semantic-ir/src/index.js";

export interface InspectionSemanticIrInput {
  parsedFunctions: readonly {
    parsed: ParsedFunction;
  }[];
  parsedScripts: readonly {
    parsed: ParsedScriptFile;
  }[];
  stateAuthorityContracts?: readonly StateAuthorityContract[];
}

function token(value: string): string {
  return encodeURIComponent(value);
}

function sourceToken(source: SourceRef): string {
  const range = source.range;
  return [
    token(source.relativePath),
    range?.lineStart ?? 0,
    range?.columnStart ?? 0,
    range?.lineEnd ?? 0,
    range?.columnEnd ?? 0,
  ].join(":");
}

function scriptRegionId(scriptId: string, region: string): string {
  return "exec:script:" + token(scriptId) + ":" + token(region);
}

function functionRegionId(functionId: string): string {
  return "exec:mcfunction:" + token(functionId);
}

function eventRegionId(
  root: string,
  phase: string,
  event: string,
): string {
  return "exec:event:" + token(root + "." + phase + "." + event);
}

function stateId(ref: StateSurfaceRef): string {
  return "state:" + token(stateSurfaceKey(ref));
}

function regionKind(region: string): ExecutionRegionKind {
  if (region === "module") return "script-module";
  if (region.startsWith("function:")) return "script-function";
  return "script-callback";
}

function operationFromDynamicProperty(
  operation: ParsedScriptFile["dynamicProperties"][number]["operation"],
): StateOperationKind | undefined {
  switch (operation) {
    case "get":
      return "read";
    case "set":
      return "write";
    case "delete":
      return "delete";
    case "clear":
      return "clear";
    case "ids":
      return "enumerate";
    case "size":
      return "size";
    case "unknown":
      return undefined;
  }
}

function temporalKind(
  edge: ExecutionEdge,
): TemporalRelation["kind"] {
  if (edge.kind === "synchronous-call") return "same-turn";
  if (edge.kind === "event-dispatch") return "event-dispatch";
  if (edge.kind === "periodic") return "periodic";
  return "deferred";
}

export function buildInspectionSemanticIr(
  input: InspectionSemanticIrInput,
): SemanticIr {
  const regions = new Map<string, ExecutionRegion>();
  const edges = new Map<string, ExecutionEdge>();
  const surfaces = new Map<string, StateSurface>();
  const operations = new Map<string, StateOperation>();

  const ensureRegion = (region: ExecutionRegion): void => {
    const existing = regions.get(region.id);
    if (existing) return;
    regions.set(region.id, region);
  };

  const ensureScriptRegion = (
    script: ParsedScriptFile,
    region: string,
    source: SourceRef = script.source,
  ): string => {
    const id = scriptRegionId(script.identifier, region);
    ensureRegion({
      id,
      kind: regionKind(region),
      ownerId: script.identifier,
      label: region,
      source,
    });
    return id;
  };

  const ensureSurface = (ref: StateSurfaceRef): string => {
    const id = stateId(ref);
    if (!surfaces.has(id)) surfaces.set(id, { id, ref });
    return id;
  };

  const addStateOperation = (
    executionRegionId: string,
    ref: StateSurfaceRef,
    operation: StateOperationKind,
    source: SourceRef,
    targetHint?: string,
  ): void => {
    const surfaceId = ensureSurface(ref);
    const id = [
      "state-op",
      token(executionRegionId),
      token(surfaceId),
      operation,
      sourceToken(source),
    ].join(":");
    operations.set(id, {
      id,
      executionRegionId,
      surfaceId,
      operation,
      source,
      ...(targetHint === undefined ? {} : { targetHint }),
    });
  };

  const addEdge = (
    edge: Omit<ExecutionEdge, "id">,
  ): void => {
    const id = [
      "exec-edge",
      token(edge.from),
      edge.kind,
      token(edge.targetLabel),
      sourceToken(edge.source),
    ].join(":");
    edges.set(id, { ...edge, id });
  };

  for (const { parsed } of input.parsedFunctions) {
    ensureRegion({
      id: functionRegionId(parsed.identifier),
      kind: "mcfunction",
      ownerId: parsed.identifier,
      label: parsed.identifier,
      source: parsed.source,
    });
  }

  const functionRegions = new Set(
    input.parsedFunctions.map(({ parsed }) =>
      functionRegionId(parsed.identifier)
    ),
  );

  for (const { parsed } of input.parsedFunctions) {
    const from = functionRegionId(parsed.identifier);

    for (const ref of parsed.references) {
      if (ref.kind !== "function") continue;
      const targetId = functionRegionId(ref.target);
      const resolved = functionRegions.has(targetId);
      addEdge({
        from,
        kind: "synchronous-call",
        targetLabel: ref.target,
        resolution: resolved ? "resolved" : "unresolved",
        ...(resolved ? { to: targetId } : {}),
        source: ref.source,
      });
    }

    for (const command of parsed.commands) {
      const effects = flattenCommandEffects(command.analysis);
      for (const access of scoreboardAccesses(effects)) {
        addStateOperation(
          from,
          { kind: "scoreboard", key: access.objective },
          access.access,
          access.source ?? command.source,
          access.target,
        );
      }
      for (const access of tagAccesses(effects)) {
        addStateOperation(
          from,
          { kind: "tag", key: access.tag },
          access.access,
          access.source ?? command.source,
          access.target,
        );
      }
    }
  }

  for (const { parsed } of input.parsedScripts) {
    ensureScriptRegion(parsed, "module");

    const regionSources = new Map<string, SourceRef>();
    for (const call of parsed.localFunctionCalls) {
      regionSources.set(call.callerRegion, call.source);
      regionSources.set(call.targetRegion, call.source);
    }
    for (const access of parsed.dynamicProperties) {
      if (access.executionRegion) {
        regionSources.set(access.executionRegion, access.source);
      }
    }
    for (const command of parsed.commandLiterals) {
      if (command.executionRegion) {
        regionSources.set(command.executionRegion, command.source);
      }
    }
    for (const call of parsed.methodCalls) {
      if (call.executionRegion) {
        regionSources.set(call.executionRegion, call.source);
      }
    }
    for (const callback of parsed.deferredCallbacks) {
      if (callback.callerRegion) {
        regionSources.set(callback.callerRegion, callback.source);
      }
      if (callback.callbackRegion && callback.callbackSource) {
        regionSources.set(callback.callbackRegion, callback.callbackSource);
      }
    }
    for (const event of parsed.events) {
      if (event.executionRegion) {
        regionSources.set(event.executionRegion, event.source);
      }
      if (event.callbackRegion && event.callbackSource) {
        regionSources.set(event.callbackRegion, event.callbackSource);
      }
    }

    for (const [region, source] of regionSources) {
      ensureScriptRegion(parsed, region, source);
    }

    for (const call of parsed.localFunctionCalls) {
      const from = ensureScriptRegion(
        parsed,
        call.callerRegion,
        call.source,
      );
      const to = ensureScriptRegion(
        parsed,
        call.targetRegion,
        call.source,
      );
      addEdge({
        from,
        to,
        kind: "synchronous-call",
        targetLabel: call.targetName,
        resolution: "resolved",
        source: call.source,
      });
    }

    for (const event of parsed.events) {
      const eventId = eventRegionId(
        event.root,
        event.phase,
        event.event,
      );
      ensureRegion({
        id: eventId,
        kind: "event-source",
        ownerId: event.root,
        label: event.root + "." + event.phase + "." + event.event,
        source: event.source,
      });

      const to = event.callbackRegion
        ? ensureScriptRegion(
            parsed,
            event.callbackRegion,
            event.callbackSource ?? event.source,
          )
        : undefined;
      addEdge({
        from: eventId,
        kind: "event-dispatch",
        targetLabel:
          parsed.identifier + ":" +
          (event.callbackRegion ?? "unresolved-subscription-callback"),
        resolution: to ? "resolved" : "unresolved",
        ...(to ? { to } : {}),
        source: event.source,
      });
    }

    for (const callback of parsed.deferredCallbacks) {
      const from = ensureScriptRegion(
        parsed,
        callback.callerRegion ?? "module",
        callback.source,
      );
      const to = callback.callbackRegion
        ? ensureScriptRegion(
            parsed,
            callback.callbackRegion,
            callback.callbackSource ?? callback.source,
          )
        : undefined;
      addEdge({
        from,
        kind:
          callback.scheduler === "runInterval"
            ? "periodic"
            : "deferred",
        targetLabel:
          callback.callbackRegion ??
          callback.scheduler + ":unresolved-callback",
        resolution: to ? "resolved" : "unresolved",
        ...(to ? { to } : {}),
        source: callback.source,
        scheduler: callback.scheduler,
        guardEvidence: callback.guardEvidence,
        guardIdentifiers: callback.guardIdentifiers,
      });
    }

    for (const access of parsed.dynamicProperties) {
      const operation = operationFromDynamicProperty(access.operation);
      if (!operation) continue;
      const region = ensureScriptRegion(
        parsed,
        access.executionRegion ?? "module",
        access.source,
      );
      addStateOperation(
        region,
        {
          kind: "dynamic-property",
          key: access.propertyId ?? "*",
        },
        operation,
        access.source,
        access.receiverHint,
      );
    }

    for (const command of parsed.commandLiterals) {
      const region = ensureScriptRegion(
        parsed,
        command.executionRegion ?? "module",
        command.source,
      );
      const analysis = analyzeCommand(
        command.command,
        command.source,
      );
      const effects = flattenCommandEffects(analysis);

      for (const effect of effects) {
        if (effect.kind !== "function-call") continue;
        const target = functionRegionId(effect.target);
        const resolved = functionRegions.has(target);
        addEdge({
          from: region,
          kind: "synchronous-call",
          targetLabel: effect.target,
          resolution: resolved ? "resolved" : "unresolved",
          ...(resolved ? { to: target } : {}),
          source: effect.source,
        });
      }

      for (const access of scoreboardAccesses(effects)) {
        addStateOperation(
          region,
          { kind: "scoreboard", key: access.objective },
          access.access,
          access.source ?? command.source,
          access.target,
        );
      }
      for (const access of tagAccesses(effects)) {
        addStateOperation(
          region,
          { kind: "tag", key: access.tag },
          access.access,
          access.source ?? command.source,
          access.target,
        );
      }
    }
  }

  const authorityBindings = (input.stateAuthorityContracts ?? [])
    .map((contract) => ({
      contract,
      authoritySurfaceId: ensureSurface(contract.authority),
      mirrorSurfaceIds: contract.mirrors.map(ensureSurface),
    }))
    .sort((a, b) => a.contract.id.localeCompare(b.contract.id));

  const executionEdges = [...edges.values()]
    .sort((a, b) => a.id.localeCompare(b.id));
  const temporalRelations: TemporalRelation[] =
    executionEdges.map((edge) => ({
      id: "time:" + edge.id,
      from: edge.from,
      targetLabel: edge.targetLabel,
      resolution: edge.resolution,
      ...(edge.to === undefined ? {} : { to: edge.to }),
      kind: temporalKind(edge),
      source: edge.source,
      ...(edge.guardEvidence === undefined
        ? {}
        : { guardEvidence: edge.guardEvidence }),
      ...(edge.guardIdentifiers === undefined
        ? {}
        : { guardIdentifiers: edge.guardIdentifiers }),
    }));

  const ir: SemanticIr = {
    schemaVersion: 1,
    execution: {
      regions: [...regions.values()].sort(
        (a, b) => a.id.localeCompare(b.id),
      ),
      edges: executionEdges,
    },
    state: {
      surfaces: [...surfaces.values()].sort(
        (a, b) => a.id.localeCompare(b.id),
      ),
      operations: [...operations.values()].sort(
        (a, b) => a.id.localeCompare(b.id),
      ),
      authorityBindings,
    },
    temporal: {
      relations: temporalRelations,
    },
  };

  const errors = validateSemanticIr(ir);
  if (errors.length > 0) {
    throw new Error(
      "Inspection Semantic IR failed validation: " +
        errors.join("; "),
    );
  }

  return ir;
}
