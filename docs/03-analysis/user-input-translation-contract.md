# User Input Translation Contract

## Purpose

User prompts may be incomplete, informal, ambiguous, technically inaccurate, or mix symptoms, assumptions, requests, and examples.

The audit must preserve useful search intent without turning user wording into gameplay truth.

Canonical boundary:

```text
raw user prompt
→ bounded intent translation
→ search pressure / scope / presentation constraints
→ selected-map audit
→ selected-artifact evidence decides truth
```

The prompt is never a second gameplay authority.

## Intake classes

Translate every material user statement into one or more of these classes:

| Class | Meaning | May influence |
| --- | --- | --- |
| TARGET_HINT | map/version/file hint | target resolution only |
| SYMPTOM_REPORT | observed or reported player symptom | search priority, scenario selection |
| SUSPICION | suspected subsystem/root cause | search priority only |
| EXPECTATION_CLAIM | user says what should happen | hypothesis only until grounded from selected artifact |
| DESIGN_CLAIM | user states intended design/capability | hypothesis only until authored/player-facing evidence grounds it |
| TEST_CONSTRAINT | e.g. do not brute-force, avoid broad manual testing | proof strategy |
| SCOPE_REQUEST | e.g. multi-arena, inventory, progression | search-priority boost, never exclusion of discovered material surfaces |
| OUTPUT_REQUEST | report/chat/HTML preference | presentation only |
| HISTORICAL_REFERENCE | old bug/map/version/example | historical search pressure only |
| EXCLUSION_REQUEST | explicit user request not to inspect a domain | presentation/work preference only; cannot suppress material selected-artifact evidence needed for correctness |

## Authority levels

```text
selected-artifact evidence
> grounded authored/player-facing evidence
> runtime evidence bound to selected artifact/profile
> user-reported symptom
> user suspicion / design claim / historical example
```

A lower authority input may tell the audit where to look.
It may not prove Expected, Actual, BUG, DESIGN_MISMATCH, severity, safety, or absence.

## Translation rules

### Preserve uncertainty

Do not silently strengthen:

```text
"kayaknya inventory ilang"
→ symptom: possible item loss
NOT → inventory-loss bug exists

"multi arena error"
→ search pressure:
   capacity
   assignment
   parallel start
   isolation
   cleanup/reuse
NOT → multi-arena bug confirmed
```

### Expand vague symptoms into bounded search families

Translate user wording into a small relevant hypothesis set, not one guessed root cause.

Examples:

```text
"wave stuck"
→ progression accounting
→ actor lifecycle
→ chunk/residency
→ deferred work
→ terminal transition

"item hilang / duplicate"
→ grant/consume
→ reset
→ restore ownership
→ reconnect/death recovery
→ idempotency/generation

"arena kadang silang"
→ assignment
→ player/state selector scope
→ entity/world mutation scope
→ reward/message/audio scope
→ cleanup/reuse

"game tidak selesai"
→ completion tracker
→ required actor/work accounting
→ missing transition
→ terminal collision
→ cleanup/recovery
```

Expansion must remain bounded to mechanisms plausibly related to the symptom.

### Distinguish symptom from root cause

The user may name a cause incorrectly.

```text
"ticking area bug"
```

means:

```text
reported concern: remote simulation / progression may fail
suspected mechanism: ticking area
```

The audit must still inspect alternative selected-artifact causes such as entity lifecycle, spawn ownership, pathing, completion accounting, or capacity.

### Never narrow away discovered truth

User focus changes priority, not audit completeness.

```text
user asks "cek inventory"
+ selected artifact exposes material arena isolation risk
→ inventory gets priority
→ arena material surface still remains in canonical audit
```

### Negative instructions

Interpret phrases such as:

- "jangan test semuanya"
- "jangan trial error"
- "cari bug yang jelas"
- "jangan anggap semua anomali bug"

as proof-strategy constraints:

```text
static/source proof first
→ bounded causal search
→ runtime only for irreducible residue
→ Audit Obligation for unknowns
```

They must not mean suppress unresolved material evidence.

## Required translated envelope

The model-facing intake representation should contain:

```text
targetHints[]
symptoms[]
suspicions[]
expectationClaims[]
designClaims[]
priorityDomains[]
priorityPlayerFlows[]
testConstraints[]
outputPreferences[]
historicalHints[]
ambiguities[]
```

Every symptom/suspicion/claim should retain the user's original meaning and a normalized interpretation.

Do not invent missing detail.

## Target-hint reconciliation

`TARGET_HINT` may help identify which artifact/version the user means, but once production audit receives an exact `.mcworld`, that artifact identity is authoritative.

If the translated target hint materially conflicts with the exact selected artifact/version:

```text
target hint conflict
→ blockingAmbiguities[]
→ do not start production audit
```

Do not silently relabel the selected artifact to match user wording.

If the selected artifact already resolves the user's vague target wording without conflict, keep the hint as non-authoritative context and continue.

## Ambiguity handling

When several interpretations are plausible and all can be checked cheaply:

```text
retain alternatives
→ search all bounded alternatives
→ selected-artifact evidence resolves them
```

Ask the user only when ambiguity blocks target identity or changes the requested product outcome materially.

Do not ask merely because terminology is informal.

## Analysis-demand rule

Normalized priority domains may seed the first inspection pass with additional existing knowledge domains.

This is **additive only**:

```text
user priority demand
+
artifact/RIG discovered demand
→ union
→ canonical analysis
```

User input may cause relevant analyzers to run earlier. It may never remove RIG/artifact demand, mark another domain not applicable, authorize stage closure, or prove an issue.

The mapping must reuse the existing analysis-planner knowledge domains. Do not create a second prompt-specific analyzer registry.

The prompt-derived demand also does not enter gameplay `auditRevision`; changing search priority does not change selected-artifact truth. Any new evidence produced by additional analysis is what may change later audit state.

## Detection rule

User input may increase search pressure but may never create a reportable issue.

```text
user claim
→ hint
→ selected-artifact evidence
→ causal contradiction
→ counter-proof
→ confirmation-ready defect
→ NEED_VALIDATION / PROVEN
```

If the chain fails before causal contradiction:

```text
normal / disproved
or
Audit Obligation
```

Never force a user-reported symptom into the report.

## Completeness rule

Prompt intake must improve recall without reducing the canonical selected-map audit.

The engine must still discover material gameplay surfaces not mentioned by the user.

The success criterion is:

```text
understand what the user is trying to report
+ search the likely mechanisms early
+ still audit undisclosed material gameplay
+ never use user wording as proof
```
