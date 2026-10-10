# GitHub Rules — Lazy-Developer

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

`REMOTE_GITHUB` is the normal ChatGPT repository context. It may complete source/static repository work directly from the exact GitHub ref without requiring a local checkout or npm execution. When an exact-head GitHub workflow result already exists, it may also contribute CI evidence.
`LOCAL_ARTIFACT` is optional higher-context evidence for filesystem, archive, local package and deterministic artifact execution.
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

Use `docs/system/implementation-map.md` before broad search for a known subsystem.

## 3.1 Knowledge access

When repository knowledge is needed:

```text
Router
→ stable resource ID
→ explicit Graph relationships
→ selected owner
→ targeted read
```

Do not substitute broad code search for ownership routing. Search is a bounded discovery/ranking tool after the initial owner/domain is known.

For documentation, frontmatter `id` is identity and file path is location. Follow domain README links first. For knowledge/reliability data, preserve authority class and do not promote historical or derived material into current proof.

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

## 4.1 ChatGPT no-local-PC invariant

**M-Lazy-Developer ChatGPT workspace contract: ChatGPT + GitHub/cloud-only.** `Local` names the remote GitHub development branch; it is **not** a local-PC checkout. Source authority, development, commits, and recoverable continuity live in GitHub. The user's PC and its local data are not part of this workflow.

**Never ask the user to run npm, Vitest, TypeScript, Minecraft, or a checkout on their own computer** as a prerequisite, workaround, or follow-up to a ChatGPT-owned repository task. Do not ask them to install Node, run `DEV.cmd`, clone/download the repository, provide local filesystem paths or local data, execute a CLI, or upload a locally prepared artifact to compensate for a missing ChatGPT/GitHub tool.

Use the strongest ChatGPT-accessible route in this order:

```text
authenticated GitHub source and exact ref
→ authenticated repository/artifact source when actually accessible
→ authorized ChatGPT/cloud execution when available and required
→ optional existing GitHub manual-only verification when justified and callable
→ exact bounded result with honest proof ceiling
```

A GitHub connector without shell, archive download, or workflow-dispatch access does **not** authorize a user-PC handoff, nor does it make npm, CI, or a cloud runner mandatory for otherwise source-verifiable development. Never claim an unavailable runner, executable test, or Minecraft runtime was used.

If a claim inherently needs executable or live-game evidence that cannot be obtained through an available authorized cloud/runtime route, mark that **specific claim UNKNOWN / NOT EXECUTED**, preserve its exact outstanding proof requirement, complete independent GitHub-valid work, and STOP at the existing proof ceiling. Do not turn this residue into a local-PC request or repeatedly stall development on npm/toolchain checks.

A user-local workflow is outside this ChatGPT + GitHub workspace; mention local-PC instructions only if the user **explicitly changes the workflow and asks for them**. The mere need for Minecraft runtime evidence is not that permission.

## 5. GitHub-first partition

Exhaust independent GitHub-verifiable work before handoff.

Do not transfer a complete task because one residue needs a local artifact or Minecraft.

Prepare deterministic harnesses/tests/fixtures remotely when they improve future executable proof, but do not require a local handoff merely to declare remote source work complete.

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

### Commit-based work continuity

For every material, independently valid work unit, use one logical commit with the existing conventional subject and concise continuity metadata:

```text
Work: <stable domain/topic>
State: ACTIVE | BLOCKED | PAUSED | DONE
Decision: <relevant rationale, if any>
Proof: <actual evidence and verification ceiling>
Unresolved: <specific open issue, if any>
Next: <one actionable step, unless DONE>
```

`Work`, `State`, and `Proof` are required for material commits. Other fields are conditional. DONE closes only the bounded work unit, never automatically the whole feature. Source changes, documentation decisions, and relevant metadata belong in the same commit. Do not create empty heartbeat commits, broken checkpoints, or duplicate planning ledgers. Git already records the diff, SHA, and timestamp.

For resume: identify the requested work; inspect relevant commits plus any newer commits touching its owner/source; compare decisions and claims with the current `Local` HEAD. Historical `Next` is a suggestion at that SHA, not a current command. Where prior commits lack metadata, recover only facts established by diff, current source, or explicit proof. Do not guess missing chat context.

**Repository-URL cold start:** treat "amati/observe repo and follow its rules" as read-only inspection. Resolve the URL ref, pin HEAD, read root routing, this GitHub contract, and the minimum relevant canonical owner. Use commit `Work`, `State`, `Proof`, `Unresolved`, and `Next` only as historical evidence; inspect earlier topic commits when the latest commit concerns an unrelated topic. Validate candidate unfinished work against current source, not the recency of a commit alone. Report what is confirmed, uncertain, and the best evidence-grounded next step. Do not create a checkpoint, session-memory file, progress registry, or commit for cold start. An explicit continue request authorizes bounded work only when intended topic is determinate; otherwise ask one question.

Before publishing a multi-file commit, pin the current HEAD, prepare one Git tree and commit, then fast-forward the expected `Local` ref without force. Verify the ref points to the new commit before claiming it was saved. On concurrent updates, refresh and reconcile rather than overwrite. If mutation outcome is uncertain, inspect the ref before retrying.

Planning owns future intent, not manually synchronized implementation status. Existing workspace/project owners retain project execution data; stable semantic decisions stay in their canonical docs/source. Do not add a parallel memory database, transcript store, or next-to-do file. Uncommitted conversation content cannot be guaranteed recoverable.

## 7. Tool and transfer gate

Prefer:

```text
exact read             → direct GitHub fetch
single bounded edit    → contents API
coherent multi-file    → one Git tree + commit + fast-forward
CI diagnosis           → run → job → failing step → relevant log
unavailable proof      → exact UNKNOWN residue; no user-PC handoff
```

Never use temporary branches/workflows, base64 stand-ins, placeholder source, alternate repository structures, or force-pushes merely to bypass connector limitations.

## CI policy: manual-only, last resort

GitHub Actions workflows are optional tools, not the default verification or completion gate for `Local` development. Never require CI, wait for a run, or trigger a workflow merely to finish a source-verifiable change. Prefer exact-head source review, then a relevant targeted verifier/test when executable evidence is needed and available. Use manual GitHub Actions only when narrower proof is insufficient or an explicit release/integration check is requested.

`Verify`, `Repository Policy`, and `Package Source Snapshot` must remain `workflow_dispatch` only: no automatic `push`, `pull_request`, or scheduled triggers. Existing verification scripts/tests remain available. Never report static inspection as executed tests or Minecraft runtime proof. Branch protection/required checks are separate GitHub settings and must not be assumed changed by workflow edits.

## 8. Verification

Run the cheapest check that can falsify the changed claim.

- docs/policy → exact-head structural/static review
- TypeScript/source contract → exact-head source review + affected contract/test/fixture review; compiler/test execution is additional evidence, not a remote-work prerequisite
- archive/repair behavior → source/fixture reasoning remotely; actual artifact execution only when that claim requires it
- repository checkpoint → inspect repository verifier contracts and affected ownership remotely; executed verifier output is stronger optional evidence
- Minecraft package/import/runtime → actual authorized cloud/live evidence only when available and required; otherwise mark the specific claim UNKNOWN, never request a user-PC test

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

Stop when the requested GitHub-valid outcome and the strongest proof available in REMOTE_GITHUB are satisfied. Higher-context residue remains explicit only for claims that are inherently impossible to decide from repository evidence; it does not make the completed remote source work incomplete.

Do not automatically audit another layer, synchronize unrelated docs, create proof objects, or resume deferred runtime work.