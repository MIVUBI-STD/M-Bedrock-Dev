# Gameplay Audit Blind-Spot Contract

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
- whether a technically correct limitation creates misleading player expectation.

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

Do not treat a queue as designed merely because queue code exists. Ground whether queueing is intended and whether players receive clear feedback.

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
