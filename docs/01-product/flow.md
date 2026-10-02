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
→ Multi-source Gameplay Surface Inventory
→ Gameplay Discovery Closure
→ Gameplay Contract + State / Boundary Reconstruction
→ Gameplay Model Closure
→ Risk-directed Analysis
→ Actual Behavior
→ Contradiction + Early Counter-Evidence
→ Exact-work Deduplication / Corroboration
→ Confirmed Defect
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Production Report
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

Surface accounting is bounded: it proves that discovered mechanics were not silently skipped, not that every possible mechanic in the map was discovered.

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

## Usage scenarios

### Audit only

```text
Selected .mcworld
→ inspect
→ Discovery Closure
→ Gameplay Model Closure
→ diagnose
→ Proposed Bug Set
→ STOP
```

Use when the goal is to find/classify issues only.

### Audit + report

```text
Audit only
→ review/approve proposed bugs
→ Bug Report V2
→ chat preview / HTML client report
→ STOP
```

Do not publish a comprehensive report while Discovery Closure or Gameplay Model Closure is OPEN.

### Approved repair

```text
Approved Bug
→ Must Change + Must Preserve
→ authorized repair
→ targeted verification
→ regression/preservation verification
→ updated report state
```

Do not use repair reasoning to decide whether a candidate is a bug.

### New map version

Treat the new selected artifact as a new current gameplay truth. Rebuild discovery, intent, closure, and contradiction evidence. Prior results may inform calibration but do not become current gameplay authority.

### Runtime-only validation

Static/package analysis records the unresolved claim and exact verification scenario. Escalate only that residue to LOCAL_MINECRAFT/LIVE_MINECRAFT.

### Detection Gap

Record the unsupported surface as Detection Gap and hand it to Detection Development. Do not silently add map-specific production rules inside the active audit.
