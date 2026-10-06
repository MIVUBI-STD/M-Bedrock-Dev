world.afterEvents.playerJoin.subscribe((event) => {
  const xp = event.player.getDynamicProperty("progressionXp");
  return xp;
});
