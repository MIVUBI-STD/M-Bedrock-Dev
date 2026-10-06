## Virtual Clients maintenance hardening (2026-10-07)

Maintenance-only cleanup after remote architecture closure:
- extracted host-side guest Minecraft orchestration from the large runtime owner
  into `virtual-clients/runtime-core/src/minecraft_runtime.rs`; runtime remains
  lifecycle orchestration rather than owning Guest Agent launch policy inline;
- removed the unused Native Minecraft desktop engine instead of retaining
  speculative code for a future Start Session;
- added a distinct `LAUNCH_MINECRAFT` operation-history kind and kept its
  target as the canonical client id;
- centralized the interactive launcher port/timeout naming inside the Guest
  Agent binary without introducing a configuration framework;
- corrected desktop AGENTS rules to the current `virtual-clients/runtime-core/`
  owner, clarified guest-local localhost transport, documented the single Window
  Layout mutation/geometry owners, and prohibited speculative future engines;
- corrected Base docs to allow only the fixed-action localhost Interactive
  Launcher, never a host/LAN listener;
- launcher-missing UI uses the existing Open operation as `Finish setup`, while
  Minecraft launch is offered only when the interactive launcher is positively
  ready;
- removed stale documentation claiming a retained Native launcher engine.

Maintenance stop rule:
- do not split `runtime.rs`, `App.svelte`, contracts or tests merely to reduce
  line count; split only when a stable business/adapter owner can be named;
- do not rename internal `window_arrangement` solely for cosmetic alignment:
  Window Layout is the feature term, arrangement is the internal Windows adapter;
- no new settings framework, service layer, event bus, repository abstraction,
  launcher manager or session manager is justified by current evidence.

Proof ceiling remains unchanged: no CI/local/target-machine execution was run.

---

## Virtual Clients remote-only closure sweep (2026-10-07)

All remaining changes that can be justified from REMOTE_GITHUB evidence were
closed without adding another subsystem:

- interactive-user registration is per Virtual/per Windows user through the
  public-desktop `Enable Virtual Clients Launcher` helper created by the Base;
  registration writes only that user's Startup entry and immediately starts the
  existing Guest Agent binary in `--interactive-launcher` mode;
- SYSTEM Guest Agent remains the only host-facing listener. Interactive launch
  binds only `127.0.0.1:47832`, has no firewall rule and accepts only PING or
  the literal MINECRAFT_EDUCATION action with a correlated request id;
- launcher readiness now requires a PING/READY protocol handshake, not merely an
  open localhost port;
- client status projects `interactiveLauncherReady`; a running client with a
  missing helper is presented as Launcher setup needed and its clear next action
  is Finish setup (open the VM), not a launch operation guaranteed to fail;
- Accounts setup tells the user to use the one-click desktop launcher helper
  before Minecraft sign-in;
- one Virtual is defined to own one interactive Windows user session; concurrent
  RDP/multi-user sessions are outside the accepted launcher routing model;
- the unused Native Minecraft launch command and engine were removed entirely;
  reintroduce Native launch only when a proven Start Session workflow has a real
  consumer and target-machine evidence;
- VMware network connection type is observable but NAT/bridged policy remains
  evidence-driven;
- multi-Virtual Minecraft renderer launches reuse the existing pressure-aware
  stagger;
- process presence is labeled Minecraft open, never signed-in/multiplayer ready.

Remote source stop rule reached:
remaining P0/P1 items require actual Windows/VMware/Minecraft Education evidence
(interactive launch, Microsoft auth handoff, four simultaneous clients/accounts,
3D/input/audio behavior, NAT/bridged multiplayer, suspend/reconnect, reboot
persistence). Do not add Start Session, account-state detectors, network mode
forcing, GPU thresholds, auth automation or reconnect machinery before those
proofs exist.

---

## Interactive launcher registration closure — REMOTE_GITHUB (2026-10-07)

The remaining remote registration/IPC gap is now narrowed without adding a new
service or launcher framework:

- the existing Guest Agent binary owns `--register-interactive-launcher` and
  `--interactive-launcher` modes;
- registration is per Windows user after OOBE and writes one Startup entry in
  that user's profile; it also starts the helper immediately, so setup does not
  require logoff/reboot;
- Base installation places a generic `Enable Virtual Clients Launcher.cmd` on
  the Public Desktop. It contains no username/account/session and only invokes
  the per-user registration mode;
- Setup presentation asks the user to double-click that helper once in each
  Virtual, rather than typing command-line flags;
- SYSTEM↔interactive IPC no longer uses ProgramData request/ack files, so there
  is no shared-folder ACL owner. It uses a loopback-only Win32 TCP listener on
  `127.0.0.1:47832`, never wildcard/LAN bind;
- the loopback protocol accepts one literal action, carries a request ID, uses
  request half-close before response, and exposes no executable/path/credential;
- helper readiness is observed through loopback connectivity and projected as
  `interactiveLauncherReady`;
- Minecraft launch is offered only when the VM is running, Minecraft is closed,
  and the interactive helper is explicitly ready. Otherwise the user gets Open
  so they can repair the Virtual interactively;
- the helper requires Explorer in its exact nonzero Windows session before
  launching Minecraft UI.

Remaining proof is target-machine behavior: Startup registration under the
canonical Windows image, cross-account loopback between SYSTEM and the
interactive Win32 helper, actual Minecraft UI/auth handoff, and persistence
after guest reboot. No filesystem IPC/ACL layer or second network service should
be introduced unless that proof identifies a concrete failure.

---

## Interactive launcher registration/IPC refinement (2026-10-07)

- Interactive launcher registration is now self-owned by the same Guest Agent
  binary through `--register-interactive-launcher`. It writes one Startup entry
  in the current Windows user's profile; no username is baked into Base.
- Runtime helper readiness is projected through `interactiveLauncherReady`.
  Daily UI does not offer Launch Minecraft when the helper is unavailable.
- Shared ProgramData request/ack IPC was removed before proof. SYSTEM ↔ user
  handoff now uses a loopback-only listener on `127.0.0.1:47832` with one
  literal Minecraft action and request correlation. No LAN/VMware bind and no
  filesystem ACL dependency remain.
- The helper requires a nonzero Windows session with Explorer in that exact
  session before it can launch Minecraft UI.
- Setup instructions explicitly place registration after OOBE and before account
  sign-in/QA_READY.
- Target-machine proof is still required for Startup registration, loopback
  cross-account behavior, Minecraft UI visibility and Microsoft auth handoff.

---

## Four-client deep audit — interactive auth and concurrency (2026-10-07)

Deep scenario audit found two P0 proof boundaries and several secondary ones.

P0 interactive-auth boundary:
- the installed Guest Agent is a SYSTEM/ServiceAccount startup task;
- SYSTEM/session-0 execution is not accepted as proof of visible Minecraft UI or
  Microsoft authentication UI in the Virtual's interactive desktop;
- Guest Agent launch now hands off through a local fixed-action interactive mode
  instead of directly claiming SYSTEM can launch the UI;
- the same binary has a narrow `--interactive-launcher` mode with no network
  listener and only one literal action: Minecraft Education;
- local launch requests carry a short correlation ID so stale request/ack files
  cannot be accepted as current success;
- per-Virtual registration is now implemented without a privileged scheduled
  task: the Base exposes a public-desktop `Enable Virtual Clients Launcher`
  shortcut; when the actual Virtual user runs it, the same Guest Agent binary
  writes a per-user Startup entry and starts `--interactive-launcher`
  immediately;
- SYSTEM↔interactive handoff now uses a localhost-only listener on 127.0.0.1,
  not a shared ProgramData request folder, so no cross-user writable IPC ACL is
  required; readiness uses an explicit PING/READY handshake rather than merely
  checking whether the port accepts connections;
- user-specific interactive launcher registration belongs after each Virtual's
  OOBE, never in the generalized Base.

P0 four-client boundary:
- no official support claim was found for one Native + three Minecraft Education
  guests on one physical host; treat it as an engineering capability requiring
  target-machine proof;
- Base preflight now exposes VMware `ethernet0.connectionType` rather than
  assuming NAT/bridged equivalence;
- Minecraft launch after multi-VM start is staggered with the existing pressure
  delay to reduce renderer/disk initialization storms;
- UI wording is `Minecraft open`, not `Minecraft open`, because process
  presence does not prove signed-in menu or multiplayer readiness.

Canonical scenario matrix:
`virtual-clients/docs/four-client-failure-matrix.md`.

Proof must distinguish:
VM running ≠ Minecraft process open ≠ interactive menu usable ≠ account signed
in ≠ multiplayer ready.

No generic remote shell, credential automation, GPU threshold, forced network
mode, audio policy, or additional state machine was introduced without evidence.

---

## Virtual Clients Minecraft auto-launch — REMOTE_GITHUB implementation (2026-10-07)

Implemented source:
- Guest Agent protocol is now v2 for the authenticated, fixed-purpose
  `POST /minecraft/launch` capability. Protocol v1 remains status-readable but
  is not launch-capable and no longer satisfies current Base lineage.
- The endpoint accepts no command/path/arguments. It only launches the detected
  Minecraft Education application and is idempotent when Minecraft is already
  running.
- Guest status now observes `minecraftRunning`; ClientStatus projects that
  observation so daily UI distinguishes Minecraft open vs Minecraft closed.
- Daily Start/Resume performs VM admission + compatibility first, then launches
  Minecraft and opens the VM console. Minecraft-launch failure does not rollback
  a verified running VM.
- Restart and QA_READY reset also relaunch Minecraft and reopen the console after
  compatibility succeeds. First-time OOBE start remains intentionally manual.
- A dedicated `launch-minecraft` public command provides retry for a running VM;
  the client primary action becomes Launch Minecraft only when the backend
  explicitly observes `minecraftRunning=false`.
- Existing public-command registration assertions are updated from 22 to 23.

Proof ceiling: source/static review only. Actual Windows Start-menu/AppID,
Minecraft process naming, idempotency, account-session behavior, protocol-v2
Base migration and launch timing remain target-machine acceptance.

---

## Virtual Clients desktop orchestration contradiction sweep (2026-10-07)

REMOTE_GITHUB cleanup after Window Layout/Screen Overlay implementation:
- Removed obsolete public `window_arrange` and `window_clear_overlay` mutation
  paths. UI and Tauri now expose one layout mutation path:
  `window_apply_layout`; Overlay OFF is handled by that same operation.
- Removed the unused persisted-reset API; Reset in the dialog is draft-only and
  Apply remains the single persistence point.
- Added structural regression coverage so legacy layout mutation commands cannot
  silently return.
- Added explicit Implementation Map owners for Window Layout geometry/HWND
  adapter, Screen Overlay lifecycle and DPI initialization.
- Added canonical Window Layout acceptance covering Grid/Focus/Columns,
  multi-display fallback, overlay focus/click-through, Identify, missing clients,
  app-exit cleanup and mixed DPI.
