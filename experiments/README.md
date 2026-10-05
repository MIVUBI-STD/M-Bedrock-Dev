# Experimental

Bounded research, design studies, parser spikes, compatibility probes, and unapproved technology experiments belong here.

Experimental material:
- is not production authority;
- is not a canonical implementation owner;
- does not prove package/runtime capability;
- must not be silently imported into production source;
- should be deleted or promoted deliberately once a decision is made.

Completed audit runs, detector-learning runs, benchmark executions, and other chronological evidence belong in `engine/reliability/history/`, not here.

Git history remains the archive for experiments that are fully retired after promotion.

## Current studies

- [Architecture learning synthesis](./architecture-learning-synthesis-2026-09-28.md) — research reference for architecture decisions not yet fully retired.
- [UI information architecture](./ui-information-architecture-2026-09-28.md) — non-production future review-UI study.
- [UI wireframe layout contract](./ui-wireframe-layout-contract-2026-09-28.md) — non-production future review-UI design reference.

## Promotion rule

```text
experiment
├─ durable product/architecture rule → canonical source/docs owner
├─ reusable evaluation evidence      → engine/reliability/corpus/
├─ chronological run evidence        → engine/reliability/history/
└─ superseded/no longer needed       → delete; Git history retains it
```

Do not retain a completed experiment merely because it may be useful someday.
