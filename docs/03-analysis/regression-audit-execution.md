# Regression Audit Execution

## Status

This is the execution protocol for validating the frozen detection architecture against real selected-map evidence.

It does not add detection taxonomy.

## Regression order

1. Attack Challenge v1.1.1
2. Defense Challenge v1.1.1
3. Composite Challenge v1.1.1

Historical Bug Report V2 files and the regression corpus are comparison references only. They are not proof for the independent pass.

## Independent pass rule

For each map:

```text
selected artifact evidence
→ TARGET
→ DISCOVERY
→ Coverage Ledger
→ Mutable-State Reverse Index
→ Referential Integrity
→ Applicable Check Router
→ Automatic Crosschecks
→ MODEL
→ Multi-Scenario / connection simulation
→ Adversarial Gameplay QA
→ STRESS
→ Claim-Based PROVE
→ Coverage + Scenario + Abuse gates
→ independent finding set
```

Do not seed historical issue IDs, titles, reproduction steps, or root-cause conclusions into the independent pass.

## Comparison phase

Only after the independent finding set is closed:

```text
independent findings
× regression-detection-corpus.json
× approved historical Bug Report V2
→ recall assessment
```

For every expected regression case record:

```text
Case ID
Detected independently
Detected proof state
Equivalent root cause
Equivalent player contract
Expected check reached
Expected Crosscheck generated
If missed: earliest failure stage
If NEED_VALIDATION: exact missing claim
```

## Miss classification

A miss is exactly one:

```text
DISCOVERY_MISS
ROUTING_MISS
CROSSCHECK_MISS
MODEL_MISS
SCENARIO_MISS
ADVERSARIAL_MISS
PROOF_MISS
DEDUP_MISS
REPORT_MISS
```

Fix the earliest failing mechanism. Do not add a new taxonomy layer when the defect fits an existing mechanism.

## Quality metrics

Per map and combined:

```text
Material Surface Routing %
Mutable Resource Ownership %
Applicable Check Routing %
Required Crosscheck Generation %
Material Scenario Accounting %
Player-Controlled Surface Accounting %
Regression Cases Detected / Expected
PROVEN / Detected Findings
NEED_VALIDATION / Detected Findings
Generic NEED_VALIDATION count
False-positive count
Duplicate root-cause count
Unaccounted material surfaces
Unaccounted mutable resources
Unaccounted material interleavings
Unaccounted player-controlled surfaces
```

## Acceptance

A regression pass is structurally complete only when:

- unaccounted material surfaces = 0;
- unaccounted mutable resources = 0;
- unaccounted material interleavings = 0;
- unaccounted player-controlled surfaces = 0;
- generic NEED_VALIDATION = 0;
- every retained NEED_VALIDATION has exact claim closure and one narrow deciding question;
- every regression miss has an earliest failure-stage explanation;
- no retained finding lacks a grounded player-visible contradiction.

Recall is measured honestly. It is not forced to 100% by copying historical answers.
