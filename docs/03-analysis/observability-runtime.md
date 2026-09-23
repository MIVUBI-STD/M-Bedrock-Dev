# Runtime Observability, Trace, and Invariant Integrity

## Trace envelope

tick, operationId, actor/entity, arena generation, subsystem generation, phase, source, evidence stage, result.

## Required principle

Diagnostics should explain why a transition occurred, not merely print that it occurred.

## Analyzer/runtime diagnostics

- OBS_TRACE_CONTEXT_INCOMPLETE
- OBS_OPERATION_ID_MISSING
- OBS_GENERATION_CONTEXT_MISSING
- OBS_INVARIANT_CHECK_MISSING
- OBS_LOG_SPAM_HOTPATH
- OBS_DEV_ACTION_UNATTRIBUTED
- OBS_EVIDENCE_AMBIGUOUS_BUT_MARKED_DEFINITE
- OBS_RUNTIME_CAPTURE_UNAVAILABLE
