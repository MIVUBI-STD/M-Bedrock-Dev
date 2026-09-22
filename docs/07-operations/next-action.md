# Next Action

Current phase: source-level safe transaction application and first regression fixture exist.

Next architecture topic: **Archive Transport + Real Project Orchestration**.

Recommended next work:

1. choose and isolate a ZIP transport implementation behind the existing archive safety policy;
2. inventory entries before extraction and enforce budgets before writing;
3. extract only into working/source workspace locations owned by the artifact session;
4. build physical file inventory from extracted content;
5. orchestrate discovery → manifest/function analysis → graph → diagnostics;
6. package deterministic output and immediately reopen/validate the archive;
7. add a CLI-level inspect command as the first thin interface;
8. run the pipeline against a minimized real mcworld fixture before large production maps.

Do not add MCP yet. The CLI/orchestrator should prove the core engine boundary first.
