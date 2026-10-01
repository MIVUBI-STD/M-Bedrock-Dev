# Operations

This directory owns **current continuation** and **current proof state only**.

- `next-action.md` — the minimum current continuation.
- `current-validation.md` — a compact snapshot of what is currently proven, partially proven, unproven, and the active proof ceiling.
- `gameplay-understanding-corpus.md` — current corpus continuity where still operationally relevant.

## Snapshot rule

Operations files are replace-in-place current state, not append-only journals.

Do not accumulate:

- chronological CI/run logs;
- old implementation milestones;
- superseded architecture summaries;
- date-stamped audit reports;
- proof-of-proof history.

When a proof or continuation fact becomes stale, replace or remove it. Git history and `engine/reliability/history/` own historical execution evidence. Durable architecture belongs in `docs/06-system/`.
