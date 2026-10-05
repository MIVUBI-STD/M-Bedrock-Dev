# Engineering Contracts

Repository-owned implementation and validation constraints.

Engineering Contracts answer: **How must an implementation remain safe, deterministic, maintainable, or verifiable?**

They do not define what a particular map is designed to do. Global contracts must never be promoted into Game Design automatically.


## Naming rule

Use **Engineering Contract** for global MIVUBI implementation/validation requirements. Do not use generic `policy` as the canonical name for new contracts.

## Contract registry

`contract-registry.json` is the machine-readable canonical registry for exported cross-package contracts, their owners, producers, consumers, verification level, lifecycle status, and replacement relationship.

The registry is executable repository authority, not documentation. Human-facing system docs may explain it but must not maintain a second copy.
