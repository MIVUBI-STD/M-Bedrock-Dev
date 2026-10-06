let committed = false;

function finishMatch(reason) {
  if (committed) return;
  committed = true;
  return reason;
}

world.afterEvents.entityDie.subscribe(() => {
  finishMatch("objective");
});

world.afterEvents.playerLeave.subscribe(() => {
  finishMatch("timeout");
});
