# Terminal Race Regression Fixtures

Reduced, redistribution-safe source fixtures for the pre-existing `REG-DOUBLE-TERMINAL` regression expectation in `engine/reliability/corpus/audit-detection-cases.json`.

- `unguarded-deferred.ts` — an event ingress and an unguarded deferred ingress converge on one non-idempotent terminal owner; expected regression disposition: defect.
- `one-shot-latch.ts` — the same convergence is protected by a source-visible one-shot latch; expected regression disposition: designed behavior.
- `two-event-unresolved.ts` — two event ingresses converge without source proof that both can commit in one lifecycle; expected regression disposition: insufficient evidence.

These fixtures test terminal reachability, exact commit guarding, and conservative proof admission. They are evaluation material, not current-map gameplay authority.