- Fixed a cross-platform source contradiction: the non-Windows stub now matches
  the atomic command's `arrange_with_slots` internal API.
- Removed raw HWND values from the global overlay text registry and serialized
  first-time overlay-thread startup to reduce Send/Sync and double-start risks.
- Virtual window discovery now requires both Virtual-01/02/03 title identity and
  a VMware-like host process; Native requires Minecraft/Education-like title +
  process. Ambiguous candidates remain missing rather than guessed.
- Added IPC-side Screen Overlay validation for opacity, known client IDs and the
  32-character label bound instead of trusting localStorage/UI validation alone.

Proof ceiling remains REMOTE_GITHUB source/static review. No CI/local build was
run. Desktop dependency resolution remains unlocked under the repository's
existing policy; do not describe the new windows-sys surface as compiled or
fully pinned until the canonical checkpoint proves it.

---

## Window Layout remote hardening follow-up (2026-10-07)

Additional source hardening:
- Screen Overlay thread now has a startup handshake. Class-registration failure
  is reported at Apply instead of leaving a dead sender/receiver pair.
- Overlay labels are bounded to the same 32-character limit in persisted
  preference validation as in the UI.
- Identify screens uses a generation token so a three-second restore from an
  older Identify action cannot overwrite a newer Apply/Arrange choice.
- Per-monitor-v2 DPI awareness is configured before the desktop app starts;
  an already-configured equivalent host context is not downgraded.
- Overlay failure is nonfatal after successful window placement. The arrangement
  result reports overlayApplied/overlayWarning, and the UI tells the user that
  windows were arranged even if Screen Overlay could not be shown.

No new user-facing subsystem was added. Remaining uncertainty is execution proof:
Rust/windows-sys compilation on the pinned Windows toolchain, real Minecraft/
VMware HWND identity, z-order/fullscreen behavior, and mixed-DPI observation.

---

## Virtual Clients Screen Overlay — REMOTE_GITHUB implementation (2026-10-07)

Implemented source on top of Window Layout v2:
- Native Screen Overlay owner uses lightweight Win32 windows from Rust through
  a minimal windows-sys dependency; no extra WebViews and no Minecraft HUD/pack.
- Overlay windows are transparent/layered, click-through, non-activating,
  tool-window style and topmost. Creation/destruction is owned by one dedicated
  overlay thread with an explicit command channel.
- Arrange + Screen Overlay is one atomic desktop command. Overlay rectangles are
  derived from the exact Rust Window Layout slots; there is no second geometry
  engine.
- Turning Screen Overlay off and applying a layout clears existing overlays.
  App shutdown sends deterministic overlay shutdown/cleanup.
- Defaults show Screen number + user label in the top-left. Labels are editable
  presentation preferences only.
- Identify screens reuses the same overlay owner in temporary identify mode for
  three seconds, then reapplies the normal overlay. No second overlay subsystem.
- Reset to defaults is draft-only inside the dialog; preference persistence
  occurs only on Apply, so Cancel has no hidden side effect.
- Native window discovery now fails closed on an ambiguous Native title by also
  requiring a Minecraft/Education-like process name. Virtual windows still
  require their explicit Virtual-01/02/03 marker.

Deliberate behavior:
- Window Layout and Screen Overlay are re-applied only when the user chooses
  Arrange/Apply/Identify. The app does not continuously force Minecraft window
  positions. If the user manually moves a Minecraft window, pressing Arrange
  restores both layout and overlay positions.
- A missing/crashed client is reported as missing; other windows are arranged
  from the windows actually found. There is no background auto-reflow daemon.

Proof ceiling: REMOTE_GITHUB source/static review. The windows-sys API surface,
Win32 thread behavior, DPI behavior and actual Minecraft HWND identification
still require the canonical local Windows checkpoint before readiness claims.

---

## Virtual Clients Window Layout v2 — REMOTE_GITHUB implementation (2026-10-07)

Window Layout is now a first-class desktop feature rather than one implicit
Arrange-windows heuristic.

Implemented source:
- One public naming model: Window Layout with Grid, Focus and Columns.
- Display discovery returns index, primary status and working-area dimensions.
- Arrange requests carry only semantic choices: layout, display and optional
  Main window. Frontend never owns pixel coordinates.
- Rust is the single layout-geometry authority. Grid adapts to 1–4 open windows,
  including a gap-free three-window layout; Focus gives the Main window the
  large region; Columns divides the selected display evenly.
- PowerShell is reduced to the Windows adapter boundary: discover target HWNDs
  and display work area, then execute the Rust-produced MoveWindow plan.
- Quick UI uses a split action: Arrange applies the remembered choice; the
  dropdown opens Window Layout configuration.
- Defaults require no setup: Grid, primary/available display fallback, This PC
  as Focus Main window, Screen Overlay enabled with screen number + label.
- One localStorage preference owns presentation choices. Invalid stored data
  falls back to defaults; no database, registry or second runtime state exists.
- Display selection recovers automatically when a saved monitor disappears.
- Window Layout payload validation and preference specifications are authored.

Screen Overlay boundary:
- Overlay configuration is intentionally already part of the Window Layout
  preference and UI: enabled, screen number, label, position and per-client
  custom label.
- The native persistent overlay renderer is NOT yet claimed implemented.
  It must consume the same Rust slot/window identity authority, remain
  click-through/non-focusable, and have explicit cleanup. Do not introduce a
  PowerShell polling daemon, Minecraft HUD modification, or independent overlay
  layout engine merely to complete this feature quickly.
- Identify screens should be implemented through the same native overlay owner,
  as a temporary presentation mode rather than separate overlay infrastructure.

Proof ceiling: REMOTE_GITHUB source/static review only. CI and local execution
remain intentionally deferred.

---

## Virtual Clients Doctor lineage parity — source implementation (2026-10-06)

Baseline: Experimental `a2ade6fc1c8ba9dda020d5919ae88d4a9fe246c0`.

Fixed source inconsistency:
- Runtime start admission already rejects a Virtual whose saved
  `baseGenerationId` does not match the currently registered Base.
- Doctor previously projected client lineage from Minecraft version only, so a
  same-version Base replacement could leave setup/readiness presentation looking
  healthy while lifecycle admission correctly blocked Start.
- Doctor now uses one explicit client-lineage projection requiring Native version,
  Base version and exact Base generation to agree.
- A deterministic regression specification covers current-generation MATCH,
  stale-generation MISMATCH and non-provisioned UNKNOWN.

This keeps Doctor presentation and runtime admission aligned without introducing
another lineage authority. Proof ceiling remains REMOTE_GITHUB source/static
review; the regression test is authored but not executed here.

---

## Virtual Clients production ownership promotion — source implementation (2026-10-06)

Baseline: Experimental `2e37c080fc6c716f461d8c71d4bf4e112b5f82b8`.

The product runtime and packaged assets are promoted out of `experiments/` into the durable `virtual-clients/` product domain so repository semantics have one meaning:
- `virtual-clients/runtime-core/` owns VM lifecycle, setup, resource,
  identity, recovery, support, update and Guest Agent protocol authority.
- `virtual-clients/guest/` owns guest preparation/install scripts.
- `virtual-clients/distribution/` owns release-channel packaging inputs.
- `virtual-clients/acceptance/` owns product acceptance collection assets.
- `apps/virtual-clients/` remains the user-facing desktop surface and thin Tauri adapter.
- app-specific operational documentation lives under `virtual-clients/docs/`.

All known build, Cargo path dependency, package-resource, test-source, developer
verification and release-workflow paths are rewritten to the product location.
The old experimental implementation is deleted rather than retained as an alias
or compatibility copy.

Proof ceiling: REMOTE_GITHUB structural/source review only. CI is intentionally
not run. The moved paths still require the canonical local source checkpoint
before package readiness can be claimed.

---

## Virtual Clients bounded refresh and user-facing activity — source implementation (2026-10-06)

Baseline: Experimental `14b2c2e56d1a6e92b6c2891956961a12bb1bff9c`.

Implemented in Experimental `2e37c080fc6c716f461d8c71d4bf4e112b5f82b8`:
- Runtime snapshot collection now gathers each Virtual client's power state,
  VM identity and bounded Guest Agent status once, then reuses those observations
  while projecting all three client rows. The lifecycle-admission identity check
  remains a separate lightweight live path and does not inherit guest probing.
- Frontend routine refresh no longer reloads operation history on every focus or
  post-mutation reconciliation. History is loaded when Help & Support is opened
  or after creating a support bundle.
- Engine policy is loaded once per process session and reused on routine refresh;
  mutable client state and action admission still come from backend truth.
- Operation activity IPC advances to schema 2 and includes the canonical command
  name. The UI maps it to simple user-facing text such as “Starting virtual
  client…” and “Saving recovery point…” instead of exposing backend terminology.
  This remains command-boundary activity, not invented percentage progress or
  proof of internal-stage completion.
- Regression specifications were updated for the activity schema, user-facing
  labels, lazy history routing, policy reuse and identity projection signatures.

Proof ceiling: REMOTE_GITHUB source/static review only. No CI, TypeScript/Svelte
build, Vitest, Cargo/rustfmt, installer, VMware or Minecraft execution was run.
Real refresh latency, guest responsiveness and memory behavior remain
target-machine measurement work.

---

## Virtual Clients provenance and Guest Agent protocol — source implementation (2026-10-06)

Baseline: Experimental `9e1cc0e4522f59f11bc9789782afb3f948f2ba1b`.

Implemented in Experimental `14b2c2e56d1a6e92b6c2891956961a12bb1bff9c`:
- Guest Agent status now carries an explicit protocol version. Backend
  compatibility uses that protocol authority rather than Cargo package-version
  equality; unknown protocol versions remain fail-closed.
- Base profile schema advances to v3 with `guestAgentProtocol` and a random
  `baseGenerationId` created only when a Base is live-verified and registered.
- Client profile schema advances to v2 and stores the exact Base generation used
  for provisioning/reprovisioning.
- Client/native lineage now requires both Minecraft-version parity and the
  registered Base generation. Re-registering/replacing a Base at the same
  Minecraft version therefore makes older Virtual lineage stale instead of
  silently matching by version.
- Legacy Base/client profile schemas remain readable enough to classify but are
  rejected by the current schema gate. Existing rebuild/reprovision routes own
  recovery; no second migration registry or compatibility database was added.
- Frontend register-Base payload validation now requires the new provenance
  fields. Regression specifications cover protocol compatibility, package-version
  independence, legacy profile rejection, provenance shape and identity behavior.

Proof ceiling: REMOTE_GITHUB source/static review only. No CI, Cargo, Vitest,
package build, installer, VMware or Minecraft execution was run for this change.
The next local checkpoint remains `DEV.cmd verify-virtual-clients`; target-machine
migration, recovery and multiplayer acceptance remain separate.

---

## 2026-10-06 — Virtual Clients action admission and payload validation


