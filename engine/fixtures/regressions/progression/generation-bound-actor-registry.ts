function spawn(dimension, arena) {
  const enemy = dimension.spawnEntity("demo:enemy", { x: 0, y: 0, z: 0 });
  arena.enemyRegistryByGeneration.get(arena.generation).add(enemy.id);
}

world.afterEvents.entityDie.subscribe((event) => {
  const arena = currentArena(event.deadEntity);
  arena.enemyRegistryByGeneration.get(arena.generation).delete(event.deadEntity.id);
});

function maybeAdvance(arena) {
  if (arena.enemyRegistryByGeneration.get(arena.generation).size === 0) nextWave();
}
