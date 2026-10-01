# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

## Purpose

Use current stable capabilities to find and classify gameplay-relevant defects in a Minecraft Bedrock/Education map.

This lane consumes analyzers, Platform Knowledge, Platform Rules, Map Game Design, Behavior Contracts, package/runtime evidence, and tester evidence. It does not improve those capabilities during the audit.

## Entry criteria

Use this lane when the requested outcome is a map-specific answer such as:

- find bugs;
- retest a map;
- explain a suspected gameplay issue;
- classify Blocker/Major/Minor defects;
- compare observed behavior with intended map behavior.

A map/artifact may be incomplete. That does not justify switching to development.

## Allowed actions

- inspect artifact identity and target profile;
- reconstruct Map Game Design / Gameplay Intent;
- run current static/native/runtime analyzers;
- consult Platform Knowledge / Rules;
- compare current Behavior Contracts;
- classify findings and proof ceilings;
- record manual checks and known limits;
- emit a capability-gap handoff.

## Forbidden actions

- modify parser/analyzer/knowledge/rule/proof capability;
- add fixtures for a new detector while audit is active;
- change expected behavior to make a finding disappear;
- mutate the original artifact;
- treat unsupported analysis as a defect;
- silently switch into Detection Development.

## Audit pipeline

```text
Artifact identity / target profile
→ Map Game Design + authored intent
→ relevant static/source/native evidence
→ Platform Knowledge / Rules
→ Behavior Contract comparison
→ package/runtime evidence when available
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

Use Bug Report severity only for sufficiently grounded defects:

- **Blocker** — blocks game/progression or makes intended gameplay impossible.
- **Major** — materially disrupts gameplay or core flow.
- **Minor** — limited disruption while viable intended flow remains.

Detection-development priority is a separate concept.

## Output contract

For every in-scope candidate record:

```text
Candidate
Disposition
Expected behavior authority
Observed/static evidence
Platform fact/rule used
Proof ceiling
Bug severity (defect only)
Uncertainty / residue
Next owner (only when needed)
```

## Capability-gap handoff

When M-Bedrock-Dev cannot reliably inspect the claim, emit:

```text
Capability Gap
- unsupported claim/evidence
- seed artifact/reference
- smallest reproduction
- current proof ceiling
- likely canonical owner
- audit impact
- manual fallback, if any
```

Then STOP that claim.

A capability gap may start a separate `m-bedrock-detection-development` run later. It never changes the active lane automatically.

## Manual checks and known limits

Read only when relevant:

- `references/manual-checks.md`
- `references/known-limits.md`

Manual checks are explicit higher-cost/human/runtime residues, not hidden analyzer behavior.

## Domain specialist routing

- artifact/container/world extraction → `m-bedrock-artifact-engineering`
- source/commands/references/semantic derivation → `m-bedrock-content-analysis`
- version/edition/Script API capability → `m-bedrock-compatibility`
- proven target defect requiring mutation → hand off to `m-bedrock-repair-engineering`

## Proof ceiling

Use exactly:

`STATIC VERIFIED / PACKAGE VERIFIED / LOCAL GAME VERIFIED / LIVE GAME VERIFIED / UNKNOWN`.

Static/package evidence never becomes runtime proof by wording.

## Handoff

Audit may hand off to:

- Detection Development for `capability-gap`;
- Target Repair for a reproduced defect;
- runtime/manual validation for `runtime-proof-required`.

Do not perform the handed-off work inside this lane.

## STOP

Stop when every in-scope candidate has a disposition, proof ceiling, severity when applicable, and explicit residue/handoff.
