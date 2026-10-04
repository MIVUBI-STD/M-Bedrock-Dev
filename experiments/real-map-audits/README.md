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
| Defense Challenge | 1.1.1 | **4 PROVEN BUGS — 2 Blocker, 2 Major** | `defense-challenge-v1.1.1.md` |
| Attack Challenge | 1.1.1 | **2 PROVEN Major BUGS** | `attack-challenge-v1.1.1.md` |
| Build & Decode | 1.1.0 | **1 PROVEN Minor DESIGN_MISMATCH** | `build-and-decode-v1.1.0.md` |
| The Gauntlet | 1.0.1 | **1 PROVEN Major BUG** | `the-gauntlet-v1.0.1.md` |
| Composite Challenge | 1.1.1 | **3 PROVEN BUGS — 2 Blocker, 1 Major** | `composite-challenge-v1.1.1.md` |
| The Circuit | Drive 1.0.2 / pack 1.0.1 | 0 PROVEN | `the-circuit-v1.0.2.md` |
| Dark Crystal | 1.0.0 | 0 PROVEN | `dark-crystal-v1.0.0.md` |
| Manhunt | 1.0.0 | 0 PROVEN | `manhunt-v1.0.0.md` |
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

The reconciled selected-artifact batch currently contains **13 source-proven BUGs** plus **1 source-proven DESIGN_MISMATCH**:

- **Defense Challenge v1.1.1** — 4 BUGs:
  - Blocker — arena reset can release the ticking-area lease of a newly started run;
  - Major — reconnect during combat respawn countdown bypasses the death delay;
  - Blocker — failed delayed wave spawns can be treated as cleared before spawn retries finish;
  - Major — disconnect during preload can bypass the fresh-session inventory wipe.
- **Attack Challenge v1.1.1** — 2 Major BUGs:
  - disconnect during preload can bypass the fresh-session full inventory wipe;
  - reconnect during combat respawn countdown can bypass the death delay.
- **Composite Challenge v1.1.1** — 3 BUGs:
  - Blocker — arena-specific ticking areas are declared but never created;
  - Major — disconnect during preload can bypass the fresh-session inventory wipe;
  - Blocker — arena becomes reusable while asynchronous world reset is still running.
- **Five Nights at Z Village L1 v1.1.0** — 1 Major BUG:
  - reconnect during cinematic can preserve stale coin currency into a fresh session.
- **The Gauntlet v1.0.1** — 1 Major BUG:
  - required-party progression gates can ignore disconnected members because shared all-player predicates filter the locked roster down to currently present players.
- **Orb of the Illusioner L2 v1.1.0** — 2 Major BUGs:
  - weapon/armor upgrades consume coins and then fail on an undefined `material` identifier;
  - active-game reload recovery aborts the arena because barricade validation references undefined `selectedBarricades`.
- **Build & Decode v1.1.0** — 1 Minor DESIGN_MISMATCH:
  - temporary coordinate-picker dev tooling is reachable by a normal Creative builder holding a stick.

These are selected-artifact source findings. Runtime-only obligations remain separate and do not reduce or inflate this count.

## Important clean-pass behavior

A zero-finding pass is retained intentionally when current selected-artifact proof does not establish a defect.

Examples of historical/suspicious behavior that was **not** blindly promoted:

- Defense concurrency cap when explicit queue ownership exists;
- Circuit empty static ticking list when PathwayLoader dynamically owns ticking areas;
- FNAZ historical shop/keepInventory/spawn/path issues where current source contains explicit fixes;
- FOTP historical friendly-hit/sword/revive/targeting issues where current source contains explicit fixes;
- Orb L2 temporary debug picker without a proven ordinary-player trigger path;
- Aftershock scanner/dev surfaces without a proven ordinary-player capability path;
- BlitzBuild script-event diagnostics, which are not ordinary-player reachable because `/scriptevent` requires operator-level Game Directors permission and cheats.

## Batch audit status — multi-arena deep pass reopened

The earlier source-first reconciliation found the current confirmed issue set, but the batch is **not yet closed** under the repository's Multi Arena Audit Contract. A dedicated MODEL/STRESS pass is reopened for every selected artifact with multiple arena/replica instances.

Current confirmed findings remain valid while this deeper pass runs:

- **13 source-proven BUGs**: 4 Blocker + 9 Major.
- **1 source-proven DESIGN_MISMATCH**: 1 Minor.

The reopened pass must close, where applicable:

- visible vs playable arena count;
- concurrent arena limit and capacity + 1 behavior;
- queue/admission feedback;
- simultaneous start;
- shared/global resource contention;
- player/session/entity/projectile/score isolation;
- timers/cinematics/world mutation isolation;
- cleanup, second-run reuse, and generation safety.

Runtime was **not executed** in the source audit. Existing canonical Bug Report V2 files remain current approved findings, but they must not be treated as evidence that multi-arena coverage is complete.


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
