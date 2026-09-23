# Entity Event Reachability

Entity transition analysis now validates the internal sensor/event graph.

Strong diagnostics:

- sensor references an undefined event;
- event trigger references an undefined event;
- event add/remove references an undefined component group.

Conservative informational diagnostic:

- a defined event is not reachable from configured sensor/event roots.

The latter is intentionally not treated as a defect because Bedrock events may also be triggered externally by commands, animation controllers, scripts, spawn logic, or engine-owned behavior.

## Reachability

```text
sensor event
→ defined entity event
→ trigger event
→ trigger event
→ ...
```

Only defined internal edges are traversed.

This gives a reliable answer to:

> Is the state transition chain internally well-formed?

without pretending static analysis can prove every possible runtime entry point.
