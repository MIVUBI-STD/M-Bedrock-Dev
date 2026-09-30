import { system, world } from "@minecraft/server";

const CONTROL_PREFIX = "[M-BEDROCK-CTRL]";
const ACK_PREFIX = "[M-BEDROCK-CTRL-ACK]";

const QUEUE = [];

function ack(payload) {
  console.warn(`${ACK_PREFIX}${JSON.stringify(payload)}`);
}

function findPlayer(playerId) {
  return world.getAllPlayers().find((player) =>
    player.id === playerId || player.name === playerId
  );
}

function setArenaAssignment(player, arenaId) {
  for (const tag of player.getTags()) {
    if (tag.startsWith("arena:")) player.removeTag(tag);
  }
  player.addTag(`arena:${arenaId}`);
  player.removeTag("session:playing");
  player.removeTag("session:completed");
  player.removeTag("session:starting");
  player.addTag("session:assigned");
}

function executeAction(action) {
  if (action.kind === "assign") {
    const player = findPlayer(action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);
    setArenaAssignment(player, action.arenaId);
    return;
  }

  if (action.kind === "start") {
    const player = findPlayer(action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);
    player.removeTag("session:assigned");
    player.removeTag("session:playing");
    player.removeTag("session:completed");
    player.addTag("session:starting");
    return;
  }

  if (action.kind === "disconnect") {
    const player = findPlayer(action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);
    player.addTag("test:disconnect-requested");
    return;
  }

  if (action.kind === "reconnect") {
    const player = findPlayer(action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);
    player.removeTag("test:disconnect-requested");
    player.removeTag("session:starting");
    player.removeTag("session:playing");
    player.removeTag("session:completed");
    player.addTag("session:assigned");
    return;
  }

  if (action.kind === "reset-arena") {
    const objective = world.scoreboard.getObjective("cutscene_active");
    if (objective) objective.setScore(`#${action.arenaId}`, 0);
    for (const player of world.getAllPlayers()) {
      if (!player.getTags().includes(`arena:${action.arenaId}`)) continue;
      player.removeTag("session:starting");
      player.removeTag("session:playing");
      player.removeTag("session:completed");
      player.addTag("session:assigned");
    }
  }
}

export function enqueueControlAction(message) {
  if (!message || message.schemaVersion !== 1) {
    throw new Error("Invalid runtime control message.");
  }
  QUEUE.push(message);
  QUEUE.sort((a, b) => a.runtimeTick - b.runtimeTick);
}

system.runInterval(() => {
  while (QUEUE.length > 0 && QUEUE[0].runtimeTick <= system.currentTick) {
    const message = QUEUE.shift();
    try {
      executeAction(message.action);
      ack({
        scenarioId: message.scenarioId,
        runtimeTick: system.currentTick,
        requestedTick: message.runtimeTick,
        ok: true,
        action: message.action,
      });
    } catch (error) {
      ack({
        scenarioId: message.scenarioId,
        runtimeTick: system.currentTick,
        requestedTick: message.runtimeTick,
        ok: false,
        action: message.action,
        error: String(error),
      });
    }
  }
}, 1);

export function controlLogPrefix() {
  return CONTROL_PREFIX;
}
