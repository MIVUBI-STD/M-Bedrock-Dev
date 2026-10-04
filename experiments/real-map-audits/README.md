# Real Map Audits

Navigation index only. This file is **not** bug-report authority and **not** historical reliability authority.

Canonical owners remain:

- selected-artifact audit truth → SelectedMapAuditRun / map audit evidence;
- current approved bug state → `workspace/reports/*.json`;
- historical approved incidents → `engine/reliability/catalogs/regressions.json`;
- current target identity / Drive binding → `workspace/project-registry.json`.

## Current Drive batch

### Artifact integrity

All 22 selected files used in this reconciliation were fetched from the current Drive IDs in `workspace/project-registry.json`; their SHA-256 values matched the registry fingerprints. Filename/version-label mismatches are therefore treated as metadata issues rather than evidence that a different artifact was audited.

22 current selected artifacts were source-audited individually and reconciled against the current Drive-bound artifact identity.

| Target | Artifact version | Reconciled source result | Evidence |
|---|---:|---|---|
| Defense Challenge | 1.1.1 | **4 PROVEN BUGS — 2 Blocker, 2 Major + 1 Major DESIGN_MISMATCH** | `defense-challenge-v1.1.1.md` |
| Attack Challenge | 1.1.1 | **2 PROVEN Major BUGS + 1 Major DESIGN_MISMATCH** | `attack-challenge-v1.1.1.md` |
| Build & Decode | 1.1.0 | **1 PROVEN Minor DESIGN_MISMATCH** | `build-and-decode-v1.1.0.md` |
| The Gauntlet | 1.0.1 | **2 PROVEN Major BUGS** | `the-gauntlet-v1.0.1.md` |
| Composite Challenge | 1.1.1 | **5 PROVEN BUGS — 2 Blocker, 2 Major, 1 Minor** | `composite-challenge-v1.1.1.md` |
| The Circuit | Drive 1.0.2 / pack 1.0.1 | **1 PROVEN Minor DESIGN_MISMATCH** | `the-circuit-v1.0.2.md` |
| Dark Crystal | 1.0.0 | 0 PROVEN | `dark-crystal-v1.0.0.md` |
| Manhunt | 1.0.0 | **1 PROVEN Major DESIGN_MISMATCH** | `manhunt-v1.0.0.md` |
| Five Nights at Z Village L1 | 1.1.0 | **1 PROVEN Major BUG** | `five-nights-z-village-l1-v1.1.0.md` |
| Five Nights at Z Village L2 | internal 1.2.2 | 0 PROVEN | `five-nights-z-village-l2-v1.2.2.md` |
| Fall of the Pillager L1 | 1.1.0 | 0 PROVEN | `fall-of-the-pillager-l1-v1.1.0.md` |
| Fall of the Pillager L2 | 2.2.2 | 0 PROVEN | `fall-of-the-pillager-l2-v2.2.2.md` |
| Orb of the Illusioner L1 | 1.2.1 | 0 PROVEN | `orb-illusioner-l1-v1.2.1.md` |
| Orb of the Illusioner L2 | internal 1.1.0 | **2 PROVEN Major BUGS** | `orb-illusioner-l2-v1.1.0.md` |
| Beach Bedwars | 1.1.0 | 0 PROVEN | `beach-bedwars-v1.1.0.md` |
| Raid Arena Classic | 1.1.0 | 0 PROVEN | `raid-arena-classic-v1.1.0.md` |
| Marathon Test of Tactics L2 | 2.2.0 | 0 PROVEN | `marathon-test-of-tactics-l2-v2.2.0.md` |
| Aftershock | 1.0.4 | 0 PROVEN | `aftershock-v1.0.4.md` |
| The Clockwork Vault | 1.0.1 | 0 PROVEN | `clockwork-vault-v1.0.1.md` |
| Mysteries of Biomes L1 | 1.0.4 | 0 PROVEN | `mysteries-biomes-l1-v1.0.4.md` |
| Mysteries of Biomes L2 | 2.1.1 | 0 PROVEN | `mysteries-biomes-l2-v2.1.1.md` |
| Builder's Memory / BlitzBuild | internal 1.0.3 | 0 PROVEN | `blitzbuild-v1.0.3.md` |

## Proven findings requiring review

The reopened selected-artifact batch currently contains **16 source-proven BUGs** plus **5 source-proven DESIGN_MISMATCHES**:

- **Defense Challenge v1.1.1** — 4 BUGs + 1 Major DESIGN_MISMATCH:
  - Blocker — arena reset can release the ticking-area lease of a newly started run;
  - Major — reconnect during combat respawn countdown bypasses the death delay;
  - Blocker — failed delayed wave spawns can be treated as cleared before spawn retries finish;
  - Major — disconnect during preload can bypass the fresh-session inventory wipe;
  - Major DESIGN_MISMATCH — six playable arena surfaces expose only two concurrent sessions.
- **Attack Challenge v1.1.1** — 2 Major BUGs + 1 Major DESIGN_MISMATCH:
  - disconnect during preload can bypass the fresh-session full inventory wipe;
  - reconnect during combat respawn countdown can bypass the death delay;
  - Major DESIGN_MISMATCH — six playable arena surfaces expose only two concurrent sessions.
