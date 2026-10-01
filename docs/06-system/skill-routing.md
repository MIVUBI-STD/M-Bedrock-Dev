# Skill Routing

Skills are routed on **two dimensions**:

1. **Work lane** — what kind of job is being performed.
2. **Domain specialist** — what semantic owner is needed for one decision.

Do not use a domain skill to infer the work lane.

## Work lanes

### 1. Operational Map Audit

`m-bedrock-map-bug-audit`

Use to find/classify bugs in a map with current capabilities.

Allowed:
- inspect artifact;
- reconstruct design/intent;
- run current analyzers;
- classify findings;
- identify detection gaps.

Forbidden:
- improving analyzers/rules/knowledge during the audit;
- turning unsupported capability into a defect.

### 2. Detection Development

`m-bedrock-detection-development`

Use to improve M-Bedrock-Dev bug-finding capability.

Allowed:
- parser/analyzer/knowledge/rule/model/diagnostic/proof improvements;
- reduced fixtures;
- reusable capability changes.

Forbidden:
- treating a production Bug Report as development completion;
- map-specific hardcoded logic.

### 3. Detection Benchmark

`m-bedrock-detection-benchmark`

Use to measure current capability against frozen expectations.

Allowed:
- regression/golden evaluation;
- false-positive/negative classification;
- proof/coverage/cost measurement.

Forbidden:
- changing production implementation;
- changing expectations to fit current output.

### 4. Target Repair

`m-bedrock-target-repair`

Use only for an Approved Bug or an explicit intentional modification that requires target source/artifact mutation.

## Domain specialists

Artifact/container/workspace/package:
→ `m-bedrock-artifact-engineering`

Manifest/function/command/reference/semantic analysis:
→ `m-bedrock-content-analysis`

Version/edition/API/capability:
→ `m-bedrock-compatibility`

Cross-owner ambiguity:
→ `m-bedrock-cross-owner-routing`

## Routing algorithm

```text
user goal
→ choose one work lane
→ identify current semantic decision
→ consult at most one domain specialist
→ return typed result to lane
→ continue lane
```

A lane remains active across domain handoffs. Do not replace Map Audit with Detection Development automatically when a detection gap appears.

## Handoff contracts

### Map Audit → Detection Development

Emit:

```text
Detection Gap
- unsupported claim/evidence
- seed artifact/reference
- current proof ceiling
- likely canonical owner
- smallest reproduction
- audit impact
```

Then STOP that claim in the audit.

### Detection Development → Benchmark

Emit:

```text
Detection Capability Delta
- gap class
- owner changed
- generalized behavior added
- fixture/expectation
- expected before/after difference
- remaining proof residue
```

### Benchmark → Map Audit

Benchmark does not automatically reopen a map audit. A new operational run must consume the verified capability.

## Separation rule

```text
USE detection capability != DEVELOP detection capability != BENCHMARK detection capability
```

Never combine all three in one implicit skill flow.


## Development naming

`DEVELOP` alone means generic Product Development unless the goal is explicitly to improve bug-detection correctness/coverage.

```text
add/change product feature
→ Product Development execution contract

make bug finding smarter/more accurate
→ Detection Development
```

Read `skill-contract.md` for the mandatory lane structure.


## Permission preflight

Work-lane routing and mutation authority are separate decisions.

Before write/network/live execution:

```text
active lane
→ planned action + resource/path
→ lane permission preflight
→ allow / ask / deny
```

- `allow`: continue within the active lane.
- `ask`: obtain the required explicit approval or execution-context escalation.
- `deny`: stop that action; do not switch lanes implicitly.

A domain specialist cannot override a denied lane permission.
