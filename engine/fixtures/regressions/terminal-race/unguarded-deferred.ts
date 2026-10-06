function endGame(arena, player) {
  arena.players.delete(player);
  arena.generation++;
}

world.afterEvents.entityDie.subscribe(() => {
  endGame(arena, player);
});

system.runTimeout(() => {
  endGame(arena, player);
}, 20);
