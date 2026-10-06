let ended = false;

function endGame(arena, player) {
  if (ended) return;
  ended = true;
  arena.players.delete(player);
  arena.generation++;
}

world.afterEvents.entityDie.subscribe(() => {
  endGame(arena, player);
});

system.runTimeout(() => {
  endGame(arena, player);
}, 20);
