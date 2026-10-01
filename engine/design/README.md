# Game Design Authority

This directory owns explicit **map- or mode-scoped intended gameplay**.

Game Design answers: **What is this experience supposed to do?**

It does not describe generic Minecraft behavior and it does not impose generic engineering preferences.

## Authority

```text
approved authored design / client brief
→ authoritative Game Design

approved reconstructed design
→ clarification evidence only

Gameplay Intent reconstruction
→ implementation-derived understanding only
```

Minecraft documentation, global engineering contracts, generic reliability rules, and runtime observations are not Game Design authority.

Project-local design belongs at `workspace/active/<project-id>/design/game-design.json`.
The typed contract is owned by `engine/packages/game-design-spec/`.

## Version binding

Game Design used for audit must be explicitly bound to the selected map/version.

Do not reuse design rules from an older version, another map, historical QA, development source, or external documentation merely because the mechanic looks similar.

If a newer client-requested version changes behavior, the selected current version is authoritative for the audit scope; older behavior remains history.

## Intent adjudication

Authoritative approved Game Design is the oracle for deciding whether an observed gameplay behavior is intended.

Use `intentRules` only for behavior whose correctness depends on gameplay context. A rule states whether an outcome is `required`, `forbidden`, `allowed`, or explicitly `unspecified`, and may be scoped by mode, phase, actor type, and state tags.

The gameplay workflow is design-first:

```text
current approved Game Design
→ scoped Gameplay Contract
→ actual behavior
→ canonical diagnostic-reasoning intent gate
→ designed-behavior | ambiguous-intent | design-review | confirmed-defect
```

Only `confirmed-defect` may continue toward bug admission. Implementation code is evidence of what exists, not authority for what the game is supposed to do.

## Design readiness

Before gameplay bug discovery, recover the current map/mode Game Design and establish readiness for the audit scope.

```text
READY    all material rules for the scope are grounded
PARTIAL  unresolved rules exist, but none can change the current scoped decision
BLOCKED  a material unknown/conflict can change bug-vs-feature classification
```

READY and scoped-safe PARTIAL may proceed to actual-behavior analysis. BLOCKED stops defect classification for the affected scope.

Derived Gameplay Contract understanding is temporary. Do not persist it as a second design authority. If discussion changes intended gameplay, update and approve the canonical project-local Game Design first.
