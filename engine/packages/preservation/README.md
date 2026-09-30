# Preservation

Preservation is the safety gate around repair.

A repair is not considered safe merely because the reported symptom disappears.

## Pre-repair

A preservation contract defines:

- must-change invariants;
- must-preserve invariants;
- allowed side effects;
- forbidden side effects;
- optional semantic trace policy identity.

The baseline must prove that must-change behavior is currently broken and must-preserve behavior is currently healthy.

## Post-repair

Verification combines:

```text
must-change now satisfied
+
must-preserve still satisfied
+
forbidden side effects absent under complete observation
+
semantic before/after trace comparison when required
```

If a trace policy is required, missing/unknown/violated trace comparison blocks the receipt.

## Semantic trace comparison

Semantic traces compare named checkpoints and state keys, not raw logs.

A policy separates:

- must-preserve state keys;
- must-change state keys;
- explicitly allowed change keys;
- undeclared changes;
- timing tolerance.

A complete before/after trace pair may resolve to:

```text
equivalent
changed-as-intended
violated
unknown
```

Missing checkpoints or incomplete traces remain unknown.

This prevents a repair from passing simply because known invariants are incomplete and an unrelated behavior drift was never registered.
