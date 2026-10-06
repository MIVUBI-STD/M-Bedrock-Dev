world.afterEvents.entityDie.subscribe((event) => {
  award(event.deadEntity, resultId);
});

function award(player, resultId) {
  const applied = world.getDynamicProperty("rewardOp");
  credits.removeParticipant(player);
  if (applied !== resultId) credits.addScore(player, 1);
  world.setDynamicProperty("rewardOp", resultId);
}
