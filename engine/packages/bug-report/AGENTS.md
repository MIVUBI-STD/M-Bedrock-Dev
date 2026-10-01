# Bug Report Package Rules

Applies to `engine/packages/bug-report/`.

## Authority

Keep one source of truth per concern:

- persisted V2 semantics: `src/v2.ts` and the V2 schema;
- new-report wording: `COPY.md` and `src/copy-quality.ts`;
- human / ChatGPT presentation: `PREVIEW.md` and `src/preview.ts`;
- confirmation and promotion: the existing confirmation / promotion modules.

Do not create parallel report formats, duplicate Markdown reports, or competing wording / preview policies.

## Change rules

- Preserve Bug Report V2 compatibility unless an explicit schema migration is requested.
- Compatibility imports may remain more permissive than new-report creation.
- New report creation must pass copy quality.
- Preview code must never mutate, infer, or persist report facts.
- Suggested Fix is the only source for preview Solution.
- Internal diagnostic IDs, proof plumbing, semantic keys, repair-unit IDs, cache state, and orchestration data stay out of normal preview.
- UI and agent skills should reference `COPY.md` / `PREVIEW.md` instead of redefining their rules.

## Reader priority

Default ChatGPT preview is a compact table:

```text
Severity | Bug | Issue | Solution
```

Do not expand every bug vertically unless full detail is explicitly requested. Do not optimize for exhaustive prose at the expense of scan clarity.
