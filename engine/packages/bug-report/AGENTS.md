# Bug Report Package Rules

Applies to `engine/packages/bug-report/`.

## Authority

Keep one source of truth per concern:

- persisted V2 semantics: `src/v2.ts` and the V2 schema;
- new-report wording: `COPY.md` and `src/copy-quality.ts`;
- AI Bug Trigger authoring: `src/bug-trigger.ts`;
- tester readiness: `src/report-readiness.ts`;
- human / ChatGPT presentation: `PREVIEW.md` and `src/preview.ts`;
- confirmation and promotion: the existing confirmation / promotion modules.

Do not create parallel report formats, duplicate Markdown reports, or competing wording / preview policies.

## Change rules

- Preserve Bug Report V2 compatibility unless an explicit schema migration is requested.
- Compatibility imports may remain more permissive than new-report creation.
- New report creation must pass tester readiness and copy quality.
- Preview code must never mutate, infer, or persist report facts.
- Suggested Fix is the only source for preview Solution.
- Internal diagnostic IDs, proof plumbing, semantic keys, repair-unit IDs, cache state, and orchestration data stay out of normal preview.
- UI and agent skills should reference `COPY.md` / `PREVIEW.md` instead of redefining their rules.


## Layer boundary

- Internal Detection proves the defect and owns diagnostics/evidence.
- Tester-Facing Report owns Bug, Issue, Severity, Bug Trigger (In-Game), and supported Solution.
- Repair Detail owns Expected, Observed, Technical Analysis, Relevant Code, Must Preserve, and repair context.
- Confirmed does not automatically mean tester-ready.
- Never use technical analysis as a substitute for Bug Trigger (In-Game).
- AI routes must use evidence-bound `BugTriggerDraft`; raw AI reproduction arrays are not a valid authoring path.
- AI Bug Trigger drafts must declare a gameplay basis and include matching gameplay evidence; source-code contradiction alone is not gameplay provenance.

## Reader priority

Default ChatGPT preview uses one compact two-column table per bug:

```text
# + Severity | Bug title
Issue | gameplay problem + impact
Bug Trigger (In-Game) | exact tester actions + visible wrong result
Solution | supported change
```

Do not expand every bug vertically unless full detail is explicitly requested. Do not optimize for exhaustive prose at the expense of scan clarity.
