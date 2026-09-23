# Embedded Command Graph

Command blocks stored inside mcstructure are now first-class semantic graph nodes.

Graph shape:

```text
structure
  └─ CONTAINS → embedded command
                    ├─ CALLS → function
                    ├─ LOADS_STRUCTURE → structure
                    ├─ READS/WRITES_SCOREBOARD → objective
                    └─ WRITES_TAG → tag
```

This closes a major visibility gap: runtime logic can live inside a structure even when behavior-pack functions appear clean.

Scoreboard objectives and tags referenced only by embedded commands are also added to the project semantic state model before graph resolution.

Unresolved references originating from embedded command blocks now participate in normal reference diagnostics.
