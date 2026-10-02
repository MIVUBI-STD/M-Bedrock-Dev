# Audit Finalization Checklist

## Purpose

Final review before a gameplay bug report is considered ready.

## Structure

- [ ] Selected world version is defined.
- [ ] Game Design Reconstruction completed.
- [ ] Gameplay Flow mapped from entry to completion.
- [ ] State transitions reviewed.
- [ ] Reset and preserve rules identified.
- [ ] Progression rules identified.
- [ ] Multiplayer rules reviewed when applicable.
- [ ] Multi Arena rules reviewed when applicable.
- [ ] Capacity and concurrency limits reviewed when applicable.
- [ ] Hidden limitations / player expectation mismatches reviewed.
- [ ] Softlock paths reviewed.
- [ ] Recovery paths reviewed.
- [ ] Boundary scenarios reviewed.
- [ ] Multiplayer scaling/authority reviewed when applicable.
- [ ] Content-contract mechanics verified against actual behavior.
- [ ] Player feedback/observability reviewed for material limitations.
- [ ] Persistence save/reset/restore boundaries reviewed.
- [ ] Gameplay-significant performance/platform constraints reviewed when applicable.

## Bug Quality

- [ ] Every bug has a Bug ID.
- [ ] Every bug is connected to gameplay flow.
- [ ] Confirmed bugs have player impact.
- [ ] Reproduction uses tester language.
- [ ] Expected and Actual behavior are clear.
- [ ] Evidence scope is from selected artifact.

## Report Output

- [ ] Dashboard generated.
- [ ] Confirmed Bugs separated from Needs Validation.
- [ ] Coverage recorded.
- [ ] HTML follows Bug Report V2 layout.

## STOP

Do not publish a final report until all required sections are complete.
