# Automated Validation and GameTest Readiness

Current phase: define invariants and test cases; do not require live execution yet.

Future suites:
- first run vs repeated run
- multi-arena concurrency
- disconnect/reconnect
- reset/restart/crash recovery
- stale timer/form/projectile/cinematic callbacks
- structure/path/automation revalidation
- compatibility-profile regression

Diagnostics:
- VALIDATION_DIAGNOSTIC_WITHOUT_TEST_STRATEGY
- VALIDATION_ONLY_HAPPY_PATH
- VALIDATION_REPEATABILITY_CASE_MISSING
- VALIDATION_MULTI_ARENA_CASE_MISSING
- VALIDATION_RECOVERY_CASE_MISSING
- VALIDATION_HARNESS_VERSION_UNPINNED
