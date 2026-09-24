import { system, world } from "@minecraft/server";

const PREFIX = "[M-BEDROCK-PROBE]";
const QUEUE = [];
const SUPPORTED = new Set([
  "chunk-loaded",
  "entity-resolvable",
  "tag-present",
  "scoreboard-value"
]);

function emit(payload) {
  console.warn(PREFIX + JSON.stringify(payload));
}

function findPlayer(id) {
  return world.getAllPlayers().find((player) =>
    player.id === id || player.name === id
  );
}

function findEntity(id) {
  try {
    return world.getEntity(id);
  } catch {
    return undefined;
  }
}

function outcomeId(request, state) {
  return request.outcomeByState?.[state];
}

function evidence(request, state, note) {
  return {
    predicate: request.predicate,
    state,
    confidence: state === "unknown" ? "unknown" : "observed",
    ...(request.scope ? { scope: request.scope } : {}),
    relatedNodeIds: ["runtime-probe:" + request.requestId],
    ...(note ? { note } : {})
  };
}

function execute(request) {
  const query = request.query;

  if (query.kind === "chunk-loaded") {
    const loaded = world
      .getDimension(query.dimension)
      .isChunkLoaded(query.location);
    return {
      state: loaded ? "present" : "absent",
      value: loaded
    };
  }

  if (query.kind === "entity-resolvable") {
    const resolvable = findEntity(query.entityId) !== undefined;
    return {
      state: resolvable ? "present" : "absent",
      value: resolvable
    };
  }

  if (query.kind === "tag-present") {
    const subject = query.subjectKind === "player"
      ? findPlayer(query.subjectId)
      : findEntity(query.subjectId);

    if (!subject) {
      return {
        state: "unknown",
        note: "Subject is not currently resolvable."
      };
    }

    const present = subject.getTags().includes(query.tag);
    return {
      state: present ? "present" : "absent",
      value: present
    };
  }

  if (query.kind === "scoreboard-value") {
    const objective = world.scoreboard.getObjective(query.objectiveId);
    if (!objective) {
      return {
        state: "unknown",
        note: "Scoreboard objective is missing."
      };
    }

    let value;
    try {
      value = objective.getScore(query.participant);
    } catch (error) {
      return {
        state: "unknown",
        note: String(error)
      };
    }

    if (value === undefined) {
      return {
        state: "unknown",
        note: "Scoreboard participant has no value."
      };
    }

    if (query.expected === undefined) {
      return { state: "present", value };
    }

    return {
      state: value === query.expected ? "present" : "absent",
      value
    };
  }

  throw new Error("Unsupported runtime probe query kind.");
}

function validate(message) {
  if (
    !message ||
    message.schemaVersion !== 1 ||
    typeof message.requestId !== "string" ||
    typeof message.probeId !== "string" ||
    typeof message.predicate !== "string" ||
    !message.query ||
    !SUPPORTED.has(message.query.kind) ||
    !message.outcomeByState ||
    typeof message.outcomeByState.present !== "string" ||
    typeof message.outcomeByState.absent !== "string"
  ) {
    throw new Error("Invalid or unsupported runtime probe request.");
  }
}

export function enqueueProbeRequest(message) {
  validate(message);
  const runtimeTick = Number.isInteger(message.runtimeTick)
    ? message.runtimeTick
    : system.currentTick;

  QUEUE.push({ ...message, runtimeTick });
  QUEUE.sort((left, right) => left.runtimeTick - right.runtimeTick);
}

system.runInterval(() => {
  while (
    QUEUE.length > 0 &&
    QUEUE[0].runtimeTick <= system.currentTick
  ) {
    const request = QUEUE.shift();

    try {
      const result = execute(request);
      emit({
        schemaVersion: 1,
        requestId: request.requestId,
        probeId: request.probeId,
        runtimeTick: system.currentTick,
        ok: true,
        state: result.state,
        ...(outcomeId(request, result.state) === undefined
          ? {}
          : { outcomeId: outcomeId(request, result.state) }),
        evidence: evidence(
          request,
          result.state,
          result.note
        ),
        ...(result.value === undefined ? {} : { value: result.value })
      });
    } catch (error) {
      const state = "unknown";
      emit({
        schemaVersion: 1,
        requestId: request.requestId,
        probeId: request.probeId,
        runtimeTick: system.currentTick,
        ok: false,
        state,
        ...(outcomeId(request, state) === undefined
          ? {}
          : { outcomeId: outcomeId(request, state) }),
        evidence: evidence(request, state, String(error)),
        error: String(error)
      });
    }
  }
}, 1);
