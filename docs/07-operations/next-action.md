# Next Action

P0 repair filesystem hardening is now implemented.

Implemented:

1. realpath-resolved source and working roots;
2. bidirectional root-overlap rejection;
3. lexical + realpath target containment;
4. symlink escape rejection;
5. direct symbolic-link target rejection;
6. hardlink-to-source rejection for corresponding files;
7. collision-safe exclusive atomic temp allocation;
8. file data sync before rename;
9. destination mode preservation;
10. secure target re-resolution during rollback.

No additional generic bug-finder framework work is recommended now.

Remaining high-value work should come from evidence:

- exact-head CI/typecheck/test proof when the user is ready;
- local Minecraft runtime proof when the user is ready;
- survived mutants/regressions that identify a specific detector gap;
- real repair scenarios that expose transaction or validation weaknesses.
