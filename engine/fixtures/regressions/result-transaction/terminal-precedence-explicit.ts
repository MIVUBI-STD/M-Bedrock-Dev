const RESULT_PRECEDENCE = ["objective", "timeout"];
let ended = false;

function endGame(candidates) {
  if (ended) return;
  ended = true;
  return RESULT_PRECEDENCE.find((reason) => candidates.has(reason));
}

world.afterEvents.entityDie.subscribe(() => {
  endGame(new Set(["objective"]));
});

world.afterEvents.playerLeave.subscribe(() => {
  endGame(new Set(["timeout"]));
});
