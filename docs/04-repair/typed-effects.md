# Typed Effects as Repair Input

Repair code should not rewrite coordinates by string replacement.

Typed command effects provide future repair operations with structured inputs:

```text
FillEffect
→ region
→ block
→ mode
→ source evidence
```

and:

```text
TeleportEffect
→ target
→ destination
→ source evidence
```

Arena replication and coordinate transforms should consume these typed values and produce explicit patch transactions with source preconditions.

No mutation behavior is implemented in this phase.