## Virtual Clients complete verification routing — source/static checks (2026-10-06)

Baseline: Experimental `f5ed7bd4f1820545709559fe7671094c9f39171a`.

Fixed gap: virtual-clients:verify previously ran only app-local verify:source,
omitting root frontend Vitest and the canonical backend dependency's unit tests.
DEV.cmd verify-virtual-clients now reaches one aggregate that includes those
checks, app build/typecheck/Tauri checks, locked core check/test and core fmt.
App check/test scripts use all-targets and preserve icon/build ordering; app
Cargo remains unlocked because no desktop Cargo.lock is tracked.

Evidence: Node 24.19.0 executed three equivalent structural assertion groups
against the prepared package scripts and PowerShell routing text: all passed.
Static inspection found all 22 public frontend commands declared and registered
in Tauri with their adapter commands present in the core dispatcher. Four
corresponding Vitest regressions were written, not run as a Vitest suite.

NOT RUN: PowerShell route execution, npm dependency installs, full aggregate,
typecheck, Svelte build, Cargo/rustfmt, installer or VM acceptance. No CI or
Codex/Work task was created. npm cache inspection found no cached TypeScript/
Vitest/svelte-check packages. Global tool absence is not itself a requirement
for global installation; normal verification uses package-managed dependencies.
The environment's Node version also differs from toolchain.json's developer pin.
No full source/package readiness claim is supported yet.



## Virtual Clients readiness consistency — source implementation (2026-10-06)

Baseline: Experimental `a107b7d86d1728975c374b6ecc9f4d73e566ad82`.
Context: REMOTE_GITHUB. Source-only, skip-ci.

ClientProfile now owns saved VM fingerprint matching and the stored provenance
milestone. Doctor and runtime use the same predicate. A missing, empty or
current-VM-mismatched proof cannot count as completed identity setup. The SHA-256
fingerprint algorithm and persisted profile schemas remain unchanged.

Staged update reporting now validates the platform manifest and requires an
existing installer whose saved version/platform/hash/signer metadata matches.
Missing or stale metadata no longer reports UPDATE_STAGED. Download signature
verification remains in stage_update; check_update does not rehash/reverify bytes.
Self-update remains disabled.

Four regressions written (two profile, one Doctor routing, one staging matrix).

Focused execution evidence: Node 24.19.0 ran an isolated node:test harness against
the five unchanged TypeScript module sources at baseline a107b7d: view-model.ts,
setupFlow.ts, operationProgress.ts, contracts.ts, and payloadValidation.ts.
Result: 15 checks passed, 0 failed, 0 skipped. Coverage: first-boot action choice,
blocked-setup no-fallback, running Open, legacy response behavior, honest naming,
setup guidance, suspended Stop, progress schema/phase and terminal semantics,
action invariants, optional setup availability, complete client lists, envelope
validation, and numeric policy validation. This was focused module execution,
not the repository Vitest suite, typechecking, Svelte rendering, or Tauri IPC.
No dependencies were installed and no Codex/Work task or CI run was created.
Rust (cargo/rustc) and frontend check tools (tsc/svelte-check/Vitest) were not
available in the checked execution environment.

NOT RUN: Cargo fmt/check/test, frontend typecheck/build/Vitest, VM identity-change
recovery on a target machine, or update download/installer tests. This remains
source implementation, not system-ready evidence.



## Virtual Clients first boot and command activity — source implementation (2026-10-06)

Baseline: Experimental `022c0fa049d07e4b47f7156fdb6ad3f595bea5e6`.
Context: REMOTE_GITHUB, connector source edits, skip-ci.

First wrong owner: daily start's mandatory 90-second guest verification is not
suitable for explicit interactive Windows first boot. A distinct start-setup
operation now has narrow backend admission, reuses the existing startup rollback
executor, opens the selected guest, and returns unknown guest readiness without
persisting identity proof. Daily Start/Resume/Restart/Reset remain fail-closed.
The UI uses optional backend startSetup availability and does not bypass a denied
setup action by selecting daily Start. Three-client verification remains required.

Command activity uses a bounded two-event core observer, optional per-invocation
Tauri Channel, validated frontend events and ephemeral display. Final command
results remain authoritative. No event enables controls, claims VM readiness,
creates percentages, or replaces post-mutation reconciliation.

Fourteen regressions added: six Rust (dispatch success/error, setup admission,
guest-independent setup startup, provider-open rollback, admission rejection);
eight frontend (progress contract/wiring, setup projection/no bypass, setup
instructions, optional availability validation). Existing payload wiring count
updated from 21 to 22 public commands. No test execution is claimed.

NOT RUN: Cargo fmt/check/test, frontend typecheck/build/Vitest, Tauri channel
runtime delivery, repeated-click/navigation UI interaction, VMware OOBE,
three-client gameplay, resource performance and installer acceptance. This pass
does not establish an application-ready or package-ready result. Detailed
per-client internal-stage progress remains beyond the implemented command activity.



## Virtual Clients naming and admission modularity — source review (2026-10-06)

Baseline: Experimental `47b86efc62933c34da56af9d3a428baf634d58cb`.
Execution context: REMOTE_GITHUB. User authorized source edits and commit through
GitHub; no Codex/Work task or CI run is part of this delivery.

Implemented source:
- Existing pure lifecycle policy extracted into private lifecycle_admission.rs.
- Runtime remains observation/provider/operation-lock owner; UI projection and
  mutation enforcement import the same evaluator through the existing crate.
- Eight existing policy tests moved without changing their assertions; sixteen
  provider/orchestration tests remain in runtime.rs. Two policy edge tests added.
- Recreate, recovery point saved and setup-complete terms aligned in presentation.
- Save confirmation describes the signed-in observation before stopping the VM.
- Two setup naming tests added; affected existing label expectations updated.

Static checks performed during preparation: four extracted production function
bodies are unchanged after normalizing renamed identifiers; observation-collector
body is unchanged; admission module has no provider/filesystem/guest dependency;
existing Rust test count is preserved across the split before the two additions.
These are source/text checks, not Rust compilation or test execution.

NOT RUN: Cargo check/test/fmt, frontend typecheck/build/Vitest, interactive dialog
flows, VMware/Minecraft execution and performance measurement. The four new tests
and moved tests are executable specifications, not PASS evidence. Public contract
schema, command names and persisted formats were not changed. Backend-origin
progress events remain unimplemented; source modularity does not close that gap.


Branch: `Experimental`. Parent source:
`df45f6e8aceab41e9b0364a011e0155bcf1bb02d`.

Execution context: **REMOTE_GITHUB / SOURCE REVIEW ONLY**.
No Codex/Work task, terminal, build, typecheck, format command, test suite,
new CI execution, or VMware/Minecraft session was run for this change.

Source implementation:
- `action_admission` is shared by UI action projection and mutation admission.
  `LifecycleFacts` is a transient observation structure, not a state store.
- Every lifecycle operation uses the common admission before provider mutation;
  Start additionally retains preflight plus per-target live rechecks.
- Compatibility does not block Stop/Suspend, while schema/power-state rules
  remain enforced. Reprovision can repair stale client lineage from a healthy
  finalized/stopped Base.
- Missing recovery-point observations remain unavailable rather than silently
  authorizing a new checkpoint.
- Optional `ActionAvailability.reason` preserves the existing schema-1 required
  fields and blocker enum; frontend displays reasons without deriving policy.
- All 21 public command responses and three desktop-native responses have
  required payload validators. Validation covers consumed fields, enum values,
  nullability, finite numeric values, unique/complete client lists, and the
  allowed/blocker invariant.
- STOPPED is labeled Stopped, Native is Managed externally, and completed
  setup is Setup complete. No gameplay-readiness proof is implied.
- Start all consumes backend action eligibility. A denied Start no longer
  silently falls back to offering Open as the primary action.
- Returning to the visible Clients page/focus triggers refresh. Concurrent
  refresh requests are ignored; listeners are removed on unmount. No periodic
  diagnostic polling was added.

Regression specifications added, not executed:
- Six Rust cases for projection/execution agreement across the state/action/
  snapshot matrix, compatibility/identity/resource rejection, stop/suspend
  safety, stale-client recreation, recovery prerequisites, and running-client
  memory handling.
- Fifteen frontend cases: malformed envelope payload, ten payload-shape cases,
  two bridge/refresh source-wiring checks, and two admission/status projections.
- Existing Base preflight parsing now supplies its required payload validator.
  Source-wiring assertions are not browser interaction tests.

Outstanding proof:
- Cargo check/test/fmt and frontend typecheck/build/Vitest on this exact source.
- Live eligibility changes, focus/visibility reconciliation, and recovery UX.
- Read-path performance measurement; per-operation backend progress events are
  not implemented in this pass.
- VMware/Minecraft compatibility, performance, sign-in, and multiplayer
  acceptance remain unproven here.

No ancestor CI result validates these changes.
Continuation: [Next Action](next-action.md).

---

## 2026-10-06 — Virtual Clients Stage 1 source reliability changes

Branch: `Experimental`. Parent source:
`b100769a9091790688bbc8dafd203ca20039c7b6`.

Execution context: **REMOTE_GITHUB / SOURCE REVIEW ONLY**.
Changes were prepared and published through the GitHub connector.
No Codex/Work task, terminal session, build, typecheck, rustfmt, Vitest, Cargo
test, new CI run, or VMware/Minecraft session was performed in this pass.

Implemented source changes:
- Production start orchestration delegates its mutation loop to
  `execute_start_batch`, which is also used by deterministic fake-provider
  regression cases.
- Known target preconditions are checked before mutation; live checks remain
  repeated per target under the existing operation lock.
- Every returned error from the batch loop reaches one rollback path.
  Targets are tracked before provider startup to cover partial-start failures.
- Previously running clients are not added to rollback responsibility.
  Earlier successful resumes restore to SUSPENDED; a newly started/resumed
  client failing verification is stopped.
- VM collision detection compares UUID and MAC independently, while retaining
  the existing provenance serialization/fingerprint format.
- UI mutation coordination refreshes actual backend state after either outcome,
  retains the operation error if refresh also fails, and removes stale controls.
- Restore requires an explicit loss-of-changes confirmation.
- Stop all remains available for suspended clients when backend action
  eligibility permits it.

Regression specifications added (not executed):
- Nine Rust tests: component-wise identity collisions/invalid values, later
  admission failure, result-collection failure, protection of a pre-existing
  running client, provider failure after mutation, incomplete rollback,
  later invalid state, selected-client success, and failed-resume verification.
- Nine frontend tests: five mutation/refresh outcomes, two Stop all cases,
  and two restore disclosure/routing checks.
- Restore routing tests are source assertions, not an interactive Svelte test.

Required next proof when an execution route is authorized:
- Backend Cargo check/test/fmt on the changed source.
- Frontend typecheck, build, and Virtual Clients Vitest suite.
- Interactive restore cancel/confirm and partial-failure UI reconciliation.
- Target-machine startup/recovery, account persistence, and multiplayer
  acceptance remain separate.

