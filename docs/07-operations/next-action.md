# Next Action

Current phase: archive transport and first inspect orchestration exist at source level.

Next priority: **CI proof + real minimized mcworld fixture**.

Recommended next work:

1. add GitHub Actions for install, typecheck and Vitest;
2. fix any compile/test defects exposed by CI;
3. create a minimized valid Bedrock mcworld fixture with manifest/functions/structure references;
4. run inspect against the packaged fixture in CI;
5. add deterministic repackage → reopen verification;
6. then run inspect against one real project map locally;
7. only after that extend CLI to diagnose/repair/package commands.

MCP remains deferred until the core pipeline has executable proof.
