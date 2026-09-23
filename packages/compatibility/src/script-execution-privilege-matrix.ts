export type ScriptRestrictedOperation = "call" | "write";

export interface ScriptExecutionPrivilegeRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  operation: ScriptRestrictedOperation;
  sourceIds: readonly string[];
}

function call(
  id: string,
  symbol: string,
  sourceIds: readonly string[],
): ScriptExecutionPrivilegeRule {
  return { id, moduleName: "@minecraft/server", symbol, operation: "call", sourceIds };
}

function write(
  id: string,
  symbol: string,
  sourceIds: readonly string[],
): ScriptExecutionPrivilegeRule {
  return { id, moduleName: "@minecraft/server", symbol, operation: "write", sourceIds };
}

export const SCRIPT_EXECUTION_PRIVILEGE_RULES: readonly ScriptExecutionPrivilegeRule[] = [
  call("script-privilege.world.set-absolute-time", "world.setAbsoluteTime", ["ms-world-current"]),
  call("script-privilege.world.set-default-spawn", "world.setDefaultSpawnLocation", ["ms-world-current"]),
  call("script-privilege.world.set-difficulty", "world.setDifficulty", ["ms-world-current"]),
  call("script-privilege.world.set-time-of-day", "world.setTimeOfDay", ["ms-world-current"]),
  call("script-privilege.dimension.spawn-entity", "Dimension.spawnEntity", ["ms-dimension-current"]),
  call("script-privilege.dimension.set-weather", "Dimension.setWeather", ["ms-dimension-current"]),
  call("script-privilege.entity.add-effect", "Entity.addEffect", ["ms-entity-current"]),
  call("script-privilege.entity.add-item", "Entity.addItem", ["ms-entity-current"]),
  call("script-privilege.entity.add-tag", "Entity.addTag", ["ms-entity-current"]),
  call("script-privilege.entity.apply-damage", "Entity.applyDamage", ["ms-entity-current"]),
  call("script-privilege.entity.apply-impulse", "Entity.applyImpulse", ["ms-entity-current"]),
  call("script-privilege.entity.apply-knockback", "Entity.applyKnockback", ["ms-entity-current"]),
  call("script-privilege.entity.clear-velocity", "Entity.clearVelocity", ["ms-entity-current"]),
  call("script-privilege.entity.extinguish-fire", "Entity.extinguishFire", ["ms-entity-current"]),
  call("script-privilege.entity.play-animation", "Entity.playAnimation", ["ms-entity-current"]),
  call("script-privilege.entity.remove", "Entity.remove", ["ms-entity-current"]),
  call("script-privilege.entity.remove-effect", "Entity.removeEffect", ["ms-entity-current"]),
  call("script-privilege.entity.remove-tag", "Entity.removeTag", ["ms-entity-current"]),
  call("script-privilege.entity.reset-property", "Entity.resetProperty", ["ms-entity-current"]),
  call("script-privilege.entity.run-command", "Entity.runCommand", ["ms-entity-current"]),
  call("script-privilege.entity.set-on-fire", "Entity.setOnFire", ["ms-entity-current"]),
  call("script-privilege.entity.set-property", "Entity.setProperty", ["ms-entity-current"]),
  call("script-privilege.entity.set-rotation", "Entity.setRotation", ["ms-entity-current"]),
  call("script-privilege.entity.teleport", "Entity.teleport", ["ms-entity-current"]),
  call("script-privilege.entity.trigger-event", "Entity.triggerEvent", ["ms-entity-current"]),
  call("script-privilege.player.set-game-mode", "Player.setGameMode", ["ms-player-current"]),
  call("script-privilege.player.set-spawn-point", "Player.setSpawnPoint", ["ms-player-current"]),
  call(
    "script-privilege.player-input.set-permission-category",
    "PlayerInputPermissions.setPermissionCategory",
    ["ms-player-input-permissions-current"],
  ),
  write("script-privilege.world.allow-cheats", "world.allowCheats", ["ms-world-current"]),
  write("script-privilege.entity.is-sneaking", "Entity.isSneaking", ["ms-entity-current"]),
  write("script-privilege.entity.name-tag", "Entity.nameTag", ["ms-entity-current"]),
  write(
    "script-privilege.player.command-permission-level",
    "Player.commandPermissionLevel",
    ["ms-player-current"],
  ),
];

export function findScriptExecutionPrivilegeRule(
  symbol: string,
  operation: ScriptRestrictedOperation,
): ScriptExecutionPrivilegeRule | undefined {
  return SCRIPT_EXECUTION_PRIVILEGE_RULES.find(
    (item) => item.symbol === symbol && item.operation === operation,
  );
}
