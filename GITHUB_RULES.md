# GitHub Rules — M-Bedrock-Dev

Canonical GitHub operating rules for repository work.

`Local` is the working authority unless the user explicitly changes it.

## Operating sequence

```text
PIN
→ EXECUTION CONTEXT
→ EXHAUST REMOTE_GITHUB PARTITION
→ READ MINIMUM
→ DIAGNOSE
→ TOOL / TRANSFER GATE
→ WRITE ONCE
→ VERIFY
→ STOP
```

## 1. PIN

Before material work know repository, target ref, current HEAD when relevant, exact semantic owner, and write authority.

- Never silently fall back from `Local`.
- Direct branch/file fetch is current-state authority; search is discovery.
- Replacement/deletion requires current blob/content authority.
- Re-check HEAD only when concurrency is plausible or immediately before a ref move.
- Current source/proof outranks stale continuation prose.

## 2. Execution context and proof ceiling

`REMOTE_GITHUB` may prove source/static/CI contracts.
`LOCAL_ARTIFACT` additionally owns filesystem, archive, local package and deterministic artifact execution.
`LOCAL_MINECRAFT` additionally owns import/open compatibility.
`LIVE_MINECRAFT` owns actual gameplay/runtime behavior.

Never combine evidence from different SHAs as if it were one exact-head proof.

## 3. READ MINIMUM

Default after boot:

```text
owner/source reads   1–3
history reads        0
broad scans          0
```

Open more only for a concrete unresolved question. Truncation or partial output is incomplete evidence, not proof of absence.

Use `docs/06-system/implementation-map.md` before broad search for a known subsystem.

## 4. DIAGNOSE THE FIRST WRONG OWNER

```text
requirement/policy wrong   → semantic policy owner
implementation wrong       → implementation owner
assertion stale            → test owner
CI route wrong             → workflow owner
runtime/toolchain missing  → environment owner
requested evidence missing → proof owner
derived output wrong       → upstream canonical owner
```

CI failure is evidence, not permission to edit the easiest file.

## 5. GitHub-first partition

Exhaust independent GitHub-verifiable work before handoff.

Do not transfer a complete task because one residue needs a local artifact or Minecraft.

Prepare deterministic harnesses/tests/fixtures remotely when they reduce later local work.

## 6. WRITE ONCE

Before repository mutation:

```text
repo/ref/current state pinned
scope and owners final
complete intended file set known
final content ready
no scratch paths
verification route known
```

One logical outcome should normally be one atomic commit. Do not use commits as checkpoints, CI triggers, or transfer experiments.

Commit format:

`<type>(<optional-scope>): <logical outcome>`

Use `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `release`, or bounded `chore`.

## 7. Tool and transfer gate

Prefer:

```text
exact read             → direct GitHub fetch
single bounded edit    → contents API
coherent multi-file    → one Git tree + commit + fast-forward
CI diagnosis           → run → job → failing step → relevant log
local artifact residue → explicit minimum-residue handoff
```

Never use temporary branches/workflows, base64 stand-ins, placeholder source, alternate repository structures, or force-pushes merely to bypass connector limitations.

## 8. Verification

Run the cheapest check that can falsify the changed claim.

- docs/policy → structural/static review
- TypeScript contract → typecheck + targeted tests
- archive/repair behavior → targeted fixture tests
- repository checkpoint → integrated verifier
- Minecraft package/import/runtime → matching local/live context

A queued, running, cancelled, skipped, or unrelated workflow is not PASS.

Do not weaken a valid verifier to obtain green status.

## 9. Failure policy

| Failure | Action |
|---|---|
| capability/permission denial | stop method; 0 retries |
| capability uncertain | one bounded probe |
| malformed valid request | correct once |
| missing target | verify exact repo/ref/path once |
| stale conflict | refetch once then rebuild |
| timeout/unknown mutation | inspect target state before retry |
| same-cause failure with new evidence | max 2 attempts |

Changing tools or representations does not reset retry ceilings.

## 10. Security

Never commit credentials, user/private worlds, production operational data, or extracted proprietary artifacts.

User-supplied archives, JSON, scripts, NBT/LevelDB, paths and identifiers are untrusted input.

## 11. STOP

Stop when the requested GitHub-valid outcome and relevant proof are satisfied, or after delivering the minimum higher-context residue.

Do not automatically audit another layer, synchronize unrelated docs, create proof objects, or resume deferred runtime work.
