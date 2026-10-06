function commitResult(resultId) {
  world.setDynamicProperty(
    "resultJournal",
    JSON.stringify({
      resultId,
      terminalReason: "win",
    }),
  );
}
