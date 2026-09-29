# Bug Report

## Current format

`m-bedrock-bug-report/v2` is the canonical bug-tracker format.

User-facing flow:

```text
AUDIT → REPORT → FIX
```

V1 remains import-only compatibility. New reports and exports use V2.

## Canonical vocabulary

Frontend labels must keep the same meaning as persisted V2 fields.

| JSON field | UI label | Meaning |
|---|---|---|
| `mapVersion` | Map Version | Internal map version. |
| `baseVersion` | Base Version | Minecraft version the map was designed for. |
| `testedVersion` | Tested Version | Minecraft version used during the audit/test. |
| `repairBy` | Repair By | One repair owner for the whole report: ChatGPT or Developer. |
| `bugs` | Bugs | Confirmed bugs included in the repair report. |
| `fixed` | Fixed | Per-bug completion checkbox. |
| `severity` | Severity | Blocker, Major, or Minor. |
| `category` | Category | Primary failure category. |
| `foundBy` | Found By | AI or Tester. |
| `problem` | Problem | What is wrong. |
| `expected` | Expected | Intended behavior. |
| `observed` | Observed | What actually happens. |
| `reproduction` | Reproduction | Steps needed to reproduce the bug. |
| `aiAnalysis` | AI Analysis | AI technical interpretation; advisory. |
| `relevantCode` | Relevant Code | Small set of source locations worth inspecting. |
| `suggestedFix` | Suggested Fix | Advisory repair direction. |
| `mustPreserve` | Must Preserve | Behavior that the repair must not break. |

Do not introduce alternate workflow terms such as Open, Closed, Done, Verified, Repair Status, Do Not Break, or Repair With when the persisted V2 field already has a canonical term.

## Repair ownership

A report has one `repairBy` value. Individual bugs cannot have separate repair owners.

Per-bug `fixed` checkboxes exist only to prevent missed bugs and show report progress. Report completion is derived from all bug checkboxes; it is not stored separately.

## Language

All persisted report content and canonical UI labels are English.
