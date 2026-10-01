# Bug Report Copy Contract

This document is the single authority for wording quality in new Bug Report V2 content.

The goal is operational clarity, not prose completeness.

A reader must be able to scan a bug and answer:

1. What failed?
2. What should happen?
3. What happened instead?
4. What supported action exists?

## Canonical field roles

### Title

Purpose: identify one primary failure.

Rules:

- one line;
- maximum 90 characters;
- name the failure, not the investigation;
- avoid generic titles such as "Bug found", "Issue with map", or "Something is wrong".

Good:

```text
Arena cannot restart after match cleanup
```

### Problem / Issue

Purpose: let the reader understand **what is wrong and why it matters** in one scan.

Required structure:

```text
Affected feature/object + concrete failure + gameplay impact
```

Rules:

- maximum 220 characters;
- start from the affected gameplay feature, object, or state;
- state the failure as an observable fact;
- include the player/game impact when it is not already obvious;
- use one sentence whenever possible;
- do not lead with investigation language such as "there may be", "appears to", "possible issue", "seems", or "needs checking";
- do not describe root-cause speculation here;
- do not repeat Expected or Observed verbatim.

Good:

```text
The arena keeps the previous session ownership after match end, so a new match cannot start.
```

Bad:

```text
There appears to be an issue with arena cleanup that may affect restarting.
```

### Expected

Purpose: state intended behavior.

Rules:

- maximum 180 characters;
- describe the intended result only.

### Observed

Purpose: state the actual result.

Rules:

- maximum 180 characters;
- describe what actually happens;
- must not duplicate Expected.

### Reproduction — displayed as How to Reproduce (In-Game)

Purpose: give a tester who does not read code a short, exact path to **make the bug happen in Minecraft and visibly confirm it**.

Required structure:

```text
Start state/location → player action → next player action → visible wrong result
```

Rules:

- required for every new bug that enters the tester-facing report;
- use 2–5 steps;
- each step maximum 160 characters;
- describe only actions and states available in-game;
- name the relevant place, phase, object, item, UI, player count, or trigger when needed;
- use player-facing verbs such as Enter, Join, Walk, Interact, Press, Buy, Place, Break, Die, Respawn, Finish, Return, Start, Wait, or equivalent;
- one action or state transition per step;
- the final step must tell the tester exactly what wrong result should be visible;
- do not reference source files, scripts, functions, methods, classes, variables, internal IDs, or architecture;
- do not ask the tester to inspect code, logs, or implementation state;
- do not use vague steps such as "test it", "check the bug", "verify the logic", or "see if it happens";
- if multiplayer is required, state the required player count;
- if a specific game phase or location is required, state it explicitly;
- if no tester-verifiable in-game path exists yet, keep the finding internal instead of presenting it as a tester-ready bug.

Good:

```text
1. Join the arena with 2 players.
2. Finish the match normally.
3. Return both players to the lobby.
4. Start the same arena again.
5. Confirm the new match does not start.
```

Bad:

```text
1. Check the session cleanup function.
2. Verify the arena variable is still set.
```

### AI Analysis

Purpose: concise technical interpretation.

Rules:

- maximum 420 characters;
- explain the technical basis, not the entire proof history;
- do not repeat Problem;
- internal evidence graph IDs and orchestration details are forbidden.

### Suggested Fix — displayed as Solution

Purpose: let the reader understand **what should be changed to resolve the issue** without reading the technical analysis first.

Required structure:

```text
Direct action + repair target + intended result
```

Rules:

- maximum 220 characters;
- begin with a direct repair verb when practical: Clear, Reset, Restore, Rebind, Sync, Move, Remove, Add, Guard, Update, Replace, Prevent, or equivalent;
- identify the state, object, function, or behavior being changed;
- state the intended result when the action alone could be ambiguous;
- do not use vague actions such as "check", "investigate", "review", "look into", "fix the issue", or "adjust as needed";
- do not restate the Issue;
- must remain advisory;
- never invent a fix when repair evidence is insufficient.

Good:

```text
Clear arena session ownership at match cleanup so the arena returns to an available state.
```

Bad:

```text
Investigate the cleanup logic and fix the issue.
```

### Relevant Code

Purpose: point to where the developer should inspect first.

Rules:

- maximum three primary locations;
- each reason maximum 180 characters;
- prefer precise authored source locations.

### Must Preserve

Purpose: state proven repair invariants.

Rules:

- each item maximum 160 characters;
- include only supported invariants;
- do not use as a generic checklist.

## Density limits

These limits apply to newly created reports. Compatibility imports remain readable even when older reports exceed them.

| Field | Limit |
|---|---:|
| Title | 90 chars |
| Problem | 220 chars |
| Expected | 180 chars |
| Observed | 180 chars |
| Reproduction step | 160 chars |
| AI Analysis | 420 chars |
| Suggested Fix | 220 chars |
| Relevant Code reason | 180 chars |
| Must Preserve item | 160 chars |

## Duplication rule

After whitespace normalization, these fields must not be exact duplicates of one another:

- Problem
- Expected
- Observed

The same fact may be related across fields, but each field must perform its own role.

## Ownership

- `COPY.md` owns wording quality.
- `copy-quality.ts` owns deterministic enforcement for newly created reports.
- `PREVIEW.md` owns presentation hierarchy.
- Bug Report V2 remains the only persisted report format.

Do not duplicate these rules in UI, agent skills, or workspace documentation. Those surfaces should reference this contract.
