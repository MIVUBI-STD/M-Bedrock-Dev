# Eval Contract

Evaluate whether Map Bug Audit:
- pins exactly one Selected Map Version;
- derives Gameplay Contract only from that artifact;
- does not borrow intent from stale/external sources;
- accounts for every discovered gameplay surface;
- keeps undiscovered-surface completeness explicitly unproven;
- treats candidate families as tags, not a discovery whitelist;
- never mutates engine or target;
- never severity-ranks non-defects;
- emits detection-gap when capability is insufficient;
- stops publication when review is unresolved.

Primary corpora:
- `.agents/evals/skill-routing.json`
- `.agents/evals/skill-procedure.json`