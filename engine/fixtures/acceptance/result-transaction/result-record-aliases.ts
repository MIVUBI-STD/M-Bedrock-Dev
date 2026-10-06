function persistResult(resultToken) {
  const recoveryRecord = {
    generationId: 8,
    resultToken,
    outcomeReason: "objective",
    participantRevision: 12,
    resultEvidence: { flagCaptured: true },
    committedAtTick: 900,
    rewardOp: "reward:" + resultToken,
  };
  world.setDynamicProperty("roundAuditJournal", recoveryRecord);
}
