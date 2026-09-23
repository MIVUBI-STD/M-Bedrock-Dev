# Persistence, Save, Reload, and Crash Recovery

## Core rule

Do not assume a clean shutdown.

Runtime may end through:

```text
normal world stop
script reload
server restart
watchdog termination
crash
host/process failure
```

Recovery must work even when final cleanup never ran.

## Durable transaction journal

For critical operations:

```text
PREPARED
  ↓
APPLYING
  ↓
VERIFIED
  ↓
COMMITTED

failure/restart
  ↓
RECOVERING
  ↓
COMMITTED / ABORTED
```

Write durable intent before non-idempotent side effects.

## Recovery entry

```text
script startup
  ↓
worldLoad
  ↓
new bootGeneration
  ↓
load durable journals
  ↓
inspect actual world/runtime state
  ↓
reconcile
  ↓
repair / adopt / abort
  ↓
mark stable
```

Do not inspect world/entity/player state in early startup as if it were fully loaded.

## Reconcile, do not resume

Bad:

```text
saved countdown = 2 seconds remaining
restart
resume timer at 2
```

Safer:

```text
restart
↓
arena journal says COUNTDOWN/APPLYING
↓
inspect participants + world state + generation
↓
abort/reset or reconstruct a valid new transaction
```

The same applies to revive timers, structure placement, pending teleports, and temporary loader roles.

## Durable vs transient

Persist:

- durable progression
- configuration
- migration/schema version
- committed arena/world facts that truly need recovery
- transaction intent/journal
- recovery ownership metadata

Do not persist as live authority:

- Player object references
- timer handles
- callbacks
- current form objects
- reviver handles
- transient ready state without policy
- pending async continuation ownership

## Commit marker rule

```text
APPLY
↓
VERIFY actual world
↓
write COMMITTED
```

Never:

```text
write COMMITTED
↓
hope APPLY finishes
```

## Orphan recovery

At worldLoad inspect:

- temporary chunk/ticking-area leases
- active mutation journals
- critical entity registry
- stale tags/scoreboard mirrors
- pending cleanup markers
- player durable records
- arena generation records

Each artifact becomes:

```text
ADOPT
REPAIR
REMOVE
ABORT
UNKNOWN -> DIAGNOSTIC
```

## Schema migration

Every durable record should include:

```text
schemaVersion
migrationVersion
recordGeneration
lastCommittedPhase
```

Unknown/newer schema must not be silently parsed as current.

## Analyzer diagnostics

- PERSISTENCE_TRANSIENT_STATE_SERIALIZED
- PERSISTENCE_SCHEMA_VERSION_MISSING
- PERSISTENCE_STALE_BOOT_OWNER
- PERSISTENCE_JOURNAL_MISSING_BEFORE_SIDE_EFFECT
- PERSISTENCE_COMMIT_MARKER_TOO_EARLY
- PERSISTENCE_HALF_COMMITTED_TRANSACTION
- PERSISTENCE_BLIND_RESUME_AFTER_RESTART
- PERSISTENCE_RECOVERY_NOT_IDEMPOTENT
- PERSISTENCE_ORPHAN_RESOURCE_UNRECONCILED
- PERSISTENCE_RECONNECT_RESTORES_TRANSIENT_STATE
- PERSISTENCE_WORLDLOAD_RECONCILIATION_MISSING
- PERSISTENCE_RECOVERY_UNBOUNDED
- PERSISTENCE_OLD_SCHEMA_INTERPRETED_CURRENT
- PERSISTENCE_DUPLICATE_APPLY_AFTER_RELOAD
- PERSISTENCE_SHUTDOWN_ONLY_CLEANUP

## Review questions

1. What must survive restart?
2. What must never survive as live authority?
3. Is intent journaled before side effects?
4. Is COMMITTED written only after verification?
5. What happens if crash occurs after APPLY but before COMMIT?
6. Can recovery run twice safely?
7. What identifies the current bootGeneration?
8. What orphan resources are enumerated?
9. How are old schema versions migrated?
10. Can reconnect resurrect stale round/session state?
