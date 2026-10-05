# Workspace Agent Rules

Applies to working artifacts, project execution data, and tracked report handoff under `workspace/`.

## Canonical layout

The workspace structure and ownership rules are defined by:

- `workspace/README.md` — human-readable workspace contract.
- `workspace/ownership.json` — machine-readable ownership contract.

Do not duplicate the workspace tree in this file.

## Invariants

- Original artifact/source is immutable.
- Working copies are disposable/rebuildable from source + patch history where possible.
- Output packages never overwrite the original artifact.
- Project evidence, patches, state, and generated outputs remain separated by their canonical workspace owners.
- Derived indexes/caches are not source authority.
- Private user artifacts remain ignored and must not be committed.
- `workspace/reports/` is the only tracked canonical current bug-report handoff surface unless its ownership contract is deliberately changed.
- Planning/todo intent does not belong in `workspace/`; repository planning belongs in `planning/`.
