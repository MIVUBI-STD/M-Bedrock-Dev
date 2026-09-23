# Current Validation

Status: EXACT-HEAD VERIFY REMEDIATION ACTIVE

GitHub Actions evidence:

- full Verify now runs on every push to `Local`;
- repository policy and TypeScript typecheck are green on the recent remediation heads;
- `252f7831ec2d8698cb833ccb22f7fa69f93d6a00` reached 162/163 passing tests;
- its sole remaining property-based counterexample showed that moving a starting player to another arena could leave the old arena cutscene active.

Cutscene ownership is now derived from actual arena membership plus player phase after membership/phase transitions, rather than patched action-by-action. A focused regression test covers the cross-arena move case.

The next exact-head Verify run is the source-proof candidate.

Still not proven:

- genuine Minecraft-loadable mcworld acceptance;
- production-map analysis;
- Minecraft runtime behavior.
