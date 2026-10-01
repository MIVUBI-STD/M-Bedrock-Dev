# Game Design Authority

This directory owns explicit **map- or mode-scoped intended gameplay**.

Game Design answers: **What is this experience supposed to do?**

It does not describe generic Minecraft behavior and it does not impose generic engineering preferences.

## Authority order

```text
approved authored design / client brief
        ↓
approved reconstructed design
        ↓
Gameplay Intent reconstruction
        ↓
Behavior Model / diagnosis
```

Minecraft documentation, global engineering contracts, generic reliability rules, and runtime observations are not Game Design authority.

Project-local design belongs at `workspace/active/<project-id>/design/game-design.json`.
The typed contract is owned by `engine/packages/game-design/`.


## Intent adjudication

Approved Game Design is the oracle for deciding whether an observed gameplay behavior is intended.

Use `intentRules` only for behavior whose correctness depends on gameplay context. A rule states whether an outcome is `required`, `forbidden`, `allowed`, or explicitly `unspecified`, and may be scoped by mode, phase, actor type, and state tags.

The diagnosis boundary is:

```text
observation
→ resolve applicable intent rule
→ intent adjudication
→ working-as-designed | design-ambiguous | design-review | suspected-defect
→ defect confirmation
```

Only `suspected-defect` may proceed to defect confirmation. Implementation code is evidence of what exists, not authority for what the game is supposed to do.
