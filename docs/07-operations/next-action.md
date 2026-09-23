# Next Action

Invariant mining is now diversity-aware, transition-aware, entity-aware and Minecraft-version scoped.

Implemented:

1. semantic snapshot diversity hashing;
2. distinct-state support threshold;
3. player tag → scoreboard relation mining;
4. playing-progress transition mining;
5. entity arena-tag consistency mining;
6. configured entity-in-arena spatial relation mining;
7. Minecraft-version evidence tracking;
8. stale status when a supported candidate lacks evidence on the current Minecraft version;
9. promotion blocked for stale/challenged candidates.

Next high-value work:

1. add semantic-coverage correlation so candidates must be supported across meaningful coverage buckets, not only diverse raw states;
2. add cross-map support/contradiction tracking for project-generic candidates;
3. add candidate aging and revalidation policy after update deltas touch related capabilities;
4. then stop expanding framework breadth and focus future work on detector gaps revealed by real campaign evidence.

Do not infer arena geometry; spatial invariant mining requires explicit configured regions.
