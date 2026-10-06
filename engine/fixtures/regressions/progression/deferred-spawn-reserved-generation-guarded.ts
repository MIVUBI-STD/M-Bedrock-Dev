let remainingEnemies = 0;
let arenaGeneration = 4;

function spawnReservedEnemy(dimension) {
  dimension.spawnEntity("demo:enemy", { x: 0, y: 0, z: 0 });
}

function retrySpawn(dimension) {
  remainingEnemies++;
  const capturedGeneration = arenaGeneration;
  system.runTimeout(() => {
    if (capturedGeneration !== arenaGeneration) return;
    spawnReservedEnemy(dimension);
  }, 20);
}

world.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity.typeId !== "demo:enemy") return;
  remainingEnemies--;
});

function maybeAdvance() {
  if (remainingEnemies === 0) nextWave();
}
