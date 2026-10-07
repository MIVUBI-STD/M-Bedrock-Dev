# Virtual Clients Documentation

This directory explains the system. Source code and machine-readable contracts remain authoritative.

## Read in this order

1. `runtime-core.md` — runtime architecture, ownership, state and public-contract boundaries.
2. `base-image.md` — Base preparation and immutable-image requirements.
3. `acceptance.md` — acceptance criteria and evidence rules.
4. `static-readiness-freeze.md` — what source review covers and what still requires target-machine proof.
5. `four-client-failure-matrix.md` — targeted failure scenarios for Native + three Virtual clients.

## Machine-readable authorities

Do not duplicate these policies in prose:

- `../distribution/package-contract.json` — installed package contents.
- `../distribution/install-lifecycle-policy.json` — installer ownership and lifecycle permissions.
- `../distribution/release-channel.json` — stable update/release channel.
- runtime-core constants and typed contracts — runtime schema, lifecycle, resources, Guest Agent protocol and product limits.

## Documentation rule

Documentation describes intent, invariants and operator procedure. It must not create a second state machine, version authority, installer policy, readiness definition or runtime limit. When prose and a machine-readable/source authority disagree, fix the prose or the source owner explicitly; do not add an alias or compatibility interpretation.

Historical implementation notes belong in Git history, not permanent architecture documentation.
