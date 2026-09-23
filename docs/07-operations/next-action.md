# Next Action

Script API knowledge now includes version and execution-privilege reasoning.

Implemented:

1. machine-readable Script API capability/version rules;
2. stable dynamic-property version anchors;
3. restricted vs early vs default execution knowledge;
4. AST detection of known world-state mutations inside before-event callbacks;
5. SCRIPT_RESTRICTED_EXECUTION_MUTATION diagnostics;
6. SCRIPT_API_VERSION_INCOMPATIBLE diagnostics;
7. prerelease versions remain unknown unless explicitly modeled.

Next priority:

1. expand the matrix from official @minecraft/server changelog/version pages;
2. add per-event introduced/stable/deprecated metadata;
3. model write-privilege annotations for more APIs without broad name guessing;
4. add manifest beta/experiment cross-checking;
5. validate the matrix against real script-heavy maps and update regressions.

Do not infer API legality from method names alone.
