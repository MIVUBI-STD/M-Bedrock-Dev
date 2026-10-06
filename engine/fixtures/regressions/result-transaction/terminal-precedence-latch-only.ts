let ended = false;

function endGame(result) {
  if (ended) return;
  ended = true;
  return result;
}

world.afterEvents.entityDie.subscribe(() => {
  endGame("objective");
});

world.afterEvents.playerLeave.subscribe(() => {
  endGame("timeout");
});
