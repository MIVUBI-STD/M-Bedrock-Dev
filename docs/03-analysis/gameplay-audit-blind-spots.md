# Gameplay Audit Blind-Spot Contract

> **Supporting audit knowledge only.** These blind spots are obligations consumed by the canonical procedure. They do not form a second workflow or a separate completion checklist.

## Purpose

Prevent gameplay bugs from escaping audit because the happy path or core logic appears correct.

This contract is mandatory for map audits before finalization.

## Required blind-spot surfaces

### 1. Capacity and concurrency

Check:
- visible arena/session capacity;
- actual concurrent match capacity;
- queue behavior;
- player-facing explanation when capacity is limited;
- whether apparent availability matches actual availability.

### 2. Hidden limitations and player expectation

Check:
- whether the world communicates restrictions that materially affect play;
- whether visible affordances imply behavior the runtime does not provide;
- whether a technically correct limitation creates misleading player expectation;
- whether a technical/platform limit reduces a player-visible capability below what the map presents.

### 3. Softlock paths

Check for states where the world is still running but required progression cannot continue:
- wave never completes;
- next level never starts;
- player cannot leave spectator/retry state;
- arena remains reserved forever;
- objective cannot be completed;
- UI/action path traps progression.

### 4. Recovery paths

For every major gameplay state, review:
- disconnect;
- reconnect;
- world/script reload;
- all players leaving;
- player returning;
- failed spawn;
- failed transition;
- retry;
- cleanup after failure.

Normal-path correctness is not sufficient when recovery can corrupt progression.

### 5. Boundary scenarios

Explicitly test or derive the first/last/maximum boundaries:
- first level / final level;
- first wave / final wave;
- first retry / final retry;
- minimum party / maximum party;
- first arena / last arena;
- capacity limit and capacity+1;
- zero remaining enemies / final enemy;
- final reward / final transition.

### 6. Multiplayer scaling and authority

Check:
- 1 player versus maximum party;
- shared versus per-player state;
- leader/owner assumptions;
- one player leaving while others remain;
- simultaneous player actions;
- rewards, enemy scaling and score scaling across party sizes.

### 7. Multi-arena capacity and isolation

Check both:
- isolation correctness; and
- whether the advertised/visible arena count matches playable concurrent capacity.

Do not treat a queue as counter-proof merely because queue code exists. If visible/advertised arena capacity exceeds actual concurrent playable capacity, record a gameplay/design capacity issue. Queue messaging, platform limits, or performance safeguards explain or mitigate the cause; they do not erase the mismatch.

### 8. Content contract

Compare named/introduced gameplay mechanics against actual behavior:
- enemy role;
- item purpose;
- ability;
- reward;
- objective;
- unlock;
- front/route;
- tutorial promise.

A configured label or tag is not proof that the mechanic actually exists.

### 9. Feedback and observability

Check whether the player can understand:
- current objective;
- current phase;
- why progression is blocked;
- queue position;
- retry state;
- victory/defeat;
- cooldown/timer;
- unavailable actions.

Missing feedback becomes a defect when it materially changes the ability to understand or complete gameplay.

### 10. Persistence boundaries

Build an explicit save/reset/restore matrix for material state:
- level;
- wave;
- timer;
- score;
- coin;
- inventory;
- upgrades;
- player life state;
- enemy state;
- delayed actions;
- arena/session ownership.

Check both under-persistence and over-persistence.

### 11. Performance-dependent gameplay

Only gameplay-significant performance constraints belong here.

Check:
- ticking/chunk limits that reduce playable capacity;
- entity load that changes wave behavior;
- unload/reload causing objectives or actors to disappear;
- performance safeguards that silently disable intended gameplay.

### 12. Platform compatibility impact

Separate platform risk from map bugs, but audit when version/API behavior can visibly break the selected world.

Do not classify compatibility concern as a gameplay defect without selected-version evidence.

## Coverage challenger

