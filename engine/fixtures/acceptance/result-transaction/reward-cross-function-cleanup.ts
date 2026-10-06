world.afterEvents.entityDie.subscribe((event) => {
  award(event.deadEntity, resultId);
});

function award(player, resultId) {
  const applied = world.getDynamicProperty("rewardOperation");
  if (applied !== resultId) credits.addScore(player, 1);
  world.setDynamicProperty("rewardOperation", resultId);
  cleanupRewardSurface(player);
}

function cleanupRewardSurface(player) {
  credits.removeParticipant(player);
}
