const OUTCOME_PRIORITY = {
  objective: 20,
  timeout: 10,
};

let committed = false;

function finishMatch(candidates) {
  if (committed) return;
  committed = true;
  return [...candidates].sort(
    (left, right) => OUTCOME_PRIORITY[right] - OUTCOME_PRIORITY[left],
  )[0];
}

world.afterEvents.entityDie.subscribe(() => {
  finishMatch(new Set(["objective"]));
});

world.afterEvents.playerLeave.subscribe(() => {
  finishMatch(new Set(["timeout"]));
});