Before finalization, challenge the audit output independently from the discovery result. The purpose is not to create a second workflow; it is to falsify the assumption that discovered coverage is sufficient.

Ask:

- Which material surface has no scenario that can make it fail?
- Which acquired resource has no release/reset/terminal accounting?
- Which progression tracker has no zero/final/transition test?
- Which multiplayer feature was tested only with two players/arenas even though a larger selected-map boundary exists?
- Which unsupported semantic surface became a Detection Gap without a concrete tester action?
- Which runtime-sensitive behavior was accepted from static evidence even though tick ordering, unload, concurrency, or engine execution can change the outcome?
- Which high-impact completion/terminal mechanic received shallow proof only because its implementation is technically simple?

A clean answer requires either evidence or an explicit targeted test obligation. Silence is not coverage.

## Gameplay capability delivery

Every player-visible or authored capability must be crosschecked as:

```text
Designed / Presented Capability
→ Implementation Evidence
→ Actual Playable Capability
→ Technical Constraint / Root Cause
→ Player-visible Consequence
```

Classify failures as:

- `DESIGN_FAILURE` — the game design exposes a capability the selected artifact cannot actually deliver at the presented level;
- `DESIGN_IMPLEMENTATION_MISMATCH` — a player-visible designed capability has no matching implementation;
- `IMPLEMENTATION_FAILURE` — implementation exists, but the gameplay delivery chain is incomplete.

A technical constraint can explain a `DESIGN_FAILURE`; it does not convert it to NOT BUG.

## Completion rule

Each applicable surface must be recorded internally as:

- checked;
- blocked, with reason; or
- not-applicable.

The audit cannot be finalized merely because the main gameplay flow has no remaining contradictions.

## Design-versus-bug discipline

For every limitation ask, in order:

1. Is the behavior explicitly grounded as intended in the selected artifact?
2. Does the player-facing world communicate that behavior?
3. Does the actual runtime behavior match the grounded intent?
4. Does it block, distort or mislead material gameplay?

Existence of implementation code is not proof of intended design.


### 13. Delivery-state lifecycle

For every material configured or authored gameplay dependency, distinguish:

```text
declared → materialized → active → owned → simulated → completed/released
```

Do not infer a later state from an earlier one. In particular:

- declared ticking regions are not proof they were created;
- queued structure/station placement is not proof it materialized;
- spawned/configured actors are not proof their chunks remain simulated;
- a cleanup request is not proof ownership was safely released;
- an end request is not proof the terminal result was committed exactly once.

Missing delivery-state evidence creates a targeted proof obligation. A proven missing transition with player impact is a gameplay finding.

### 14. Terminal single-commit ownership

For every win, loss, timeout, death, retry, abort, and objective-complete path:

- enumerate all callers that can request terminal transition;
- check same-tick and adjacent-tick collisions;
- prove a single canonical terminal owner or idempotent commit guard;
- verify result, reward, score, cleanup, and messaging execute once;
- test final-second objective completion against timeout when both exist.

Two terminal request paths reaching an unguarded terminal mutation are not cleared merely because each path works independently.

### 15. Artifact identity consistency

Compare current selected-artifact identity across every release-bearing surface that exists:

- delivered filename/version label;
- behavior/resource pack manifest version;
- world/level display name when versioned;
- results/export metadata;
- report binding/version.

A disagreement is retained as an information/release-health finding. Promote it to BUG or DESIGN_MISMATCH only when it creates a grounded player/tester/client-visible contract failure. Never silently discard it.

### 16. Release residue and compatibility

Deprecated calls, dormant debug code, hardcoded arena IDs, and unused compatibility paths are not automatically gameplay bugs.

They must receive one of:

- proven unreachable/non-material with explicit disposition;
- NEED_VALIDATION when reachability or gameplay consequence is unresolved;
- PROVEN when a selected-artifact player-visible failure path is established.

For hardcoded arena/session IDs, explicitly test reachability under non-default arenas before calling the residue harmless.