- **Composite Challenge v1.1.1** — 5 BUGs:
  - Blocker — arena-specific ticking areas are declared but never created;
  - Major — disconnect during preload can bypass the fresh-session inventory wipe;
  - Blocker — arena becomes reusable while asynchronous world reset is still running;
  - Major — cleanup in one arena can invalidate another arena's active flag carrier;
  - Minor — active arena floor maintenance can mutate blocks around players outside that arena.
- **Five Nights at Z Village L1 v1.1.0** — 1 Major BUG:
  - reconnect during cinematic can preserve stale coin currency into a fresh session.
- **The Gauntlet v1.0.1** — 2 Major BUGs:
  - required-party progression gates can ignore disconnected members because shared all-player predicates filter the locked roster down to currently present players;
  - ordinary players can reach the enabled developer level-skip capability through authored resources and normal crafting.
- **Orb of the Illusioner L2 v1.1.0** — 2 Major BUGs:
  - weapon/armor upgrades consume coins and then fail on an undefined `material` identifier;
  - active-game reload recovery aborts the arena because barricade validation references undefined `selectedBarricades`.
- **The Circuit v1.0.2** — 1 Minor DESIGN_MISMATCH:
  - normal gameplay oak planks + Survival crafting make the production DebugStick reachable without developer permission.
- **Manhunt v1.0.0** — 1 Major DESIGN_MISMATCH:
  - Arena 6 is materially incomplete relative to the authored arena replica; native voxel proof shows a concentrated missing-geometry region.
- **Build & Decode v1.1.0** — 1 Minor DESIGN_MISMATCH:
  - temporary coordinate-picker dev tooling is reachable by a normal Creative builder holding a stick.

These are selected-artifact source findings. Runtime-only obligations remain separate and do not reduce or inflate this count.

## Important clean-pass behavior

A zero-finding pass is retained intentionally when current selected-artifact proof does not establish a defect.

Examples of historical/suspicious behavior that was **not** blindly promoted:

- Circuit empty static ticking list when PathwayLoader dynamically owns ticking areas;
- FNAZ historical shop/keepInventory/spawn/path issues where current source contains explicit fixes;
- FOTP historical friendly-hit/sword/revive/targeting issues where current source contains explicit fixes;
- Orb L2 temporary debug picker without a proven ordinary-player trigger path;
- Aftershock scanner/dev surfaces without a proven ordinary-player capability path;
- BlitzBuild script-event diagnostics, which are not ordinary-player reachable because `/scriptevent` requires operator-level Game Directors permission and cheats.

## Batch audit status — source-side deep pass closed

The current 22-artifact batch has completed its selected-artifact **source/package deep pass**, including the Multi Arena Audit Contract, client-reported search pressure, replica proof, capability reachability, roster/terminal ownership, shared-resource isolation, cleanup/reuse, and capacity+1 analysis.

No material **source-decidable detection gap** remains open in this batch. Current confirmed findings are:

- **16 source-proven BUGs**: 4 Blocker + 11 Major + 1 Minor.
- **5 source-proven DESIGN_MISMATCHES**: 3 Major + 2 Minor.

Source-side coverage closed, where applicable:

- visible vs playable arena count;
- concurrent arena limit and capacity + 1 behavior;
- queue/admission feedback;
- simultaneous-start ownership;
- shared/global resource contention;
- player/session/entity/projectile/score isolation;
- timers/cinematics/world mutation isolation;
- replica completeness;
- developer/restricted capability reachability;
- disconnect/reconnect roster semantics;
- cleanup, second-run reuse, and generation safety.

### Runtime-only residue

Minecraft runtime was **not executed** in this pass. The remaining obligations are intentionally narrow and are not current bugs:

- Attack/Defense — exact asynchronous ticking-area release → next-lease acquisition interleaving at capacity+1;
- Defense — Speed Potion transaction only if the configured command actually fails in the deployed runtime;
- Clockwork Vault — overlapping Workshop cinematics that contend for the shared ticking-area name;
- Beach Bedwars — death/disconnect same-tick ordering and terrain cleanup only if manifested;
- FNAZ L2 / Orb L1 — navigation/entity simulation behavior that cannot be proven from source alone;
- Mysteries L1/L2 — exact shared-button/entity interaction timing;
- Raid Arena Classic — combat/death/leave/result cleanup ordering;
- The Circuit — far-chunk entity/pathway marker behavior and round-specific reconnect timing;
- Aftershock — physics/entity interactions in Quarry/Ascent.

These runtime obligations do not reopen source discovery. A runtime result should promote a finding only when it proves a wrong player-visible outcome on the exact selected artifact.

Existing canonical Bug Report V2 files remain the previously approved current bug ledger. Newly discovered deep-pass findings remain review evidence until explicit approval.


## Approval boundary

No finding in this folder should enter `regressions.json` merely because it is PROVEN in source.

Required sequence:

```text
selected-artifact evidence
→ human review / approval
→ canonical Bug Report V2 when applicable
→ approved historical regression ingestion
```

Runtime-only obligations remain obligations until tested/proven.
