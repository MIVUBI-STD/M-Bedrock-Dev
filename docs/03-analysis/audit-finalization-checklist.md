# Audit Finalization Checklist

## Purpose

Final review before a gameplay bug report is considered ready.

## Core understanding

- [ ] Selected world version is defined.
- [ ] Game Design Reconstruction completed.
- [ ] Gameplay Flow mapped from entry to completion.
- [ ] State transitions reviewed, including alternate and failure exits.
- [ ] Reset and preserve rules identified.
- [ ] Progression rules identified.

## Multiplayer / Multi Arena

- [ ] Multiplayer rules reviewed when applicable.
- [ ] Visible arena count and actual concurrent capacity compared.
- [ ] Capacity boundary and capacity + 1 behavior reviewed.
- [ ] Queue/admission behavior and player feedback reviewed.
- [ ] Simultaneous-start behavior reviewed when multiple arenas exist.
- [ ] Cross-arena isolation reviewed.
- [ ] Cleanup and second-run/reuse behavior reviewed.

## Blind-spot gates

- [ ] Hidden limitations / player expectation mismatches reviewed.
- [ ] Softlock paths reviewed.
- [ ] Recovery paths reviewed.
- [ ] Boundary scenarios reviewed.
- [ ] Multiplayer scaling/authority reviewed when applicable.
- [ ] Cross-system interactions reviewed for applicable systems.
- [ ] Race / simultaneous terminal conditions reviewed.
- [ ] Content-contract mechanics verified against actual behavior.
- [ ] Player feedback/observability reviewed for material limitations.
- [ ] Persistence save/reset/restore boundaries reviewed.
- [ ] Spatial containment/world mutation reviewed when applicable.
- [ ] Entity lifecycle/disappearance semantics reviewed when applicable.
- [ ] Inventory/economy/UI/cinematic/effects/permissions reviewed when used.
- [ ] Gameplay-significant performance/platform constraints reviewed when applicable.

## Coverage accounting

- [ ] Every applicable audit surface is recorded as checked, blocked, or not-applicable.
- [ ] Blocked surfaces include a reason.
- [ ] Not-applicable surfaces include a reason.
- [ ] Unsupported/unparsed mechanics are recorded as Detection Gap.
- [ ] Selected artifact remains the only gameplay authority.
- [ ] No archive/old-version evidence was used to infer current gameplay.

## Bug quality

- [ ] Every bug has a Bug ID.
- [ ] Every bug is connected to gameplay flow.
- [ ] Confirmed bugs have player impact.
- [ ] Confirmed bugs have cleared counter-evidence.
- [ ] Confirmed bugs have tester-ready reproduction.
- [ ] Reproduction uses tester language.
- [ ] Expected and Actual behavior are clear.
- [ ] Proof ceiling is recorded.

## Report output

- [ ] Dashboard generated.
- [ ] Confirmed Bugs separated from Needs Validation, Ambiguous, and Detection Gap.
- [ ] Coverage recorded.
- [ ] HTML follows Bug Report V2 layout.

## STOP

Do not publish a final report until all applicable surfaces are accounted for. A clean happy path is not sufficient evidence that the audit is complete.