Existing successful workflow results on ancestor `6e87cdf` do not validate
this changed head. Do not describe this checkpoint as runtime-ready or fully
tested. Continuation is in [Next Action](next-action.md).

---

## 2026-10-05 — causal crosscheck and knowledge-loop hardening

Source-reviewed on `Local` after Build & Decode runtime feedback exposed false-positive and cross-system blind spots.

Current source contract:

- causal admission now requires trigger → authoritative mechanism → failed/missing protection → wrong reachable state → player-visible consequence;
- counter-proof dimensions include geometry, capability/permission, world-rule authority, guard activation, and client/server representation;
- physical escape claims can invoke LevelDB-backed barrier enclosure proof; loading/gameplay bounds are not treated as collision proof;
- player capability analysis distinguishes Creative/Spectator/mayfly/permission/admin surfaces and tracks inactive protection definitions;
- broad capability mutation footprint compares inventory, equipment, gamemode, temporary abilities, and privileged world-mutation coverage against cleanup/protection;
- world-rule authority distinguishes natural mob spawning from command/script/manual entity creation;
- client-predicted world mutation cancellation routes to a narrow runtime reconciliation question rather than broad manual playthrough;
- pre-report candidate grouping uses structural root-cause identity so one technical cause can consolidate multiple player-visible symptoms;
- new knowledge facts are bound to concrete detector and proof paths through `engine/reliability/catalogs/knowledge-detector-bindings.json`;
- canonical audit role, spatial-bound, proof, and runtime-verification terminology is explicitly documented and machine-checked;
- Capability Truth now registers 55 task capabilities, all 55 proof-bound, with the new player-capability, world-rule-authority, client-reconciliation, and physical-containment owners;
- negative regression coverage records that loading-bound crossing is not physical escape proof, inactive guards are not Blocking Proof, and `doMobSpawning=false` is not proof against manual spawn paths;
- derived publication was regenerated from the approved dataset and current publication validation is PASS for 34 findings / 29 BUG / 5 DESIGN_MISMATCH / 5 Developer Notes.

Proof ceiling: **REMOTE GITHUB SOURCE REVIEW / EXECUTABLE SPECIFICATIONS COMMITTED**. No local `npm run verify:ready`, TypeScript build, Vitest execution, or Minecraft runtime session was executed in this pass. Runtime feedback supplied by the tester is recorded separately from source-only proof.

---

## 2026-10-03 — HTML report zero-waste cleanup

Source-verified on `Local`:

- Approved Bug Report HTML now uses one compact expandable row per bug.
- One bug owns one `Fixed` checkbox; reproduction steps are plain instructional text.
- `issueIndex`, `showIssueIndex`, `compactTables`, the duplicate `bug-report-doc` script, and the stale `document/design.ts` presentation contract were removed.
- Client HTML projection no longer carries unused `foundBy` provenance.
- Explicitly included fixed bugs now render their checkbox as checked from canonical Bug Report V2 status.
- The active report chain remains `Bug Report V2 → client projection → quality review → HTML renderer`; no second report state store was added.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. These latest changes have not yet been typechecked, built, or exercised through the full repository verifier in a local checkout. Do not claim package/runtime validation from this pass.

# Current Validation

## 2026-10-04 — first real-map Drive batch

The current Google Drive map set has completed an individual selected-artifact **source first pass**.

Scope:

- 22 current concrete map artifacts registered in `workspace/project-registry.json`;
- exact Drive file ID + artifact SHA-256 + selected artifact version retained per target;
- selected current artifact used as gameplay authority;
- older Drive documents/versions used only as search pressure where relevant;
- zero-finding results retained instead of manufacturing findings;
- no current findings promoted into `engine/reliability/catalogs/regressions.json` before explicit approval.

Current PROVEN source findings:

1. Defense Challenge v1.1.1 — **Blocker BUG** — asynchronous reset/reuse can let old cleanup release the ticking-area lease of a new run.
2. Attack Challenge v1.1.1 — **Major BUG** — reconnect during pending respawn can bypass death delay because GameManager overwrites CombatTracker recovery.
3. Build & Decode v1.1.0 — **Minor DESIGN_MISMATCH** — production imports a non-admin debug-stick coordinate picker reachable by Creative builders.
4. The Gauntlet v1.0.1 — **Major BUG** — Level 9 all-player finish filters disconnected required members and can complete without them.

The other 18 selected artifacts have **0 source-proven findings in this first pass**. Their evidence files record important false-positive suppression and runtime-only obligations.

Navigation index: `experiments/real-map-audits/README.md`.

Proof ceiling: **SELECTED-ARTIFACT STATIC / SOURCE REVIEW**. No real Minecraft runtime execution is implied by this batch. Runtime-only obligations remain unproven until targeted testing.


## 2026-10-03 — pre-real-test source readiness

Current `Local` head has completed the source-level finalization pass for project/workspace publication flow.

Source-verified:

- lifecycle/readiness/publication completion are derived from canonical proof artifacts rather than persisted duplicate status fields;
- Work Session owns detailed execution state; Project Registry stores only continuity/publication pointers;
- Drive destinations have one owner through `DriveProjectBinding`;
- approval snapshots and Drive receipts reject unsupported/legacy fields;
- snapshot/receipt identity fields are required and validated;
- project approval readiness validates the full Drive binding fail-closed;
- nested Drive folder refs reject unknown fields;
- historical issue ingestion occurs only after explicit approval;
- Project Registry is written last as the durable commit marker;
- material project changes clear approval/publication proof pointers;
- source regression fixtures and canonical docs have been aligned with the proof-derived model.

No further architecture/refactor work is recommended before the first real scenario.

Readiness classification: **SOURCE-READY CANDIDATE / READY FOR FIRST REAL TEST**.

Execution proof remains outstanding: `npm run verify:ready` has not been run on this head because this pass used remote GitHub source review only. Do not interpret this section as a passing local typecheck/test/build/runtime result.


## 2026-10-03 — one-source project state finalization

This section supersedes earlier project-lifecycle implementation notes below.

Current source contract:

- Project Registry persists no lifecycle `status`; lifecycle is derived only from approval/publication proof fingerprints.
- Approval readiness is derived on demand and never persisted.
- Work Session is the sole detailed execution-progress owner; Project Registry stores only its ID/revision pointer.
- Project Registry stores no historical regression/failure-pattern/map-knowledge IDs.
- Historical linkage is owned only by reliability catalog provenance.
- `DriveProjectBinding` is the sole per-project Drive destination owner.
- Deliverables store semantic destination roles; folder IDs are resolved by the planner and are not persisted twice.
- Approval snapshots reject legacy/extra state fields.
- Drive receipts store verified files only; complete/incomplete is derived from snapshot-vs-receipt coverage.
- Historical issue ingestion happens only after explicit approval.
- Registry updates are commit-last for approval/publication workflows.
- Material project changes clear publication proof pointers and therefore derive lifecycle back to `working`.
- The canonical docs, workspace docs, Drive docs, implementation map, and regression fixtures are aligned with this proof-derived model.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full repository verifier and real Drive execution remain pending.


## 2026-10-03 — canonical project lifecycle simplification

This section supersedes earlier project-lifecycle notes below. Older entries are retained only as historical implementation snapshots and are not current authority.

Current source-level contract on `Local`:

- Project Registry no longer persists a lifecycle `status` field.
- Lifecycle is derived only from proof pointers:
  - no approval fingerprint → `working`;
  - approval snapshot fingerprint → `approved`;
  - approval + complete publication receipt fingerprint → `drive-published`.
- `ready-for-approval` is not a persisted state. `assessProjectApprovalReadiness()` derives readiness on demand.
- Audit stage, audit revision, next action, blockers, and findings remain owned by `SelectedMapAuditRun` / Work Session; Project Registry stores only the Work Session ID/revision pointer.
- Project Registry no longer stores historical regression IDs, failure-pattern IDs, or map-knowledge IDs. Historical linkage is owned only by reliability catalog provenance.
- Project Drive destinations have one owner: `ProjectRecord.publication.drive` using `DriveProjectBinding`. No separate `driveFolderId` state remains.
- Deliverables use semantic destination roles; the publish planner resolves folder IDs from the single Drive binding.
- ProjectApprovalSnapshot contains only the frozen project/artifact/audit/report/deliverable facts required for approval. Legacy historical/status fields are rejected.
- ProjectDrivePublishReceipt contains verified uploaded files only. Completion is derived from snapshot deliverables versus receipt files; no PARTIAL/COMPLETE field is stored.
- Historical regression ingestion occurs only after explicit project approval.
- Multi-owner approval/publication operations use commit-last semantics: detail/immutable proof first, Project Registry pointer commit last.
- Material project changes clear approval/publication proof pointers and therefore automatically derive the project back to `working`.
- Regression guards reject legacy persisted status fields, malformed/forged approval proofs, invalid Drive bindings, incomplete publication, and stale registry revisions.

Canonical documentation: `docs/06-system/project-lifecycle.md`.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full repository verification and real Drive execution have not been run for this head.


## 2026-10-03 — project state de-duplication final pass

Source-verified on `Local`:

- Project Registry no longer persists lifecycle status. `working / approved / drive-published` are derived exclusively from active approval/publication proof fingerprints.
- `ready-for-approval` is removed as persisted state; readiness is computed on demand from project + deliverables + blockers.
- Drive publication receipts no longer persist `PARTIAL/COMPLETE`; completion is derived from approved snapshot deliverables versus verified receipt files.
- Project Registry no longer copies audit stage, audit revision, next action, historical regression IDs, failure-pattern IDs, or map-knowledge IDs.
- Work Session / SelectedMapAuditRun remain the sole owners of detailed execution/audit progress.
- `regressions.json` is the sole owner of historical incident linkage through provenance; Project Registry does not duplicate regression IDs.
- `DriveProjectBinding` is the sole per-project Drive destination owner. `driveFolderId` is removed from project lifecycle/continuity state.
- Approved deliverables use semantic destination roles; actual Drive folder IDs are resolved from `DriveProjectBinding` only at publish-plan time.
- Audit historical issue ingestion now occurs only after the explicit approval decision.
- Project Registry is written last as the durable commit marker for approval/publication workflows.
- Persisted project JSON rejects unsupported/legacy fields so removed duplicate state cannot silently re-enter through manual edits.

This section supersedes earlier same-day project-lifecycle notes that mentioned persisted `ready-for-approval`, lifecycle status fields, copied historical IDs, or receipt PARTIAL/COMPLETE state.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real Drive publication execution remain outstanding.

## 2026-10-03 — project lifecycle implementation final hardening

Source-verified on `Local`:

