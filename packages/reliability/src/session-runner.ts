import {
  applySessionAction,
  createSessionModel,
  type MultiplayerSessionModel,
  type SessionAction,
} from "./session-model.js";
import {
  checkSessionInvariants,
  type SessionInvariantViolation,
} from "./session-invariants.js";

export interface SessionSequenceStep {
  index: number;
  action: SessionAction;
  model: MultiplayerSessionModel;
  violations: SessionInvariantViolation[];
}

export interface SessionSequenceResult {
  ok: boolean;
  finalModel: MultiplayerSessionModel;
  steps: SessionSequenceStep[];
  firstViolation?: SessionSequenceStep;
}

export function runSessionSequence(
  arenaIds: readonly string[],
  actions: readonly SessionAction[],
): SessionSequenceResult {
  let model = createSessionModel(arenaIds);
  const steps: SessionSequenceStep[] = [];
  let firstViolation: SessionSequenceStep | undefined;

  actions.forEach((action, index) => {
    model = applySessionAction(model, action);
    const violations = checkSessionInvariants(model);
    const step = { index, action, model, violations };
    steps.push(step);
    if (!firstViolation && violations.length > 0) firstViolation = step;
  });

  return {
    ok: firstViolation === undefined,
    finalModel: model,
    steps,
    ...(firstViolation ? { firstViolation } : {}),
  };
}
