# Next Action

Current phase: derived topology candidates and patch transaction contracts exist.

Next architecture topic: **Safe Transaction Application + Regression Fixture**.

Recommended next work:

1. add working-copy-only transaction application;
2. guarantee original source paths cannot be mutation targets;
3. implement atomic file replacement and rollback metadata;
4. add command-line-aware replacement rather than blind whole-file replacement;
5. add coordinate translation helper for absolute typed effects;
6. build a minimal regression fixture with repeated arena-like command groups and one outlier;
7. prove diagnose → patch plan → apply → reparse → topology validate on that fixture;
8. only then connect real archive extraction and run the same pipeline on an actual mcworld.

Runtime/game verification remains a separate proof layer.
