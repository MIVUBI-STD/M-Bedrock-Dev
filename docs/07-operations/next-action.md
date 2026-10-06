## Virtual Clients Window Layout continuation

REMOTE_GITHUB source now has Window Layout v2 through the desktop boundary:
Grid / Focus / Columns, display discovery, semantic request contracts, Rust-owned
adaptive geometry, remembered defaults, and the quick configuration surface.

Next source unit is **Screen Overlay native ownership**, not another layout
system. Requirements:
- consume the exact arranged slot/window identity result from Window Layout;
- transparent, click-through, non-focusable and topmost relative to its target;
- default content is Screen number + label;
- custom labels remain presentation preference only;
- Identify screens is a temporary mode of the same overlay owner;
- overlay disappears when its target disappears and is recreated only through
  explicit Arrange/re-apply, not a permanent auto-rearrange daemon;
- cleanup must be deterministic when the app exits or layout is reapplied;
- no Minecraft pack/HUD modification and no PowerShell polling daemon.

Do not add custom coordinates, drag-and-drop layout editing, overlay themes,
font editors, animation, macros or additional layout presets without observed
need.

# Next Action

## Current lane — Real Map Audit / Detection Benchmark

Architecture is frozen again.

The only production flow is:

```text
raw user request
→ Pre-Audit Plan
→ user confirms scope / method
→ audit <selected.mcworld>
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
→ BUG | DESIGN_MISMATCH
```

## Next action

The current 22-map source/package deep pass is closed. For this batch, do **not** reopen broad source discovery unless the artifact/version changes or new evidence exposes a concrete detection gap.

Current continuation:

```text
approved canonical findings
→ targeted runtime residue only
→ exact scenario execution on LOCAL_MINECRAFT / LIVE_MINECRAFT
→ PASS | FAIL→promote | INCONCLUSIVE
```

Runtime scenarios for the current batch are projected in:
`experiments/real-map-audits/runtime-validation.md`.

For a new or changed selected artifact, before source/gameplay analysis, show one compact Pre-Audit Plan in chat and confirm:
- target/map version;
- comprehensive pre-testing objective;
- systems/check families that will be inspected;
- static-first / bounded causal proof strategy;
- requested focus or constraints;
- expected Map Audit output.

Do not ask the user to supply known symptoms unless they already have some. This workflow exists to discover issues before manual testing.

Then use one exact selected artifact with stable SHA-256.

Evaluate the complete flow once and record:

- Discovery source accounting;
- semantic-understanding gaps;
- Gameplay Model Closure;
- activated cross-system scenario families;
- Scenario Closure;
- counter-proof residue;
- `issueLanes.BUG`;
- `issueLanes.DESIGN_MISMATCH`;
- correctness of `gameplayFlow`, primary `failureDomain`, and `contributingDomains[]`;
- runtime-proof questions;
- false negatives / false positives against independent expectations.

## Review versus proof improvement

`PREPARE_REVIEW` means the Map Audit Report is complete enough to review honestly. It does not mean all findings are PROVEN.

When review-ready output still contains NEED_VALIDATION:

```text
Map Audit Report
→ may be reviewed now
→ optional bounded proof-improvement tasks may still promote findings
→ unresolved findings remain visible if proof cannot be obtained
```

A blocking PROVE checkpoint is different: it requires `RESOLVE_DEFECTS` before review readiness.

## Hard rules

- one artifact = one current gameplay authority;
- only `audit` is a production map-audit command;
- no specialist document owns an alternate workflow;
- source-accounted does not mean semantically understood;
- unknown semantic ownership = Detection Gap, never PASS;
- technical/platform explanation does not erase player-visible Design Mismatch;
- Bug Report V2 preserves explicit `issueType` (`BUG` or `DESIGN_MISMATCH`); legacy entries without it are interpreted as `BUG`;
- one root cause belongs to one issue lane;
- Scenario PARTIAL is allowed only for irreducible runtime proof;
- no new manager/router/state machine/report authority unless real-map evidence proves the existing owner cannot express the required behavior.

## Deferred

- CI/local test execution unless explicitly requested;
- LOCAL_MINECRAFT/LIVE_MINECRAFT except for a specific runtime-proof residue;
- benchmark promotion until exact artifact identity and frozen expectations exist.


## Virtual Clients — implementation and readiness (2026-10-06)

