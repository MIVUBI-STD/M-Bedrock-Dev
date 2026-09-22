# Next Action

Current phase: CI verification has been introduced.

Immediate sequence:

1. observe the first Verify workflow on Local;
2. inspect failing job logs if any;
3. repair compile/test defects at their exact owners;
4. repeat until the exact Local head is green;
5. then add a minimized valid Bedrock mcworld fixture and deterministic repackage/reopen test;
6. only after executable package proof, run the pipeline against a real project map.

MCP remains deferred until the core pipeline has executable proof.
