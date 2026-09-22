# Next Action

Mutation testing now feeds an actionable blindspot backlog.

Implemented:

1. Script API event drop mutation;
2. event rename mutation;
3. duplicate event subscription mutation;
4. dynamic-property id substitution;
5. AST-based script event/property detector comparison;
6. multi-function graph mutation using the real SemanticGraph;
7. automatic BlindspotTask generation from survived mutants;
8. strategy suggestions and P0/P1/P2 backlog priority;
9. command mutation campaign now returns blindspotTasks;
10. script mutation campaign now returns blindspotTasks.

Next high-value work:

1. domain-specific minimization for surviving source/script/timing mutations;
2. aggregate blindspot tasks across campaigns and deduplicate by operator/domain/evidence;
3. add mutation operator effectiveness history so low-value operators do not waste search budget;
4. add dynamic invariant mining only after known-good trace corpus and campaign history are large enough.

Survived mutants are detector-gap evidence, not automatic proof of a real gameplay bug.
