---
id: document.repair.transactions
class: DOCUMENT
domain: repair
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Repair Transactions

A repair is represented as an explicit PatchTransaction.

## Authority

PatchTransaction owns intended mutation, not current source truth.

The current source fingerprint must be supplied independently by the artifact/session owner at application time.

## Derived fields

`affectedPaths` is derived from transaction operations. Callers do not author it separately.

## Preconditions

Supported preconditions include:

- source-fingerprint;
- exact text equality.

Replace-command operations additionally require exact line content equality during application.

## Safety

- original source remains immutable;
- sourceRoot and workingRoot are realpath-resolved and must not overlap;
- mutation targets must remain inside the real working root;
- symlink escapes and direct symlink targets fail closed;
- hardlinks back to the corresponding immutable source file fail closed;
- replacement command must remain one logical line;
- ambiguous text replacement fails closed;
- atomic writes use collision-safe same-directory temp files;
- destination mode is preserved across atomic replacement;
- transaction failure triggers rollback of already-written files;
- rollback failure is surfaced separately;
- validation steps describe the proof required after mutation.

## Application boundary

Transactions may mutate only the working copy.

Before mutation:
- source and working roots must exist and resolve through realpath;
- source and working roots must not overlap;
- target paths must remain inside the real working root;
- source overlap, direct symlink targets, and unsafe hardlink cases fail closed;
- transaction preconditions must match current source evidence.

Replace-command operations require exact source-line evidence. Replace-text operations reject ambiguous multiple matches.

Low-level mutation primitives are internal implementation details. Production mutation enters through the authorized orchestrator repair path, not by calling filesystem primitives directly.

## Atomic write and rollback

Writes use collision-safe same-directory temporary files and atomic replacement where the filesystem supports it.

Before final rename:
- content is fully written;
- file data is synced;
- destination mode is preserved where applicable.

If a later operation fails, previously written files are restored. Rollback failure is surfaced separately.

Filesystem safety reduces path/link/collision risk but does not claim protection against a fully hostile filesystem or privileged concurrent attacker.

## Production repair admission

```text
Approved Bug or approved intentional design change
→ Repair Contract
→ repair admission
→ preservation readiness
→ current fingerprint / preconditions
→ authorized PatchTransaction
→ working-copy mutation
→ defect validation
→ preservation validation
→ repair lifecycle completion
```

A technically valid patch is not mutation authority by itself.