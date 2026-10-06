function persistResult(resultId) {
  const recoveryRecord = {
    arenaGeneration: 8,
    resultId,
    terminalReason: "objective",
    participants: ["p1", "p2"],
    objectiveEvidence: { flagCaptured: true },
    commitTick: 900,
  };
  world.setDynamicProperty("roundResultJournal", recoveryRecord);
}
