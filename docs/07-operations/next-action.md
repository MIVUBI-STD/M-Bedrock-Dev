# Next Action

Dynamic invariant mining is now available as a conservative candidate-generation layer.

Implemented:

1. mining from known-good RuntimeObservationSnapshot traces;
2. support/antecedent/counterexample accounting;
3. confidence calculation;
4. immediate rejection on known-good counterexample;
5. historical-failure challenge;
6. mutation-survivor challenge;
7. candidate/supported/challenged/rejected lifecycle;
8. promotion drafts only for unchallenged supported candidates;
9. no automatic writes to the durable Invariant Registry.

Next high-value work:

1. extend invariant mining to score/tag/entity spatial relations;
2. add trace diversity metrics so repeated identical snapshots do not create misleading support;
3. correlate candidate invariants with semantic coverage buckets;
4. mine transition invariants, not only state relations;
5. add candidate aging/version scoping so Minecraft updates can invalidate stale mined assumptions.

Do not auto-promote mined invariants.
