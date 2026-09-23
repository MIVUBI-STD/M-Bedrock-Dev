# Next Action

Entity knowledge now includes conservative internal event reachability.

Implemented:

1. sensor-root event discovery;
2. sensor → event reachability traversal;
3. chained event trigger traversal;
4. undefined sensor event diagnostics;
5. undefined event-trigger diagnostics;
6. undefined component-group add/remove diagnostics;
7. informational reporting for events not internally reachable.

Next priority:

1. connect reachable event states to specific combat/navigation state requirements;
2. detect transitions that are defined but cannot produce the required component set;
3. expand projectile/fire_at_target semantics;
4. then begin structure/.mcstructure knowledge;
5. follow with chunk/ticking lifecycle knowledge.

The key distinction is preserved:

```text
internally broken transition = diagnostic
not internally reachable = uncertainty, not automatic bug
```
