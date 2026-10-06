function endGame(arena, player) {
  arena.players.delete(player);
  arena.generation++;
}

world.afterEvents.entityDie.subscribe(() => {
  endGame(arena, player);
});

world.afterEvents.playerLeave.subscribe(() => {
  endGame(arena, player);
});
