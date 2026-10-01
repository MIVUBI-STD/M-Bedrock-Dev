# Product Flow

## Single source of truth

For gameplay audit, **one selected map version is the only current source of truth**.

```text
explicit selected .mcworld
or single current root .mcworld
→ Selected Map Version
```

Older versions, Development/Source, old QA/Bug Reports, Technical Docs, changelogs, other maps, and external documents are archive/reference only.

## Canonical flow

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Gameplay Contract
→ Actual Behavior
→ Coverage Check
→ Confirmed Defect
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Repair Contract
→ Authorized Repair
→ Verify Defect + Preserve Gameplay
```

## Terms

| Term | Meaning |
|---|---|
| Selected Map Version | exact current artifact being audited; sole current gameplay truth |
| Gameplay Contract | scoped expected behavior derived only from that artifact |
| Actual Behavior | what that same artifact can/do actually perform |
| Confirmed Defect | proven contradiction inside that same version |
| Approved Bug | confirmed defect explicitly approved for report/repair |
| Repair Contract | Must Change + Must Preserve |
| Authorized Repair | Approved Bug/design change + Repair Contract + current proof |

## Audit rule

Expected Behavior and Actual Behavior must come from the **same selected map version**.

If the artifact does not contain enough evidence to determine intended behavior for a mechanic, keep it `UNKNOWN / BLOCKED`. Do not read older versions or external documents to fill the gap.

Historical material may be consulted only when the user explicitly asks for comparison/history. It never silently changes the current audit truth.

## Repair rule

Bug repair starts only from an Approved Bug.

```text
Approved Bug
+ Repair Contract
  - Must Change
  - Must Preserve
→ mutation
→ defect verification
→ preservation verification
```

A repair is incomplete if the symptom disappears but intended gameplay in the selected version is damaged.