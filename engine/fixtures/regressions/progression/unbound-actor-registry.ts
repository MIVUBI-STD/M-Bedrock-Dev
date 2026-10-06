function spawn(dimension, arena) {
  const enemy = dimension.spawnEntity("demo:enemy", { x: 0, y: 0, z: 0 });
  arena.enemies.add(enemy.id);
}

world.afterEvents.entityDie.subscribe((event) => {
  const arena = currentArena(event.deadEntity);
  arena.enemies.delete(event.deadEntity.id);
});

function maybeAdvance(arena) {
  if (arena.enemies.size === 0) nextWave();
}
