# Development Operations

## Command authority

`DEV.cmd` is the sole repository-level developer command surface.

```text
DEV.cmd setup
DEV.cmd doctor
DEV.cmd check
DEV.cmd test
DEV.cmd inspect <artifact>
DEV.cmd finalize-local
```

It delegates to `tooling/windows-toolchain/dev.ps1`. Internal package scripts remain implementation details.

`DEV.cmd doctor` checks the exact pinned Node/npm developer toolchain, PowerShell, Git/branch context, dependency lock state, installed dependencies, and local workspace shape without owning product semantics.

## Toolchain authority

`toolchain.json` owns supported developer-tool policy. The developer/build environment pins Node `24.21.0` and npm `11.19.0`; `package.json#engines` remains the broader runtime compatibility contract for Node 24.

Do not require global TypeScript/Vitest/build tools when package-managed versions are sufficient.

## Verification lanes

Use targeted proof during development. Integrated repository verification is a checkpoint, not an inner-loop substitute.

```text
policy/docs change      → structural review
TypeScript owner        → typecheck + targeted test
archive/repair owner    → targeted fixture tests
cross-owner checkpoint  → module shape + dependency graph + integrated Verify
real artifact behavior  → LOCAL_ARTIFACT
Minecraft import/open   → LOCAL_MINECRAFT
gameplay/runtime        → LIVE_MINECRAFT
```

## Distribution boundary

Build/package commands may produce artifacts only in ignored/generated output locations. They must not overwrite original user artifacts.

Release/promotion to `main` is separate from ordinary development.

## CI principles

- read-only permissions by default;
- bounded timeout;
- pinned major/trusted actions;
- exact-head evidence;
- no commit-back;
- no secrets for ordinary verification;
- no full expensive workflow on every trivial Local edit unless a specific invariant requires it.

Focused workflows are evidence tools, not parallel readiness authorities.
