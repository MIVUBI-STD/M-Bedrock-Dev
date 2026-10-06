# Result Transaction Acceptance Fixtures

Holdout-style reduced fixtures for evaluating generalized result-transaction detection without changing production capability.

The set intentionally uses source shapes that differ from the regression fixtures:
- priority-table terminal resolution;
- latch-only terminal ownership;
- cross-function cleanup after reward journaling;
- alternate semantic result-record field names;
- incomplete result recovery identity;
- reconnect transient versus durable player state;
- deferred session-epoch revalidation.

Freeze observed detector output before comparing it with acceptance expectations.
