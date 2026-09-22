# Next Action

Current phase: foundation/bootstrap.

Recommended implementation sequence:

1. artifact identity + immutable source/working/output model;
2. safe archive ingest and repack contract;
3. normalized project discovery/index;
4. typed dependency/reference graph;
5. first analyzers: manifest, function/command, structure references;
6. typed diagnostics;
7. transactional patch engine;
8. validation + minimal regression fixtures;
9. arena/coordinate transformation;
10. LevelDB/world analysis;
11. Script API analysis;
12. Education compatibility profile;
13. interface expansion such as MCP only after the core boundary is stable.

Next discussion should begin with **Artifact + Archive boundary**, because every later subsystem depends on safe and deterministic ingest.
