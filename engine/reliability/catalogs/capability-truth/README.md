# Capability Truth Index

Generated self-awareness for M-Bedrock-Dev capabilities.

This is a **projection**, not a new semantic authority.

Canonical declarations remain:
- Task Graph capability registry;
- Analysis Planner capability registry;
- physical source/tests/proof artifacts.

The index answers:
- is a capability only declared, implementation-present, or owner-tested?
- who owns it?
- what execution contexts can run it?
- is it runtime-only?
- which owner-level test paths exist as supporting evidence?

Regenerate with:

`npx tsx tooling/repository/generate-capability-truth.mjs`

Do not hand-edit `current.json`. Historical/manual coverage narratives may explain limitations, but must not override current generated capability existence.


## Proof semantics

`owner-tested` means the owning module contains tests. It does **not** mean every capability declared by that owner has dedicated proof.

Capability-specific verification must be bound explicitly in a future proof registry before any status stronger than `owner-tested` is emitted.