- Project registry/work-session updates are no-op stable and monotonic; unchanged audit state does not create revision churn.
- Persisted project records, approval snapshots, and Drive receipts fail closed on malformed or forged state.
- Approval snapshots are immutable per fingerprint and retained under `state/approvals/`.
- Drive publication receipts are retained per approved snapshot under `state/publications/` and may advance only monotonically from PARTIAL to COMPLETE.
- Generic approval cannot bypass historical issue sync for diagnosis/audit projects with canonical Bug Report state.
- Historical regression projection is owned by orchestrator; reliability-search remains independent of Bug Report and repair packages.
- Added integration-neutral `ProjectDriveUploadAdapter` and executor. Core verifies returned Drive file identity/fingerprint before receipt creation.
- Canonical execute-and-persist publication flow can now run end-to-end once a concrete Google Drive adapter/provider is supplied.
- Added regression tests for project lifecycle, historical issue projection/catalog merge, registry validation, and Drive executor verification.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. No local typecheck/full verifier or real Google Drive upload was executed in this pass.


## 2026-10-03 — project registry, approval, issue history, and Drive publication

Source-verified on `Local`:

- Workspace now uses one canonical project path: `workspace/projects/<project-id>/`; status is metadata rather than folder movement.
- Added tracked `workspace/project-registry.json` as the compact answer to what projects exist, what artifact/version they use, current lifecycle status, Work Session/audit references, issue-knowledge refs, Drive binding, and approval/publication fingerprints.
- Detailed execution remains in Work Session; the registry is a compact coordination projection and not a second audit state machine.
- Project lifecycle has exactly four publication states: `working → ready-for-approval → approved → drive-published`.
- Material work after approval invalidates approval and returns the project to `working`.
- Approval readiness is deterministic and checks session/revision, optional audit completion, canonical Bug Report reference when required, Drive binding, deliverable fingerprints, and blockers.
- Project approval snapshots are SHA-256 bound to project revision, artifact/audit identity, canonical Bug Report ref, historical regression refs, and approved deliverables.
- Approval snapshots are immutable and persisted per fingerprint under project state.
- Drive publication can only be planned from the currently approved snapshot. Extra/unapproved files are rejected by the canonical receipt path.
- PARTIAL Drive receipts are persisted but cannot mark a project published; receipt state may advance monotonically to COMPLETE.
- COMPLETE receipt is required for `drive-published`.
- Selected-map audit continuity now saves both detailed Work Session state and compact tracked project registry state, and resumes from persisted session/registry data.
- Work Session and Project Registry revisions are monotonic; unchanged audit state does not create revision noise.
- Canonical Bug Report V2 remains current-version bug authority.
- Approved current Bug Report issues are projected by orchestrator into the existing reliability regression catalog for durable searchable history.
- Reliability historical storage remains dependency-neutral and preserves legacy records rather than forcing speculative migration/backfill.
- Stable historical ID semantic conflicts fail closed.
- Project records retain only historical regression/failure-pattern/map-knowledge references; they do not copy issue narratives.
- Reusable failure patterns are not auto-created from every issue; repeated/evidence-backed abstraction remains a separate reliability decision.
- Drive stays human-facing approved storage and does not receive project registry, Work Session, Audit Obligations, semantic graphs, caches, or other control-plane state.
- Added regression tests for lifecycle readiness, approval invalidation, forged snapshots, partial/complete Drive publication, historical projection/merge conflicts, and project registry validation.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real Drive publication execution have not been run.


## 2026-10-03 — canonical Pre-Audit Plan workflow

Source-verified on `Local`:

- The official workflow now starts with communication preflight: raw user request → normalized intent → Pre-Audit Plan → explicit confirmation → confirmation receipt → production audit.
- The Pre-Audit Plan is plan-first and designed for pre-testing; the user is not expected to know existing bugs or symptoms.
- The plan confirms what will be checked, proof/testing strategy, user focus/constraints, and expected output.
- Symptoms/suspected causes appear only when supplied by the user.
- `AuditUserIntentConfirmationReceipt` is fingerprint-bound; material plan/intent changes invalidate the previous receipt.
- The confirmation preflight is explicitly outside the `TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT` state machine, so there is still one production audit flow.
- `runSelectedMapAudit()` remains the only production audit entry and rejects missing/stale prompt confirmation when user prompt context is supplied.
- The canonical master workflow, mandatory procedure, README, AGENTS, skill routing, and implementation map now agree on this boundary.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and conversational benchmark execution remain outstanding.


## 2026-10-03 — pre-audit confirmation workflow integration

Source-verified on `Local`:

- Pre-Audit confirmation is now part of the canonical operator workflow before `TARGET`.
- It is explicitly a communication prerequisite, not a new audit stage, state machine, report status, or second authority.
- The confirmation is plan-first for pre-testing: audit objective, planned checks, proof strategy, user focus/constraints, and expected output are shown before work starts.
- Known symptoms/suspected causes are optional and are shown only when the user supplied them.
- The executable confirmation request is owned by `map-audit-user-intent.ts`; production execution still begins only through `runSelectedMapAudit()`.
- Confirmation is fingerprint-bound to the normalized user intent and becomes stale after any material interpretation/plan change.
- Master workflow, mandatory procedure, README, AGENTS, map-audit skill, implementation map, and Next Action now describe the same boundary.
- The canonical audit stage order remains unchanged: `TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT`.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full repository verification and real conversational pre-audit benchmark execution remain outstanding.


## 2026-10-03 — pre-testing confirmation semantics

Source-verified on `Local`:

- The chat confirmation checkpoint is now plan-first rather than symptom-first.
- The default workflow assumes the user may know no bug symptoms yet because the audit runs before manual testing.
- `createAuditUserIntentConfirmationRequest()` now produces a Pre-Audit Plan with audit objective, planned checks, proof strategy, expected output, target hints, user focus, optional symptoms/suspicions, ambiguities, and unmapped input.
- Default planned checks cover the full player journey, gameplay-surface discovery, progression/terminal state, state ownership/reset/cleanup/recovery, applicable multiplayer/multi-arena, inventory/economy, entity/combat/navigation, chunk simulation, persistence/reconnect, world/spatial mutation, boundaries/capacity, UI/capability mismatch, and counter-proof.
- User symptoms and suspected causes are optional context only and are not required for confirmation.
- Regression coverage verifies that a generic `cek map ini sebelum testing` request produces a complete pre-test audit plan with no fabricated symptoms.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and conversational prompt benchmark execution remain outstanding.


## 2026-10-03 — user prompt confirmation checkpoint

Source-verified on `Local`:

- Production selected-map audit initiated from user wording now requires one explicit chat confirmation after prompt interpretation and before `runSelectedMapAudit()`.
- `createAuditUserIntentConfirmationRequest()` produces the compact human-facing Pre-Audit Plan used for chat confirmation.
- `AuditUserIntentConfirmationReceipt` is bound to a deterministic fingerprint of the normalized intent.
- Missing confirmation blocks production audit.
- Any material change to normalized intent makes the old confirmation stale and blocks audit until the revised interpretation is confirmed again.
- Confirmation validates communication accuracy only; it does not establish gameplay truth or proof.
- Raw imperfect prompts may still proceed through fallback/unmapped obligations once the user confirms the interpretation/fallback summary.
- The skill and AGENTS contract require one compact confirmation round, not repetitive approvals.
- Regression coverage verifies missing-confirmation rejection, valid confirmation, and stale-confirmation rejection after intent changes.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and live conversational prompt benchmarks remain outstanding.


## 2026-10-03 — complete prompt-fragment accounting

Source-verified on `Local`:

- User prompt intake now preserves explicit `fragments[]`, per-item `sourceFragmentIds[]`, and `unmappedFragmentIds[]`.
- Validation fails if any material fragment is neither mapped nor explicitly unmapped.
- One fragment may support multiple intent classes; normalized semantic duplicates do not multiply search pressure.
- Unmapped fragments remain visible as `user-input-unmapped` Audit Obligations and are never silently dropped or converted directly into issues.
- `SelectedMapAuditInput.rawUserPrompt` provides a fallback when structured translation is unavailable. `createFallbackAuditUserIntent()` preserves the complete raw prompt as an unmapped fragment so processing can continue.
- Raw fallback does not block audit unless the interpretation later exposes a genuine blocking target/product ambiguity.
- Map Audit HTML explicitly displays unmapped input and states that it is preserved as an Audit Obligation, not ignored and not treated as a bug.
- Regression coverage verifies raw fallback, fragment mapping, explicit unmapped retention, semantic dedupe, and obligation preservation.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and live model prompt benchmarks remain outstanding.


## 2026-10-03 — prompt intake finalization

Source-verified on `Local`:

- `AuditUserIntentEnvelope` is the single executable owner for translated user prompt context.
- User prompt interpretation is explicitly non-authoritative and does not enter gameplay `auditRevision`.
- Priority domains seed only additive first-pass analysis demand through existing analysis-planner knowledge domains; artifact/RIG demand remains authoritative and may only grow the union.
- Symptoms, suspicions, expectation/design claims, historical hints, scope/exclusion hints, and test constraints remain separately preserved in bounded model-task context.
- Semantically equivalent wording is deduplicated by normalized meaning, so repeated phrasing does not inflate search pressure.
- Material user symptoms that cannot be reconciled with discovered gameplay remain visible as non-bug Audit Obligations.
- Normal ambiguities are retained for bounded multi-hypothesis search; target/outcome ambiguities that block correctness use `blockingAmbiguities[]` and fail closed before production audit.
- Loose/malformed envelope JSON is validated defensively before normalization; the exported normalizer is also defensive against malformed arrays/items.
- Target hints cannot relabel the exact selected artifact. Material target conflicts must be resolved before audit.
- Map Audit Output V2 and HTML preserve the normalized interpretation transparently as guidance only.
- Regression tests cover semantic dedupe, additive knowledge demand, malformed input, unsupported enums, ambiguity separation, dropped symptom interpretation, unexplained symptom obligations, and output preservation.
- Rough-language benchmark cases cover progression stalls, guessed ticking-area causes, inventory loss/duplication, multi-arena crossing, broad completion failure, design claims, ambiguous reset behavior, multiple-writer false positives, and target-version conflicts.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. This prompt-intake stage is architecture-complete enough to freeze, but local typecheck/full repository verification and model-based prompt benchmark execution have not yet been run.


## 2026-10-03 — user prompt intake hardening

Source-verified on `Local`:

- Added canonical `user-input-translation-contract.md`.
- Added typed `AuditUserIntentEnvelope` with runtime validation and normalization.
- User prompt classes now separate symptoms, suspicions, expectation/design claims, scope priorities, constraints, historical references, and ambiguities.
- `SelectedMapAuditInput.userIntent` is hint-only and is preserved in the audit snapshot/output without entering gameplay authority or `auditRevision`.
- Model task packets receive normalized user search context with an explicit authority note forbidding prompt text from establishing Expected/Actual behavior, issue type, severity, proof status, safety, or absence.
- User-reported symptoms that are not explained by discovered selected-artifact surfaces/scenarios remain visible as `Audit Obligation` rather than disappearing or being promoted to a bug.
- Map Audit HTML shows the interpreted user input in a collapsed guidance-only section.
- Map Audit Output V2 schema was synchronized with the live control, honesty, audit-obligation, user-intent, grounding, coverage, arena-capacity, proof-ceiling, and bounded-replica contracts.
- Regression coverage guards prompt normalization, deduplication, runtime enum validation, symptom/suspicion separation, and non-authoritative semantics.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real-map prompt benchmark remain required.


