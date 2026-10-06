let remainingEnemies = 0;

function spawnEnemy(dimension) {
  dimension.spawnEntity("demo:enemy", { x: 0, y: 0, z: 0 });
  remainingEnemies++;
}

function retrySpawn(dimension) {
  system.runTimeout(() => {
    spawnEnemy(dimension);
  }, 20);
}

world.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity.typeId !== "demo:enemy") return;
  remainingEnemies--;
});

function maybeAdvance() {
  if (remainingEnemies === 0) nextWave();
}
