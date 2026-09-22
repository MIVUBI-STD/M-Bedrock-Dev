import { system, world } from "@minecraft/server";
import { enqueueControlAction } from "./control.js";

const PREFIX = "[M-BEDROCK-OBS]";
const CONTROL_INPUT_PREFIX = "[M-BEDROCK-CTRL-IN]";

const CONFIG = {
  intervalTicks: 1,
  minecraftVersion: "1.26.40",
  artifactFingerprint: "",
  playerObjectives: ["session_progress"],
  arenaObjectives: ["cutscene_active", "round"],
  arenas: [
    { arenaId: "arena1", participant: "#arena1" },
    { arenaId: "arena2", participant: "#arena2" }
  ],
  entityQueries: [
    { dimension: "overworld", arenaTagPrefix: "arena:" }
  ]
};

function safeTags(subject, entity, issues) {
  try {
    return entity.getTags();
  } catch (error) {
    issues.push({ kind: "tags-read-failed", subject, detail: String(error) });
    return [];
  }
}

function readScore(objectiveId, participant, subject, issues) {
  const objective = world.scoreboard.getObjective(objectiveId);
  if (!objective) {
    issues.push({
      kind: "objective-missing",
      subject: objectiveId,
      detail: `Missing scoreboard objective ${objectiveId}`
    });
    return undefined;
  }
  try {
    return objective.getScore(participant);
  } catch (error) {
    issues.push({ kind: "score-read-failed", subject, detail: String(error) });
    return undefined;
  }
}

function arenaFromTags(tags, prefix) {
  if (!prefix) return undefined;
  const matches = tags.filter((tag) =>
    tag.startsWith(prefix) && tag.length > prefix.length
  ).map((tag) => tag.slice(prefix.length));
  return matches.length === 1 ? matches[0] : undefined;
}

function capturePlayers(issues) {
  return world.getAllPlayers().map((player) => {
    const scores = {};
    for (const objectiveId of CONFIG.playerObjectives) {
      const value = readScore(objectiveId, player, player.id, issues);
      if (value !== undefined) scores[objectiveId] = value;
    }
    return {
      playerId: player.id,
      name: player.name,
      connected: true,
      tags: safeTags(player.id, player, issues),
      scores,
      position: player.location
    };
  });
}

function captureArenas(issues) {
  return CONFIG.arenas.map((arena) => {
    const scores = {};
    for (const objectiveId of CONFIG.arenaObjectives) {
      const value = readScore(objectiveId, arena.participant, arena.arenaId, issues);
      if (value !== undefined) scores[objectiveId] = value;
    }
    return { arenaId: arena.arenaId, tags: [], scores };
  });
}

function captureEntities(issues) {
  const observations = [];
  for (const query of CONFIG.entityQueries) {
    try {
      const dimension = world.getDimension(query.dimension);
      for (const entity of dimension.getEntities()) {
        const tags = safeTags(entity.id, entity, issues);
        const arenaId = arenaFromTags(tags, query.arenaTagPrefix);
        observations.push({
          entityId: entity.id,
          typeId: entity.typeId,
          tags,
          position: entity.location,
          alive: true,
          ...(arenaId ? { arenaId } : {})
        });
      }
    } catch (error) {
      issues.push({
        kind: "entity-query-failed",
        subject: query.dimension,
        detail: String(error)
      });
    }
  }
  return observations;
}

function capture() {
  const issues = [];
  return {
    schemaVersion: 1,
    tick: system.currentTick,
    ...(CONFIG.minecraftVersion ? { minecraftVersion: CONFIG.minecraftVersion } : {}),
    ...(CONFIG.artifactFingerprint ? { artifactFingerprint: CONFIG.artifactFingerprint } : {}),
    players: capturePlayers(issues),
    arenas: captureArenas(issues),
    entities: captureEntities(issues),
    metadata: {
      harness: "m-bedrock-reliability",
      captureIssueCount: issues.length,
      issues
    }
  };
}

function emit(snapshot) {
  console.warn(`${PREFIX}${JSON.stringify(snapshot)}`);
}

world.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== "m-bedrock:control") return;
  try {
    const message = JSON.parse(event.message);
    enqueueControlAction(message);
  } catch (error) {
    console.warn(`${CONTROL_INPUT_PREFIX}${JSON.stringify({
      ok: false,
      tick: system.currentTick,
      error: String(error)
    })}`);
  }
});

system.runInterval(() => {
  try {
    emit(capture());
  } catch (error) {
    console.warn(`${PREFIX}${JSON.stringify({
      schemaVersion: 1,
      tick: system.currentTick,
      error: String(error)
    })}`);
  }
}, CONFIG.intervalTicks);