## 2026-10-03 — causal issue admission hardening

Source-verified on `Local`:

- A canonical `map-audit-obligations.ts` owner now collects unresolved audit/model/proof work separately from gameplay findings.
- Pure `RUNTIME_BLOCKED`, `DETECTION_GAP`, gameplay-translation-required, counter-proof-search-required, knowledge-gap, structural/closure gap, blindspot, temporal-risk, shared-resource, compound-boundary, accumulation-growth, and unclassified replica-divergence states no longer inflate `BUG | DESIGN_MISMATCH`.
- `NEED_VALIDATION` issue projection now starts only from `CONFIRMED_DEFECT_READY` resolutions that already have a concrete gameplay trigger, player-visible consequence, Expected/Actual outcomes, affected scope, and cleared blocking counter-proof, but still miss minimum proof saturation.
- Audit honesty now checks the union of causal findings and Audit Obligations, so unresolved material work cannot disappear merely because it is no longer mislabeled as a bug.
- Audit Obligations are preserved through Map Audit Output V2 and downstream report handoff, displayed separately in HTML, and excluded from finding counts.
- Internal model task packets now include bounded `AUDIT_OBLIGATION` tasks. These tasks are explicitly forbidden from promoting a gap/risk directly to BUG/DESIGN_MISMATCH without a fresh causal audit result.
- The obsolete `map-audit-validation-signals.ts` and `map-audit-validation-blindspots.ts` gap-to-issue projectors were removed.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real-map benchmark remain required before executable readiness or measured detection accuracy can be claimed.


## 2026-10-03 — false-positive issue suppression

Source-verified on `Local`:

- Audit/model/proof gaps no longer enter `BUG | DESIGN_MISMATCH` merely to remain visible.
- `auditObligations[]` is the canonical non-finding lane for knowledge gaps, shallow/unbound scenarios, closure gaps, discovery challenges, shared-resource risks, compound boundaries, accumulation risks, unclassified replica divergence, runtime-proof residue, detection gaps, gameplay-translation work, and incomplete counter-proof search.
- `NEED_VALIDATION` findings are now restricted to `CONFIRMED_DEFECT_READY` resolutions whose gameplay translation and blocking counter-proof are already established but minimum proof saturation is still incomplete.
- `PROVEN` remains reserved for saturation-complete confirmation-ready defects.
- The honesty/visibility gate accepts tracked residue only when it is visible as either a causal finding or an Audit Obligation; it no longer forces gaps to masquerade as bugs.
- Map Audit HTML displays Audit Obligations in a separate section explicitly marked as non-bug work and excludes them from finding counts.
- Legacy signal/blindspot issue projectors are compatibility shims that emit no issues; production ownership is `deriveAuditObligations()`.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real-map benchmark are still required.


## 2026-10-03 — honesty / false-claim hardening

Source-verified on `Local`:

- Map Audit coverage no longer reports `accounted` unless gameplay closure, state model, boundaries, and unaccounted-surface checks are actually complete.
- Coverage records use `understood`, not `checked`, when semantic understanding exists without test proof.
- Multi-arena output separates detected arenas, declared concurrency, and proven-safe concurrency.
- Game-design headline fields expose authored / inferred / unresolved grounding.
- The finding visibility gate no longer implies overall audit infallibility.
- Unsubstantiated `testerTriggerReady` was removed.
- Generic arena detection no longer automatically closes arena topology understanding when arena count/topology is unresolved.
- Partial chunk/entity residency observability remains unresolved instead of being treated as understood.
- Broad state writes prevent the generic state-model surface from claiming full understanding.
- Compatibility absence-of-rule now yields `unknown`, not unsupported.
- Bounded replica proof is `BOUNDED_EQUIVALENCE`, not full `EQUIVALENT`, and cannot authorize global baseline reuse.
- Verified validation proof levels require evidence; local/live game verification also requires target runtime profile binding.
- Runtime profile captures require provenance evidence.
- Capability Truth now says `owner-has-tests` rather than `owner-tested`; proof bindings do not imply current-session execution.
- Generated known limits explicitly defer current execution truth to this file.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. These changes reduce overclaim in source semantics but have not yet been validated by local typecheck, full verifier, or real-map execution.


## 2026-10-03 — single production audit output

Source-verified on `Local`:

- `audit <selected.mcworld>` remains the only production selected-map audit entry.
- `SelectedMapAuditRun` remains internal authority and is no longer emitted by the production CLI.
- The production CLI emits exactly one operator-facing `Map Audit Output V2`.
- The HTML renderer accepts canonical `Map Audit Output V2` directly and no longer accepts a raw `SelectedMapAuditRun` wrapper as a parallel input path.
- Approved Bug Report V2 remains a downstream approved-PROVEN-BUG ledger, not a competing audit output.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck, repository verification, and tests are still required.


## 2026-10-03 — report timing integration

Source-verified on `Local`:

- Map Audit Output V2 now carries canonical control state: audit status, current stage, next action, continuation owner, rerun requirement, blockers, and reasons.
- Map Audit HTML surfaces that control state before findings so operators do not need to inspect the raw audit object to know what to do next.
- NEED_VALIDATION findings now expose collapsible Proof Guidance with proof goal, missing claims, ordered proof route, family criteria, historical search hints, evidence substitution, and runtime-last-resort guidance.
- Existing Game Design, Multi-Arena, Gameplay Closure, Honesty, and Full-Map Replica information now surfaces in one collapsed Audit Context block before findings.
- `modelTaskPackets`, raw `executionTrace`, and Work Session bindings remain intentionally internal and are not duplicated into human-facing HTML.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verification is still required before package-level readiness can be claimed.


## 2026-10-03 — workflow efficiency cleanup

Source-verified on `Local`:

- Removed the trivial `document/layout.ts` layer; the HTML renderer now owns its single live presentation decision directly.
- Removed unused client-projection metadata and stale report vocabulary.
- Fixed a malformed literal-escape import in `bug-report/src/preview.ts`.
- Removed dead preview helper functions that had no rendering consumer.
- Unified retest wording on `How to Reproduce`.
- `runSelectedMapAudit()` and `resolveSelectedMapAudit()` now share one internal `assembleSelectedMapAuditRun()` path for identity, admission, revision, control, model packets, and Map Audit Output projection.
- This reduces duplicated audit-finalization logic without adding a new public owner, manager, route, or state machine.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. The current `Local` head still requires local `typecheck`, repository verification, source-hygiene audit, and tests before package-level readiness can be claimed.


Snapshot date: 2026-10-03  
Branch: `Local`

## Historical integrated proof

The last retained integrated verification remains historical and does **not** verify the current head.

## Current source-level architecture

Selected-map production audit now has one operator door and one ordered authority chain:

```text
audit <selected.mcworld>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
→ issueLanes.BUG
   issueLanes.DESIGN_MISMATCH
```

### Output contract regression guard

A dedicated schema-contract regression test now verifies that Map Audit Output V2 retains:

- the two public statuses only;
- NEED_VALIDATION fields `validationReason`, `missingProof`, `validationTest`, `validationGroupKey`, and `proofNavigation`;
- map-level `honesty` and `validationTests`;
- canonical full-map replica status names.

`BuildSelectedMapAuditReportResult` also preserves `fullMapReplica`, so baseline/delta evidence cannot disappear between the canonical audit run and final report handoff.

### Replica divergence classification boundary

Replica comparison intentionally separates raw world/topology difference from gameplay significance.

Current flow:

```text
world/topology proof
→ EQUIVALENT
  or DIVERGENCE_REQUIRES_CLASSIFICATION
  or INCOMPLETE_PROOF
→ semantic/causal classification
→ only grounded gameplay consequence continues as an issue
```

Region-role proof already excludes authored mutable/ignored areas from normal voxel proof where those roles are grounded. Mixed/unknown differences are not automatically called material; they remain classification residue.

### Replica proof ownership cleanup

The unused `arena-semantic-voxel-divergence` layer was removed. It had no production consumer and duplicated semantic masking already owned by arena region classification / proof-eligible volume selection.

Canonical ownership is now:

```text
region classification
→ proof-eligible volumes
→ voxel/block-entity/native proof
→ replica proof quality
→ FullMapReplicaReceipt
→ semantic/causal classification for unresolved divergence
```

Do not reintroduce a parallel semantic voxel classifier unless real-map evidence proves the existing owner cannot express the required distinction.

### Full-map receipt integration

`SelectedMapAuditRun` now exposes `fullMapReplica` when per-replica world/topology proof exists.

The receipt is built only from retained replica proof details already produced by the existing world/topology pipeline. It does not recompute world comparison.

Current canonical replica status names are:

```text
EQUIVALENT
BOUNDED_EQUIVALENCE
DIVERGENCE_REQUIRES_CLASSIFICATION
INCOMPLETE_PROOF
```

BOUNDED_EQUIVALENCE means no divergence was found within the bounded proof scope, but it does not authorize full baseline inheritance. DIVERGENCE_REQUIRES_CLASSIFICATION produces `replicaDivergenceIds[]` for continued causal analysis. INCOMPLETE_PROOF prevents baseline safety from being inherited.

### Naming and output contract alignment

Public naming is now governed by `docs/03-analysis/map-audit-naming-contract.md`.

Map Audit Output V2 now includes the current unresolved-proof and honesty contracts instead of lagging behind source semantics:

- `validationGroupKey`;
- `proofNavigation`;
- `validationTests`;
- `honesty`;
- `historyPressure`;
- `familyProofCriteria`.

Full-map replica comparison also has one consolidation projection, `FullMapReplicaReceipt`, using:

- `replicaBaseline`;
- `replicaResults[]`;
- `replicaStatus`;
- `replicaDivergenceIds[]`.

The receipt reuses existing topology/world-DB/voxel/block-entity proof and does not perform a second comparison or create a second audit flow.

### Master workflow navigation

Operator/AI navigation now starts from `docs/03-analysis/master-selected-map-audit-workflow.md`.

It orders the complete work as:

```text
TARGET
→ DISCOVERY
→ Discovery Challenger
→ UNDERSTAND
   → Player Journey
   → State Registry
   → Shared-Resource Ownership
   → Ownership Registry
   → Progression Contract
→ MODEL
   → Full-map / world-DB replica normalization
   → Actor / Entity
   → Spatial / Simulation
   → Multiplayer / Multi-Arena
   → Boundary / Capability Delivery
→ STRESS
   → lifecycle / negative-space / higher-order / growth
→ PROVE
   → proof navigation
   → historical hints
   → evidence substitution
   → exact counter-proof
   → proof saturation
→ runtime only if irreducible
→ honesty gate
→ REPORT
```

