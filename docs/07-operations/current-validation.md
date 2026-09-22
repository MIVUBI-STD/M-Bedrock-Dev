# Current Validation

Status: CI VERIFICATION ENABLED

Verified remotely on 2026-09-22:

- prior artifact, graph, analyzer, topology, repair, archive transport and orchestration source remains present;
- GitHub Actions verification is configured for Local, main, pull requests and manual dispatch;
- CI installs dependencies under Node.js 24, runs TypeScript typecheck, then Vitest;
- the verification workflow uses read-only repository contents permission.

Pending executable proof:

- first workflow completion on the new CI commit;
- any compile/test fixes revealed by that run;
- minimized valid mcworld fixture;
- deterministic repackage and reopen verification;
- Minecraft runtime behavior.

Do not promote proof above the latest completed CI result.