This is separate, user-requested Product Development on `Experimental`. It does
not reopen or change the Real Map Audit lane above. Current continuation is the
[readiness consistency checkpoint](#readiness-consistency-checkpoint-2026-10-06)
below; earlier checkpoints retain their historical proof limits. The user asks
to continue until the system is ready, not merely until a source commit exists.

### Initial review baseline (historical)

- Reviewed source: `6e87cdfadaefa0714f547f5824747806499fa897`.
- Execution context: `REMOTE_GITHUB`; source review and existing workflow reads only.
- Initial delivery: review and implementation specification. No runtime behavior
  was changed and no new build, test, CI run, or Minecraft session was initiated.
- User constraint: ordinary chat plus the GitHub connector; do not start
  Codex/Work execution for this work.
- Windows + VMware Workstation is the primary target. Native + three Virtual
  clients, manual gameplay, guest-owned accounts, and Native version authority
  remain the product boundary. macOS acceptance is separate.
- Existing exact-head Desktop Verify and Package Smoke runs succeeded:
  [desktop](https://github.com/MIVUBI-STD/M-Bedrock-Dev/actions/runs/37476332443),
  [package](https://github.com/MIVUBI-STD/M-Bedrock-Dev/actions/runs/37476332465).
  Package Smoke covers build, silent install/uninstall, packaged resources, and
  runtime-data preservation. It does not prove VMware/Minecraft behavior.

Current semantic owners remain those in
[Implementation Map](../06-system/implementation-map.md).
Use [Development Discipline](../06-system/development-discipline.md):
reuse existing owners, make the minimum complete change, and stop after proof.
The items below are engineering findings and proposals, not gameplay bug reports.

### Stage 1 source implementation checkpoint (2026-10-06)

The user subsequently authorized code changes and a commit to Experimental
through the GitHub connector. That Stage 1 delivery created no Codex/Work task,
ran no build/tests, and triggered no CI. Later focused Node execution is recorded
in the readiness consistency checkpoint and Current Validation.

Stage 1 source changes now implement:
- a shared production start-batch executor with one failure/rollback exit;
- target preflight before changes, with per-target rechecks during execution;
- responsibility tracking before provider start, including partial-start errors;
- restoration of earlier batch changes without stopping pre-existing clients;
- stopping a newly started/resumed client whose verification fails;
- independent UUID/MAC collision checks without changing saved key format;
- frontend state refresh after both success and failure, preserving the original
  operation error and hiding controls if current state cannot be retrieved;
- explicit restore-loss confirmation and Stop all support for suspended clients.

Nine Rust regression cases and nine frontend regression cases were added.
They are executable specifications, NOT executed PASS results.
Current proof is recorded in [Current Validation](current-validation.md).

Stage 1 remains pending execution verification.

### Stage 2 admission and contract checkpoint (2026-10-06)

The user authorized continuing source implementation through GitHub.
Implemented in this bounded pass:
- one backend action admission policy for both UI projection and execution;
- action-specific compatibility, identity, recovery and resource preconditions;
- optional schema-1 action reason, with existing enum values retained;
- required payload validation on 21 public and 3 desktop command responses;
- honest power/setup labels and backend-derived batch Start eligibility;
- serialized refresh on visible Clients-page return/focus, without polling.

Twenty-one regression cases were added (six Rust, fifteen frontend); none were
executed in this pass. Existing Base preflight parser tests were adapted to the
required payload validator. See Current Validation for the proof ceiling.

At this checkpoint, command activity and first boot had not yet been implemented;
the later checkpoints below supersede that status. Current Stage 2 residue is
measured lightweight status performance and detailed internal-stage progress.
Command-boundary backend activity is now implemented. Focus/visibility refresh
is not continuous runtime monitoring or live interactive proof.

Stages 3–4 now have partial source implementation described below. Full build,
Rust/frontend suites and target-machine acceptance remain open.

### Naming and admission ownership checkpoint (2026-10-06)

Explicit continuation scope: make names unambiguous and touched responsibilities
modular without adding a new runtime system.

- Goal: separate pure lifecycle eligibility from observation/provider work and
  align recreation, recovery-point and setup-completion presentation.
- First wrong owners: policy embedded in runtime orchestration; destructive
  recreation described as Refresh in setup presentation.
- Implementation: private lifecycle_admission.rs owns the existing pure policy;
  runtime collects observations and orchestrates provider operations. Eight
  existing policy tests move with their owner. Two Native/schema edge cases are
  added. Public commands/enums and stored data formats remain unchanged.
- UI: Recreate wording is consistent across setup/menu/confirmation. Recovery
  point saved no longer implies gameplay readiness; setup completion has the
  same label in navigation and guidance. The save dialog refers to observing
  the signed-in menu before stopping the client, matching the stopped-state gate.
- Proof: source review and normalized function-body comparison; four new
  regression cases written (two Rust, two frontend), not executed.
- STOP: one atomic source commit and exact remote content verification. No
  runtime/build/test execution or CI run is included.

This was a bounded maintainability delivery. Subsequent first-boot and
command-activity work is recorded below; it does not establish measured status
performance, detailed VM-stage progress, full compatibility or runtime acceptance.

### First-boot and command-activity checkpoint (2026-10-06)

User continuation now requests completing implementation without repeated
continuation prompts. Preserve no-Codex/Work and no-CI execution constraints.

Implemented source in the current pass:
- Explicit per-client start-setup with backend-owned optional action availability.
- Fresh profile/no-checkpoint/unique-VM/finalized-Base/memory gates under lock.
- Existing startup rollback reused; no OOBE wait or premature identity proof.
- Daily startup verification and all-three identity verification remain intact.
- Frontend setup action, capacity disclosure, command routing and payload validation.
- Per-invocation backend command activity through Tauri Channel to Svelte.
- Activity cannot release busy or substitute for final result/reconciliation.
- Fourteen new regression cases written (six Rust, eight frontend), not executed.

The subsequent readiness-consistency pass now reconciles Doctor's identity
milestone with current VM identity and rejects missing/mismatched staged installers. Do not relax exact Guest Agent compatibility without a proven protocol
matrix. Remaining detailed progress, performance and real-machine acceptance must
be named explicitly rather than marked complete by source inspection.

### Readiness consistency checkpoint (2026-10-06)

Implemented:
- ClientProfile owns saved VM identity comparison and verified-provenance presence.
- Doctor and lifecycle admission consume that same helper.
- Missing/currently changed VM identity prevents Doctor from claiming completed
  identity setup; existing daily-start identity gates stay in place.
- UPDATE_STAGED requires an existing installer and matching version/platform/hash/
  signer metadata against the validated manifest.
- Four regression tests added, unexecuted.
- Separately, 15 focused Node checks passed on the unchanged frontend pure modules;
  this does not replace the pending typecheck/build/Vitest/Rust gates.

Remaining readiness gates:
- Run DEV.cmd verify-virtual-clients on the final combined source before claiming
  source readiness. The route now includes frontend Vitest, app typecheck/build/
  Tauri checks, explicit canonical core tests, and core formatting. Package
  readiness still requires installer verification.
- Perform target-machine OOBE, identity, account, recovery and multiplayer acceptance.
- Snapshot source now bounds Guest Agent/VM-identity observation to one collection
  per Virtual per snapshot, and routine UI refresh no longer reloads static policy
  or operation history. Measure real status-read latency and VM memory before
  making efficiency claims.
- Command activity now carries an explicit operation name and user-facing text.
  Rich truthful internal-stage progress is still not implemented; do not invent
  percentages or synthetic stages.
- Guest Agent package version is now separated from the explicit Guest Agent
  protocol contract in source. Unknown protocol versions remain fail-closed;
  target-machine acceptance is still required before this source change is ready.
- Base and Virtual provenance now carry one Base generation identity in source,
  so same-Minecraft-version Base replacement invalidates stale Virtual lineage.
  Legacy profile schemas fail closed and require the existing rebuild/reprovision
  path; target-machine migration/recovery acceptance remains open.

Do not call the whole system ready based on source commits alone. User requests
end-to-end readiness; these unresolved gates are the remaining work, not PASS.

### Complete source-verification route checkpoint (2026-10-06)

The previous virtual-clients:verify script omitted root-managed frontend tests
and dependency-core unit tests. DEV.cmd verify-virtual-clients now delegates to
the expanded existing aggregate. It retains app build/icon ordering and adds
explicit locked core check/test plus core formatting. No second runner or CI was
introduced. Desktop Cargo resolution remains unlocked because that crate has no
tracked Cargo.lock; do not claim fully pinned desktop dependencies.

Four regression cases were authored (three route assertions, one 22-command
registration graph). Three equivalent structural assertion groups ran in Node
and passed; static registration inspection found all 22 frontend commands wired
through Tauri registration and core dispatch. This is not execution of the
aggregate command or its Vitest suite.

Next operator step on an existing Windows development checkout:
- Use the pinned Node/npm toolchain and DEV.cmd doctor.
- Ensure both root and desktop npm ci installations are complete.
- Ensure the Virtual Clients Rust/Windows prerequisites are installed.
- Run DEV.cmd verify-virtual-clients and retain the exact HEAD plus complete
  output of the first failure. Fix that owner and repeat the same checkpoint.

No installer/VM/Minecraft is launched by that command. Current environment cannot
execute the full checkpoint: Rust and package-managed frontend tools are absent,
and the available Node 24.19.0 is not the repository's pinned developer version.
Do not mark this gate PASS from the focused checks.

### Source-grounded findings (review baseline, before Stage 1 changes)

1. **Incomplete batch failure cleanup.**
   `runtime.rs::start_targets` explicitly restores prior states for several
   errors, but lineage, saved-identity, state-validation, and status/telemetry
   failures can propagate directly after earlier clients have started.
   The existing fake-provider rollback tests exercise the helper, not the
   complete orchestration. First owner: runtime lifecycle orchestration.

2. **Stale UI after partial failure.**
   `App.svelte::mutate` refreshes after success but only presents an error
   after failure. A partly completed operation can leave the displayed client
   state outdated. External VMware changes are not automatically reconciled.
   First owner: frontend refresh coordination, using backend truth.

3. **Action availability is narrower than execution admission.**
   `lifecycle_actions` projects power-state/snapshot eligibility, while
   execution separately enforces compatibility, identity and resource checks.
   `view-model.ts` labels STOPPED as Ready. Do not equate a valid power state,
   action eligibility, and verified Minecraft gameplay readiness.
   First owners: lifecycle admission and its presentation.

4. **Setup capacity and first-boot policy need an explicit decision.**
   Doctor can recommend one or two Virtual clients, but identity verification
   requires all three running. `start_targets` uses a 90-second Guest Agent
   wait even during initial guest setup. This establishes a policy/UX mismatch
   and a first-boot timeout risk, not a reproduced OOBE failure.
   First owners: Doctor/setup and lifecycle startup policy.

5. **Application and Guest Agent release versions are tightly coupled.**
   `base_profile_matches_native` requires the Base agent version to equal
   the backend Cargo package version. A backend version bump can invalidate a
   finalized Base even when Minecraft is unchanged. Doctor then selects Base
   rebuild. First owner: version compatibility.

6. **Recovery and batch controls need clearer semantics.**
   Restore recovery point directly invokes reset without its own loss-of-changes
   confirmation. Stop all is disabled when no clients are RUNNING, even if
   SUSPENDED clients remain. First owners: recovery presentation and batch
   action eligibility.

7. **UUID/MAC uniqueness is checked as a combined key.**
   `vm_identity_key` combines UUID and MAC; equality of the combined value
   does not independently prove each component is unique. First owner: identity
   validation. Include same-MAC/different-UUID and same-UUID/different-MAC cases.

8. **Resource optimization is not yet measured performance proof.**
   The backend enforces 4096 MB/2 vCPU, memory-pressure admission, and staggered
   starts. The 720p/low-graphics/about-30-FPS settings in BASE_IMAGE.md are
   configuration targets, not automatically enforced or benchmarked results.
   A suspended client must not be represented as an active low-resource
   multiplayer participant.

9. **Public payload validation is incomplete.**
   `parseSuccessEnvelope<T>` checks schema/data presence then casts data.
   Payload shape and enum values are not validated at runtime.
   First owner: the typed public contract boundary.

10. **Ownership guidance was inconsistent.**
    This is now resolved by promoting non-UI production authority into the
    durable `virtual-clients/` product domain while `apps/virtual-clients/`
    remains user-facing only. Production code no longer depends on
    `experiments/virtual-clients/`, and no product-specific exception is needed.

### Proposed implementation order

These stages are a bounded continuation, not authorization to start an execution
environment or a second persistent workflow.

#### 1. Lifecycle reliability

Goal: failure leaves an accurately reported, bounded result for every affected
client.

- Preflight all targets where possible before mutation.
- Route every failure after mutation through one existing-owner cleanup path.
- Restore only clients changed by the current operation; preserve clients
  already running before it.
- Distinguish recoverable lifecycle work from destructive reprovision.
  Never promise rollback after deletion of the original guest disk.
- Refresh actual status after success and failure without losing the original
  operation error; if refresh fails, label displayed data stale.
- Confirm restore consequences and allow stopping suspended clients.
- Check UUID and MAC uniqueness independently.

Proof required: deterministic orchestration scenarios for later-target failure,
rollback failure, pre-existing running clients, selected-client isolation,
identity collisions, and recovery confirmation routing.
Tests must call the production orchestration with controlled dependencies,
not only a cleanup helper.

STOP: these scenarios pass and all changed behavior has matching source review;
do not add a generic transaction framework or another runtime database.

#### 2. Admission, contracts, and observability

Goal: displayed action availability and actual execution use the same policy.

- Reuse one backend admission function for action projection and execution.
- Recheck immediately before mutation under the operation lock.
- Return typed blockers; keep their policy out of Svelte.
- Keep power state, readiness and transient operation progress distinct.
- Validate public response data, including required fields and enums.
- Reject incompatible contracts explicitly.
- Report actual operation stages rather than invented progress percentages.
- Use bounded lightweight refresh while the relevant UI is active.
  Do not repeatedly perform heavyweight diagnostics for a simple state update.
- Reuse existing runtime state and journal owners; progress must not authorize
  lifecycle transitions independently.

Proof required: projection/execution agreement, malformed payload rejection,
stale refresh ordering, external-state reconciliation, and overlapping action
handling.

#### 3. First-run usability

Goal: one guided path from an unprepared machine to daily client use.

- Retain Doctor.nextSetupAction as the single setup decision owner.
- Distinguish first-boot waiting/user interaction from normal daily startup.
- Show current step, required user action, observed result and recovery path.
- Keep unsupported automation visibly user-guided.
- Proposed v1 scope: prepare three Virtual clients and make the simultaneous
  identity-verification capacity requirement explicit before setup; daily use
  may start fewer. Partial-count onboarding requires a separate approved
  scope decision rather than an implicit change.
- Preserve account sessions for normal lifecycle operations.

Proof required: deterministic setup routing and interruption cases.
OOBE duration, Microsoft sign-in, rendering and guest operation remain
target-machine acceptance; source tests cannot close that residue.

#### 4. Compatibility and maintainability

Goal: safe application maintenance without unnecessary environment recreation.

- Keep application version, public contract schema, Guest Agent protocol,
  persisted profile schema, Base generation identity, and Minecraft version as
  separate responsibilities.
- Expand the Guest Agent protocol compatibility matrix only when a tested
  backward-compatible protocol revision exists. Unknown/incompatible protocol
  versions remain blocked.
- Keep client lineage bound to the registered Base generation rather than only
  Minecraft version. Do not replace this with whole-disk hashing or speculative
  caches.
- Keep non-UI Virtual Clients authority under the durable `virtual-clients/`
  product domain and presentation under `apps/virtual-clients/`. Do not
  recreate duplicate runtime authority under `experiments/`, `apps/`, or
  another owner.
- Extract proven responsibilities from runtime.rs within the existing crate
  when touched: setup, lifecycle, identity, compatibility, recovery/resources.
  Keep runtime orchestration thin; avoid generic manager/registry layers.
- Preserve verified update staging; self-apply remains disabled until its
  separate implementation and acceptance are approved.

Proof required: compatible/incompatible agent matrix, unchanged-Minecraft app
upgrade, stale Base/checkpoint rejection, dependency-boundary review, and
accurate update state.

### Maturity references and limits

- [BlueStacks multi-instance management](https://support.bluestacks.com/hc/en-us/articles/360052834092-How-to-create-and-manage-instances-using-the-Multi-instance-Manager-on-BlueStacks-5):
  learn selected/batch actions and arrangement; folders/search for hundreds of
  instances are unnecessary for the current three-Virtual scope.
- [BlueStacks Eco mode](https://support.bluestacks.com/hc/en-us/articles/360052834772-How-to-run-multiple-instances-of-BlueStacks-5-more-efficiently-using-Eco-mode):
  per-instance FPS control is not equivalent to suspending a Windows guest.
  No equivalent efficiency claim without an enforceable primitive and measures.
- [Genymotion device management](https://docs.genymotion.com/usage/desktop/vd_settings/):
  learn clear boot/reset/log operations, not unrelated Android features.
- [Minecraft Education requirements](https://edusupport.minecraft.net/hc/en-us/articles/360047556591-System-Requirements):
  Android emulators other than the native ChromeOS one are not supported.
  These comparisons do not establish official support for this VMware design.

Later target-machine measures: time to signed-in playable state, idle/active
resident RAM, input responsiveness, concurrent-client stability, reconnect,
snapshot recovery, and session preservation. Do not invent numeric targets
before a representative baseline exists.

Four total clients cannot establish scenarios requiring more than four
simultaneous players. Report this coverage limit explicitly.

### Delivery stop

The initial documentation handoff was committed as
`b100769a9091790688bbc8dafd203ca20039c7b6`.
Stage 1, admission/naming, first-boot/activity and readiness-consistency source
commits are now delivered. Fifteen focused Node checks passed; full compilation,
repository test suites, packaging and target-machine acceptance did not run.
The overall request remains open at the readiness gates above. Source delivery
is not package/live acceptance or a free-usage guarantee. Preserve the user's
no-Codex/Work constraint and do not silently start an execution task or CI.