This is a navigation/ordering layer only. Executable closure remains owned by `mandatory-audit-procedure.ts` and `map-audit-admission.ts`; specialist documents cannot become alternate workflows.

### Gate consolidation

Closure decisions now have one executable owner:

```text
discovery / gameplay model / scenario / defect-resolution evidence
→ Mandatory Audit Procedure checkpoints
→ map-audit-admission orders checkpoints and selects first blocker
```

`map-audit-admission.ts` no longer re-evaluates Discovery Closure, Gameplay Model Closure, Scenario Closure, or Defect Resolution in parallel. Gameplay Model Closure is represented explicitly by checkpoint `A7`.

This removes duplicate gate logic while preserving fail-closed behavior.
### Evidence-route naming

Static, runtime, and tester inputs are evidence provenance only. The canonical term is `evidenceRoute`; the legacy field `route` remains only as a compatibility alias inside report-candidate plumbing. These values must never be interpreted as alternate audit workflows.

### CLI lane cleanup

Production selected-map audit still has exactly one command: `audit`.

Arena baseline/corpus/adapter, corpus calibration, script-usage, and all `dev-*` diagnostic commands are now consistently gated by `MBEDROCK_ENGINEERING_TOOLS=1`. They remain bounded engineering/reliability tools and cannot be mistaken for alternate production audit entrypoints.

Distinct non-audit product operations such as compare, package roundtrip, repository task planning, and repair verification remain separate workflows by design.

### Single-flow ownership

- `map-audit-pipeline.ts` owns production entry and continuation.
- `mandatory-audit-procedure.ts` owns executable checkpoints.
- `map-audit-admission.ts` owns first blocking stage and continuation authorization.
- Scenario/RIG/analyzers provide evidence only.
- Specialist docs are supporting contracts, not alternate workflows.
- Work Session/UI/HTML/JSON are projections only.

### Two-status finding model

The operator-facing finding surface now uses exactly two statuses:

- `PROVEN` — sufficiently proven finding with cleared blocking counter-proof;
- `NEED_VALIDATION` — materially plausible finding with one explicit missing-proof obligation and one narrow validation test.

Source-proven contradictions still run automatic bounded counter-proof search first so the engine maximizes PROVEN findings. Runtime proof, Detection Gap, insufficient evidence, and ambiguous intent remain internal reasons behind NEED_VALIDATION rather than separate public categories.

Disproved and proven-normal candidates remain in audit trace only. This keeps uncertainty visible without mixing many status vocabularies.

### Resolution-maximization hardening

The current source also pushes more material signals toward resolution before they can disappear:

- unresolved Required Inspection Graph knowledge receipts surface as Audit Obligations instead of being mislabeled as gameplay issues;
- leaf scenarios with components but no causal proof edge surface as Audit Obligations until causal gameplay proof exists;
- negative-space lifecycle signals and high temporal interaction risks surface as Audit Obligations rather than being promoted to BUG findings without causal proof;
- partially grounded candidate patterns are retained for targeted proof; only all-unknown low-signal patterns stay as raw evidence work;
- unknown counter-proof never suppresses a material candidate; only concrete blocking counter-proof may do so;
- confirmation-ready NEED_VALIDATION findings carry stable validation grouping keys; unresolved non-finding residue carries its own obligation resolution action.

The intended optimization target is therefore: maximize real PROVEN findings, keep every material unresolved signal visible, and never inflate issue counts by converting audit gaps into BUG/DESIGN_MISMATCH.

### False-negative control hardening

The current source now also enforces:

- gameplay criticality is separate from technical complexity, so simple but progression/terminal-critical surfaces cannot be downgraded to shallow proof solely because they have few risk factors;
- multi-arena stress uses selected-map concurrency boundaries instead of assuming that a two-arena pass generalizes to the maximum;
- every `RUNTIME_BLOCKED` causal link emits one narrow runtime Audit Obligation;
- every `DETECTION_GAP` causal link emits one semantic/detection Audit Obligation and is not treated as a gameplay issue by default;
- coverage presence is explicitly distinct from coverage adequacy;
- publication may fail closed while investigation continues collecting unrelated high-confidence findings; an early blocker must not silently erase later required tests;
- inverse/negative-space lifecycle pairs are mandatory challenge targets (acquire/release, spawn/account, grant/reset, schedule/cancel-or-revalidate, and equivalent pairs).

These controls reduce silent false negatives but do not constitute a measured false-negative guarantee until the real-map benchmark target below is executed.

### Fail-closed hardening now present

- one production CLI command: `audit`;
- engineering audit commands remain `dev-*` and gated;
- relevant-source accounting distinguishes:
  - indexed,
  - parse failure,
  - unsupported,
  - **indexed but semantically not understood**;
- structurally indexed gameplay JSON without domain semantics now remains a Detection Gap;
- Gameplay Model Closure blocks on unsupported high-risk surfaces;
- explicit unsupported high-risk surfaces currently include:
  - teleport lifecycle,
  - UI/form reachability,
  - environment/gamerule contract,
  - gameplay-significant async command transactions;
  - dynamically constructed `runCommand/runCommandAsync` effects that literal command analysis cannot exhaustively resolve;
- player-flow reasoning remains:
  `ENTRY/JOIN → READY/START → SETUP → ACTIVE → PROGRESSION → TERMINAL → CLEANUP/REPLAY → RECOVERY`;
- cross-system checkpoint requires all materially demanded scenario families, not merely one arbitrary cross-system scenario;
- counter-proof search is context-aware across guard/scope/exclusion and, when applicable, owner/generation/cleanup;
- capability delivery compares presented/design capability against actual playable capability;
- report type is explicit:
  - `BUG`
  - `DESIGN_MISMATCH`;
- canonical issue taxonomy is now explicit for every confirmed issue:
  - `issueType`;
  - `gameplayFlow`;
  - primary `failureDomain`;
  - cross-system `contributingDomains[]`;
  - `informationMismatch` when grounded player-facing information contradicts actual gameplay;
- issue ordering follows player-flow order instead of technical causal-link order;
- `FULL_JOURNEY` composition cannot own a report finding; issues attach to a concrete gameplay stage;

- every reportable issue now carries canonical taxonomy:
  - `issueType`;
  - `gameplayFlow`;
  - primary `failureDomain`;
  - cross-system `contributingDomains[]`;
  - severity only at confirmed report classification, derived from impact;
- issue projection is ordered by player flow first, then failure domain;
- canonical confirmed-issue taxonomy is now explicit:
  - `failureDomain` = one primary gameplay failure family;
  - `contributingDomains[]` = materially involved cross-system domains without duplicating the root cause;
  - `gameplayFlow` = player-flow location;
  - `informationMismatch` = player-facing information/feedback disagrees with actual capability/state;
  - severity remains downstream review state and requires grounded player impact;
- design mismatch causal links are prevented from entering Bug Report V2 promotion;
- final selected-map report continuation carries the Design Mismatch lane from the same audit revision;
- legacy Map Audit Output V1 schema is explicitly deprecated/non-production;
- repository verifier checks single entry, issue lanes, semantic-gap fail-closed behavior, report lanes, and legacy deprecation.

### Blind-spot hardening ownership

The highest-risk remaining false-negative classes now have explicit canonical owners:

- raw Semantic IR evidence without semantic/scenario ownership → `gameplay-discovery-challenger.ts`;
- multiple/deferred writers and higher-order shared-resource convergence → `shared-resource-ownership.ts`;
- compound multi-dimensional limits and repeated-run growth/producer-cleanup imbalance → `gameplay-compound-growth-analysis.ts`;
- those signals are consolidated by `map-audit-obligations.ts` as non-finding obligations and are independently required by the visibility/honesty gate;
- blocking counter-proof now requires exact contradicted commit target/dependency relevance, not loose same-scenario/component overlap.

These controls reduce the chance that an issue never enters the finding set at all. They remain proof-pressure signals, not automatic bug confirmation.

Still irreducible or only partially statically solvable:
- native Bedrock/Education runtime semantics;
- actual geometry/collision/pathfinding behavior;
- multi-client presentation/order divergence;
- load/performance-only failures;
- completely absent intended features with no selected-artifact evidence of the expectation.

Those cases must remain explicit runtime/design-contract residue rather than being guessed.

### Counter-proof dimension hardening

Automatic graph search now closes only the locally decidable counter-proof dimensions:

```text
guard
scope
exclusion
```

Ownership-sensitive dimensions such as `owner`, `generation`, and `cleanup` require explicit dimension-scoped receipts with scope and evidence. If those remain unresolved, the finding enters `COUNTERPROOF_SEARCH_REQUIRED` and receives a bounded PROVE continuation instead of being auto-confirmed.

This intentionally trades a small amount of extra source-side reasoning for lower false-PROVEN risk; it does not broaden into generic runtime testing.

### Family proof provenance

`FamilyProofReceipt` evidence is now accepted only when each satisfied criterion cites evidence already grounded in the causal link/resolution/counter-proof evidence set. Arbitrary non-empty evidence IDs no longer satisfy family proof saturation.

### Proof saturation / sufficient-proof stop rule

PROVEN projection now requires a minimum-sufficient-proof saturation assessment. Universal saturation checks:

- one concrete grounded gameplay scenario;
- grounded contradiction;
- explicit gameplay trigger and player-visible consequence;
- bound Expected and Actual outcomes;
- explicit affected scope;
- evidence bound to the finding;
- exhaustive bounded counter-proof search with `NO_BLOCKING_PROOF`.

Each failure family also carries `familyProofCriteria[]` as domain-specific proof guidance. Examples include completion accounting for progression, ownership/isolation for multi-arena, identity/scope/idempotency for inventory, generation validation for deferred work, and residency/platform ownership for chunk simulation.

The deterministic PROVEN projection gate now enforces both universal saturation and an explicit `FamilyProofReceipt`. Each required family criterion must be satisfied and bound to concrete evidence before the finding may project as PROVEN.

If universal or family saturation is incomplete, a `CONFIRMED_DEFECT_READY` resolution is not projected as PROVEN. It remains visible as NEED_VALIDATION. Review readiness is allowed only when the unresolved proof is explicitly preserved and the honesty gate passes; per-finding proof completeness remains expressed by PROVEN versus NEED_VALIDATION.

Proof navigation should stop only when universal and family-specific proof are both saturated. Unsaturated confirmation-ready findings remain visible as NEED_VALIDATION and are tracked by the honesty gate.

### Historical failure search pressure

Generic lessons from prior detection failures are now promoted as search-priority hints, not correctness rules.

Current reusable families include:

