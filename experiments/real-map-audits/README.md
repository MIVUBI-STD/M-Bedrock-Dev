# Real Map Audits

Navigation index only. This file is **not** bug-report authority and **not** historical reliability authority.

Canonical owners remain:

- selected-artifact audit truth → SelectedMapAuditRun / map audit evidence;
- current approved bug state → `workspace/reports/*.json`;
- historical approved incidents → `engine/reliability/catalogs/regressions.json`;
- current target identity / Drive binding → `workspace/project-registry.json`.

## Current Drive batch

22 current selected artifacts were source-audited individually.

| Target | Artifact version | First-pass result | Evidence |
|---|---:|---|---|
| Defense Challenge | 1.1.1 | **1 PROVEN Blocker BUG** | `defense-challenge-v1.1.1.md` |
| Attack Challenge | 1.1.1 | **1 PROVEN Major BUG** | `attack-challenge-v1.1.1.md` |
| Build & Decode | 1.1.0 | **1 PROVEN Minor DESIGN_MISMATCH** | `build-and-decode-v1.1.0.md` |
| The Gauntlet | 1.0.1 | **1 PROVEN Major BUG** | `the-gauntlet-v1.0.1.md` |
| Composite Challenge | 1.1.1 | 0 PROVEN | `composite-challenge-v1.1.1.md` |
| The Circuit | Drive 1.0.2 / pack 1.0.1 | 0 PROVEN | `the-circuit-v1.0.2.md` |
| Dark Crystal | 1.0.0 | 0 PROVEN | `dark-crystal-v1.0.0.md` |
| Manhunt | 1.0.0 | 0 PROVEN | `manhunt-v1.0.0.md` |
| Five Nights at Z Village L1 | 1.1.0 | 0 PROVEN | `five-nights-z-village-l1-v1.1.0.md` |
| Five Nights at Z Village L2 | internal 1.2.2 | 0 PROVEN | `five-nights-z-village-l2-v1.2.2.md` |
| Fall of the Pillager L1 | 1.1.0 | 0 PROVEN | `fall-of-the-pillager-l1-v1.1.0.md` |
| Fall of the Pillager L2 | 2.2.2 | 0 PROVEN | `fall-of-the-pillager-l2-v2.2.2.md` |
| Orb of the Illusioner L1 | 1.2.1 | 0 PROVEN | `orb-illusioner-l1-v1.2.1.md` |
| Orb of the Illusioner L2 | internal 1.1.0 | 0 PROVEN | `orb-illusioner-l2-v1.1.0.md` |
| Beach Bedwars | 1.1.0 | 0 PROVEN | `beach-bedwars-v1.1.0.md` |
| Raid Arena Classic | 1.1.0 | 0 PROVEN | `raid-arena-classic-v1.1.0.md` |
| Marathon Test of Tactics L2 | 2.2.0 | 0 PROVEN | `marathon-test-of-tactics-l2-v2.2.0.md` |
| Aftershock | 1.0.4 | 0 PROVEN | `aftershock-v1.0.4.md` |
| The Clockwork Vault | 1.0.1 | 0 PROVEN | `clockwork-vault-v1.0.1.md` |
| Mysteries of Biomes L1 | 1.0.4 | 0 PROVEN | `mysteries-biomes-l1-v1.0.4.md` |
| Mysteries of Biomes L2 | 2.1.1 | 0 PROVEN | `mysteries-biomes-l2-v2.1.1.md` |
| Builder's Memory / BlitzBuild | internal 1.0.3 | 0 PROVEN | `blitzbuild-v1.0.3.md` |

## Proven findings requiring review

### Defense Challenge v1.1.1 — Blocker

**Arena reset can release the ticking-area lease of a newly started run.**

Async reset exposes the arena as idle/reusable before reset completion. A new run can reuse the existing arena-only lease; old reset completion then releases that lease underneath the new run.

### Attack Challenge v1.1.1 — Major

**Reconnect during combat respawn countdown bypasses the death delay.**

CombatTracker restores pending-respawn spectator state, but GameManager independently restores active gameplay shortly afterwards.

### Build & Decode v1.1.0 — Minor DESIGN_MISMATCH

**Temporary coordinate-picker dev tool is enabled in production for non-admin players.**

A normal Creative builder can obtain a stick and trigger the imported non-admin debug-stick coordinate picker.

### The Gauntlet v1.0.1 — Major

**Level 9 can complete while a required party member is disconnected.**

The authored all-player finish condition filters offline players before evaluating the completion predicate.

## Important clean-pass behavior

A zero-finding pass is retained intentionally when current selected-artifact proof does not establish a defect.

Examples of historical/suspicious behavior that was **not** blindly promoted:

- Defense concurrency cap when explicit queue ownership exists;
- Composite async reset when selected reset workload fits inside the authored reuse cooldown;
- Circuit empty static ticking list when PathwayLoader dynamically owns ticking areas;
- FNAZ historical shop/keepInventory/spawn/path issues where current source contains explicit fixes;
- FOTP historical friendly-hit/sword/revive/targeting issues where current source contains explicit fixes;
- Orb L2 temporary debug picker without a proven ordinary-player trigger path;
- Aftershock scanner/dev surfaces without a proven ordinary-player capability path;
- BlitzBuild diagnostic script-event surface without proven ordinary-player command reachability.

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
