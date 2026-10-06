world.afterEvents.playerJoin.subscribe((event) => {
  restore(event.player);
});

function restore(player) {
  const state = world.getDynamicProperty("roundSession");
  return state;
}