- simulation resource declared/required but not realized through acquire/readiness/release;
- arena-local lifecycle using global/unleased selectors or mutations;
- deferred work committing after ownership/session generation changes;
- multiple recovery owners restoring the same player/session state;
- incomplete recovery snapshots for transient state;
- progression accounting holes where required work escapes completion tracking;
- cleanup/reuse baseline leakage into the next run.

Hints activate only when current selected-artifact facts match the family. They can:

- increase early surface search priority through `historyPressure`;
- move relevant non-runtime knowledge domains earlier in proof navigation;
- add targeted historical search questions to model task packets.

They cannot create a defect, lower proof requirements, override counter-proof, or use old map behavior as current gameplay authority. Runtime remains last in the route.

### Conditional knowledge and evidence substitution

Knowledge demand is now conditional on coexisting selected-artifact systems rather than only a static domain prerequisite table. Examples:

- inventory + persistence expands into persistence/recovery proof;
- inventory + economy expands into reward/economy proof;
- arena ownership + simulation surfaces expands into multiplayer/chunk proof;
- chunk simulation + actors expands into entity behavior plus platform constraints;
- persistence/recovery expands into temporal ownership and, when present, arena/inventory proof;
- combat and world-structure lifecycles expand into temporal ownership where stale ordering can matter.

Proof navigation also exposes evidence-substitution candidates. These never auto-confirm a finding; they tell the resolver when a combination of selected-artifact, quantitative, platform, or cross-domain evidence can replace a broad runtime trial. Current substitution families include arena capacity arithmetic, simulation ownership, inventory competing restore writers, persistent append-without-clear, structure transition residue, and boundary arithmetic.

Runtime remains last resort after applicable static/cross-domain/formal substitution routes are exhausted.

### Proof navigation / resolution knowledge

Every NEED_VALIDATION finding now receives a bounded proof-navigation contract:

- `recipeId` — generic failure-family proof recipe, never map-name specific;
- `proofGoal` — the exact fact needed to decide the finding;
- `provenClaims[]` — evidence-grounded claims only;
- `missingClaims[]` — unresolved proof obligations;
- ordered `route[]` — selected-artifact proof first, then cross-domain/formal proof when applicable, runtime last.

Initial recipes cover progression dead-end, arena concurrency/isolation, inventory/economy lifecycle, stale async mutation, chunk residency, persistence/recovery, state ownership, entity/combat lifecycle, world mutation, boundary/capacity, player lifecycle, UI/information, and platform-performance impact.

Model task packets can now use `PROOF_NAVIGATION` to resolve a specific NEED_VALIDATION finding toward PROVEN and explicitly forbid skipping to runtime while an earlier applicable proof route remains unexhausted.

### Honesty / non-suppression gate

The selected-map audit now computes an explicit `no-hidden-material-finding` assessment. It independently derives the material unresolved residue set from the scenario graph, RIG knowledge receipts, Gameplay Model Closure, negative-space signals, temporal risks, and defect-resolution state, then compares that set against the union of causal NEED_VALIDATION findings and visible Audit Obligations.

It verifies that every saturation-complete `CONFIRMED_DEFECT_READY` causal link is visible as PROVEN, while confirmation-ready links with incomplete universal/family proof remain visible as NEED_VALIDATION and non-finding gaps remain Audit Obligations.

Any mismatch is an honesty violation and forces the audit to remain `BLOCKED`; it cannot become `READY_FOR_REVIEW` merely because other closure gates passed.

### Evidence-route consolidation

Static, runtime, and tester report candidates are now explicitly treated as evidence origins inside the single PROVE/REPORT flow. They are not independent audit routes.

The existing internal `route` property remains for compatibility, but its semantic meaning is `evidenceRoute`. No production entry, checkpoint authority, or report authority branches on it.

### Map Audit Output V2 bridge

`SelectedMapAuditRun` now carries a canonical `mapAuditReport` projection produced by `map-audit-output-v2.ts`.

```text
audit <selected.mcworld>
→ SelectedMapAuditRun
→ mapAuditReport (Map Audit Output V2)
→ HTML renderer / human presentation
```

The projection performs no second analysis. It serializes the current audit identity, grounded gameplay model, complete BUG/DESIGN_MISMATCH finding lanes, validation tests, honesty receipt, and full-map receipt.

Map Audit severity is optional until grounded impact classification exists. Approved Bug Report V2 continues to require final severity.

### Map Audit Report honesty

The human-facing report is now the complete Map Audit report, not the approved bug ledger alone.

```text
Map Audit findings
├─ PROVEN BUG
├─ PROVEN DESIGN_MISMATCH
├─ NEED_VALIDATION BUG
└─ NEED_VALIDATION DESIGN_MISMATCH
```

The resolver must attempt to promote NEED_VALIDATION through bounded proof navigation first. If deciding proof remains unavailable, the finding stays visible as NEED_VALIDATION with `validationReason`, `missingProof`, and `validationTest`; it is not silently dropped and receives no final severity.

`BuildSelectedMapAuditReportResult` now exposes one centralized complete finding projection (`findings`, `proven`, `needValidation`) on every success/failure return path. The HTML renderer accepts Map Audit Output V2 and renders both PROVEN and NEED_VALIDATION sections. Approved Bug Report V2 remains a downstream PROVEN BUG ledger only.

### PROVE / REPORT checkpoint cleanup

`D2 Contradiction Admission` now treats Scenario Closure PARTIAL as non-blocking only when it represents irreducible runtime proof residue. OPEN remains blocking.

`E1` is now the **Map Audit Report Contract**, not a Proposed Bug Set / confirmed-defects-only gate. It preserves the complete finding surface; approved Bug Report V2 promotion remains downstream.

### READY_FOR_REVIEW semantics

`READY_FOR_REVIEW` means the audit finding set is complete enough for human review:

- every tracked material finding is visible;
- honesty is PASS;
- mandatory checkpoint admission is READY.

It does **not** mean every finding is PROVEN.

A `NEED_VALIDATION` finding may remain in a review-ready Map Audit Report when the unresolved proof is explicitly identified and preserved. Per-finding proof completeness is expressed only by `PROVEN` versus `NEED_VALIDATION`, not by creating another audit-run status.

### Report handoff authority cleanup

Canonical report review/build now carries only the gate authorities it actually consumes:

```text
SelectedMapAuditAuthority
+ MandatoryAuditProcedure
+ GameplayDefectResolution
→ approved bug candidate review/build
```

Discovery, Gameplay Model Closure, and Scenario Closure remain inputs to the Mandatory Audit Procedure and are no longer passed as parallel production report gates. Legacy collector fields remain optional/deprecated for compatibility only.

### Final report handoff integrity

The canonical report handoff now preserves unresolved material work explicitly:

- approved Bug Report V2 still promotes PROVEN BUG items only;
- Map Audit report result carries all DESIGN_MISMATCH findings with their PROVEN / NEED_VALIDATION status;
- all NEED_VALIDATION findings across BUG and DESIGN_MISMATCH are exposed in one explicit `needValidation` collection;
- consolidated `validationTests` are carried with the report result so unresolved findings cannot disappear during handoff.

The audit run remains the authority; these are projections of the same revision, not a second workflow.

## Current Capability Truth

Latest source-level catalog remains expected to contain:

```text
task capabilities  51
proof-bound        51
proof-unbound      0
analysis caps      31
```

Proof-bound means a capability-specific proof contract exists. It does not mean tests were executed in this work session.

### Remaining blind-spot hardening now present

The latest source also closes several previously high-risk false-negative paths:

- **Discovery Challenger** — raw Semantic IR state operations, unresolved execution edges, unowned execution regions, and deferred/periodic relations with no semantic/scenario owner surface as NEED_VALIDATION instead of silently disappearing before modeling.
- **Reverse shared-resource ownership** — each state surface is indexed to all readers, writers, clearers, and deferred writers; multi-writer, missing-authority, stale-generation, and three-or-more-region convergence produce explicit proof pressure.
- **Higher-order interaction** — shared-resource convergence is used to select interleavings, avoiding an exhaustive Cartesian product across unrelated systems.
- **Exact-target counter-proof** — an exclusion/guard only blocks a defect when it applies to the contradicted dependency/commit target; nearby or merely overlapping healthy guards no longer suppress a candidate.
- **Compound boundaries** — interacting arena/player and arena/simulation capacity dimensions are challenged explicitly rather than relying only on one-dimensional N-1/N/N+1 checks.
- **Accumulation/growth** — append-without-clear persistence, ticking acquire/release imbalance, and world-drop reward paths without cleanup are challenged as repeated-run growth risks without requiring many live runs first.

All of these signals are included in the honesty/non-suppression gate, so they cannot remain internal attention counters while the audit claims READY_FOR_REVIEW.

## Known proof limits

- latest source changes have not been typechecked locally;
- latest source changes have not run through the full test suite;
- CI has not been run for this latest consolidation;
- LOCAL_MINECRAFT/LIVE_MINECRAFT remains required only for irreducible runtime residue;
- false-negative / false-positive rates still need real-map benchmark measurement;
- semantic Detection Gaps are intentionally allowed to block audit rather than produce false PASS.

### Negative precision calibration

Calibration now includes explicit negative/known-safe candidates for:

- an exact-target exclusion guard that legitimately blocks a defect;
- a repaired topology translation that matches the expected replica offset.

They remain non-scorable candidates until artifact fingerprint/frozen expectation requirements are satisfied. This improves precision coverage without fabricating readiness.

### Benchmark contract alignment

The existing detection benchmark framework is now aligned with the current map-audit public model rather than creating a second benchmark system.

Benchmark expectations may freeze:

- `issueType = BUG | DESIGN_MISMATCH`;
- `publicStatus = PROVEN | NEED_VALIDATION`;
- whether unresolved validation is explicitly allowed at the configured evidence ceiling.

Benchmark results may measure:

- TP / TN / FP / FN;
- `provenRate`;
- `needValidationRate`;
- `runtimeResidueRate`;
- validation-test count;
- honesty PASS/VIOLATION;
- full-map replica equivalence/divergence/incomplete-proof counts.

A NEED_VALIDATION result is not automatically a false negative. It becomes a proof-quality failure when frozen expectations require PROVEN and sufficient evidence was available.

Real-map regression cases remain non-ready when required identity/version/frozen-expectation fields are missing. Readiness must not be fabricated to obtain a score.

## Next proof target

Run one exact selected artifact through:

```text
audit <selected.mcworld>
```

Measure:

- stage at first block;
- semantic understanding gaps;
- required cross-system scenario activation;
- PROVEN BUG findings;
- PROVEN DESIGN_MISMATCH findings;
- NEED_VALIDATION findings remain visible with exact missing-proof tests;
- runtime-only residue;
- known-issue capture;
- false negatives / false positives against independently frozen expectations.

## Rule

Do not expand architecture unless real-map evidence exposes a repeated generic gap. Prefer extending an existing semantic owner or leaving an explicit Detection Gap.
