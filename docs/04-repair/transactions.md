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
