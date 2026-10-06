# Result Transaction Regression Fixtures

Reduced fixtures for reusable round/result transaction invariants.

- terminal precedence: one-shot commit safety is separate from deterministic outcome precedence;
- reward cleanup: destructive cleanup must follow durable reward journal state;
- result recovery record: durable terminal records must carry enough semantic identity for replay and crash/reconnect diagnosis.

These fixtures are evaluation material only. They do not describe current gameplay truth for any production map.
