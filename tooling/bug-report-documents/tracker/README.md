# Bug Tracker Projection Pipeline

This directory is the deterministic bridge between canonical Bug Report data and the frozen Golden Bug Tracker presentation.

## Authority

```text
Bug Report V2      → issue facts
Project Registry   → artifact/version/Drive binding
Golden UI          → presentation
Tester Workspace   → local notes/images/fixed state only
```

No layer may duplicate another layer's authority.

## Flow

```text
BugReportClientDocument
+ workspace/project-registry.json
→ projectClientDocumentToTracker()
→ BugTrackerDocument
→ validateBugTrackerDocument()
→ Golden HTML renderer
→ exportBugTracker()
→ Bug-Tracker-Report.json
→ Bug-Tracker-Report.html
```

The output JSON and HTML must contain the same issue IDs.

## Files

- `model.ts` — small presentation projection model.
- `project.ts` — binds issue facts to the exact Project Registry source.
- `validate.ts` — hard pre-render gate.
- `export.ts` — deterministic JSON/HTML parity and output.
- `../golden/` — frozen visual contract and zero-data template.

## Validation

Generation fails on:
- duplicate issue ID;
- missing Drive Folder;
- missing World File;
- missing world filename;
- missing artifact fingerprint;
- missing reproduction;
- missing Observed/Expected;
- forbidden internal/prompt language in tester-facing fields;
- HTML/JSON issue-ID mismatch.

## Deliberate boundaries

This lane does not replace Bug Report V2.

It does not write tester state back into canonical issue facts.

It does not own audit discovery, proof, severity, or classification.

It does not introduce a UI framework or a second Drive registry.

## Integration plan

1. Keep the existing `render.ts` behavior intact while this lane is introduced.
2. Add the Golden HTML renderer against `BugTrackerDocument`.
3. Add a small deterministic fixture/snapshot test.
4. Route approved Bug Report V2 client projection through this lane.
5. Only after parity is proven, remove redundant legacy presentation code.

Do not perform steps 4–5 until the Golden renderer and regression fixture pass.
