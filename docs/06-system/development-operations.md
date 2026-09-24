# Development Operations

## Command authority

`DEV.cmd` is the sole repository-level developer command surface.

```text
DEV.cmd setup
DEV.cmd doctor
DEV.cmd audit
DEV.cmd check
DEV.cmd test
DEV.cmd inspect <artifact>
DEV.cmd finalize-local
```

It delegates to `tooling/windows-toolchain/dev.ps1`. Internal package scripts remain implementation details.

`DEV.cmd doctor` checks the exact pinned Node/npm developer toolchain, PowerShell, Git/branch context, dependency lock state, installed dependencies, and local workspace shape without owning product semantics.

## Toolchain authority

`toolchain.json` owns supported developer-tool policy. The developer/build environment pins Node `24.21.0` and npm `11.19.0`; `package.json#engines` remains the broader runtime compatibility contract for Node 24. `package-lock.json` is mandatory and all normal installs use `npm ci`.

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

## Source hygiene audit

`DEV.cmd audit` reports possible unreferenced production source files and production external-package usage.

The audit is intentionally non-blocking. A zero-inbound file or apparently unused dependency is a review candidate, not deletion permission. Dynamic loading, generated entrypoints, runtime adapters, or test-only support can make a candidate legitimate.

Promote a hygiene rule into `verify:repository` only after the repository baseline proves that the rule has low false-positive risk.

## Local readiness gate

`DEV.cmd finalize-local` runs `npm run verify:ready`, combining blocking repository/source verification with the source-hygiene report.

It intentionally does not require a clean Git working tree. Repository readiness and commit timing remain separate developer concerns.

## Dependency execution policy

Production source may import external packages only when they are declared in `dependencies`; test/build-only packages belong in `devDependencies`.

Install scripts are deny-by-default under npm's script policy and approved explicitly by exact locked version in `package.json#allowScripts`. The current approved native/build hooks are `@8crafter/leveldb-zlib@1.6.0` and `esbuild@0.28.2`.

## Public API surface audit

`DEV.cmd audit` also reports cross-owner imports that bypass another module's `src/index.ts` entrypoint.

The audit is non-blocking while legacy deep imports remain. Migrate one semantic owner at a time, then promote only that proven owner boundary into a blocking rule. This preserves internal refactor freedom without forcing a repository-wide import rewrite.

## Public API debt ratchet

`tooling/repository/public-api-baseline.json` records the current count of cross-owner deep imports per target owner.

The public API audit fails only when an owner exceeds its recorded baseline. Existing debt may remain temporarily, but it cannot increase. After a migration reduces an owner's count, lower that owner's baseline in the same logical change.

Never raise a baseline merely to make CI green; a baseline increase requires an intentional architecture decision.
