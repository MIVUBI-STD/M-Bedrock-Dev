# Bounded Exhaustive State Exploration

Small critical gameplay subsystems can now be explored systematically instead of relying only on generated random sequences.

## Strategy

The explorer uses deterministic breadth-first search.

```text
initial state
→ enumerate sorted legal action vocabulary
→ apply action
→ canonical state identity
→ unseen state?
   ├─ no  → record transition, do not expand
   └─ yes → enqueue
```

BFS gives shortest-depth counterexamples within the configured bounds.

## Budgets

Every run requires:

- `maxDepth`;
- `maxStates`.

The result explicitly reports `truncated` when the state budget prevents further expansion.

## Canonical identity

Session state identity normalizes:

- players by player id;
- arenas by arena id;
- arena memberships by player id;
- optional assignment as explicit null.

Equivalent object insertion order therefore hashes to the same state.

## No-op transitions

Actions that do not change state are retained as transition evidence but are not expanded as new states.

This keeps invalid/precondition-failing actions visible without exploding the state graph.

## Intended use

Use exhaustive bounded exploration for small critical domains such as:

- two-player/two-arena assignment;
- start/reset interaction;
- disconnect/reconnect lifecycle;
- cutscene ownership.

Larger state spaces should use semantic coverage-guided search.
