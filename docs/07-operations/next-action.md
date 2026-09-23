# Next Action

The broad high-end bug-finder framework is now complete enough to stop adding generic architecture.

Implemented:

1. semantic coverage-guided search;
2. systematic interleaving and bounded model exploration;
3. failure minimization;
4. Bedrock-specific mutation testing against real detectors;
5. blindspot aggregation and adaptive search budget;
6. persistent campaign history;
7. conservative dynamic invariant mining;
8. semantic-state and coverage-bucket diversity;
9. cross-map invariant evidence;
10. Minecraft-update-driven invariant revalidation queue.

Future improvement must be evidence-driven:

```text
survived mutant / historical regression / runtime divergence
→ targeted search task
→ detector or oracle improvement
→ mutation/replay challenge
→ campaign history
```

Do not add another general-purpose framework layer without a demonstrated detector gap.
