# Eval Contract

Evaluate whether Target Repair:
- bug repair starts only from an Approved Bug;
- carries a Repair Contract with non-empty Must Change and Must Preserve;
- explicit modification changes Game Design first when intended behavior changes;
- triggers only after grounded defect or explicit modification;
- mutates target working copy, not engine or original artifact;
- uses preconditions and bounded patch scope;
- reruns the check that justified repair;
- emits detection-development handoff instead of modifying detector capability.
