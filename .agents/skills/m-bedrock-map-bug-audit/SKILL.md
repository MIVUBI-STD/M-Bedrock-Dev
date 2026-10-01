# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

Use when the goal is to inspect a Minecraft Bedrock/Education map and find gameplay-relevant defects using capabilities that already exist.

This skill is the operational counterpart to capability development. It **consumes** analyzers, Platform Knowledge, Platform Rules, Behavior Contracts, and runtime evidence. It does not improve those systems during the audit.

## Goal

Answer:

1. What behavior/design is expected?
2. What implementation/runtime evidence exists?
3. Is there a real defect, designed behavior, ambiguity, or evidence gap?
4. What is the smallest evidence-backed severity?
5. What still requires higher-context runtime proof?

## Audit pipeline

```text
Artifact identity / target profile
→ Map Game Design + authored intent
→ relevant static/source evidence
→ Platform Knowledge / Rules
→ Behavior Contract comparison
→ runtime/package evidence when available
→ defect classification
→ report
→ STOP
```

## Finding dispositions

Every investigated candidate ends in exactly one disposition:

- `defect`
- `designed-behavior`
- `ambiguous-intent`
- `insufficient-evidence`
- `runtime-proof-required`
- `capability-gap`

Do not convert `capability-gap` into a defect.

## Defect severity

Use project Bug Report severity only for confirmed/sufficiently grounded defects:

- **Blocker** — blocks game/progression or makes the intended experience impossible.
- **Major** — materially disrupts gameplay or core flow.
- **Minor** — limited disruption with a viable intended flow remaining.

Development priority is a different concept and must not use these labels.

## Capability-gap handoff

When the engine cannot reliably inspect something:

1. describe the unsupported evidence/semantic;
2. record the cheapest reproducing evidence;
3. name the likely canonical owner;
4. mark `capability-gap`;
5. STOP operational audit work on that claim.

Do **not** add parser/analyzer/knowledge/rule/proof logic while this skill is active.

Hand off to `m-bedrock-capability-development` only as a separate work lane.

## Domain specialist routing

Consult only the smallest relevant specialist:

- artifact/container/world extraction → `m-bedrock-artifact-engineering`
- manifests/functions/commands/references/semantic derivation → `m-bedrock-content-analysis`
- version/edition/Script API capability → `m-bedrock-compatibility`
- reproduced defect requiring map/source change → after audit, hand off to `m-bedrock-repair-engineering`

Do not preload all specialists.

## Proof ceiling

Use the repository proof vocabulary exactly:

`STATIC VERIFIED / PACKAGE VERIFIED / LOCAL GAME VERIFIED / LIVE GAME VERIFIED / UNKNOWN`.

Static findings must not be phrased as runtime proof.

## Never

- modify engine capability while auditing the map;
- mutate the original artifact;
- convert generic Engineering Contracts into Map Game Design;
- use Minecraft Platform Knowledge as proof of intended map behavior;
- call a suspicious pattern a defect without design/evidence grounding;
- broaden the audit because a new capability idea appears.

## Completion

Operational audit is complete when all in-scope candidates have a disposition, evidence ceiling, severity when applicable, and explicit higher-context residue.

Then STOP.
