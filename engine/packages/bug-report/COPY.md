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

### Problem

Purpose: state the concrete gameplay impact.

Rules:

- maximum 220 characters;
- describe the failure and relevant impact;
- do not repeat Expected or Observed verbatim;
- do not include investigation history.

Good:

```text
A completed arena remains owned by the previous session, preventing the next match from starting.
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

### Reproduction

Purpose: provide the shortest reliable path to the failure.

Rules:

- each step maximum 160 characters;
- one action or state transition per step;
- omit when no valid reproduction exists and the route does not require one.

### AI Analysis

Purpose: concise technical interpretation.

Rules:

- maximum 420 characters;
- explain the technical basis, not the entire proof history;
- do not repeat Problem;
- internal evidence graph IDs and orchestration details are forbidden.

### Suggested Fix

Purpose: supported repair direction.

Rules:

- maximum 220 characters;
- state the repair action directly;
- must remain advisory;
- never invent a fix when repair evidence is insufficient.

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
