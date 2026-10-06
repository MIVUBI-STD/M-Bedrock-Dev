function commitResult(resultId) {
  const record = {
    arenaGeneration: 4,
    resultId,
    terminalReason: "timeout",
    participants: ["a", "b"],
    objectiveEvidence: { score: 7 },
    commitTick: 1200,
    rewardOperationId: "reward:" + resultId,
    winningSide: "blue",
  };
  world.setDynamicProperty("matchResultJournal", JSON.stringify(record));
}
