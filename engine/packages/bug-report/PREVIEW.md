# Bug Report Preview Contract

Canonical Bug Report V2 owns facts. Preview owns readability.

The preview layer MUST NOT add, alter, infer, or persist bug facts. It is a projection of the canonical report for fast human and ChatGPT reading.

## Reader goal

A reader should understand within one scan:

1. what is broken;
2. how severe it is;
3. what action is supported;
4. whether deeper evidence is available.

The default preview is intentionally concise. Do not dump canonical JSON unless explicitly requested.

## Information hierarchy

### Level 1 — report signal

Show only:

```text
Map · Version · Tested Version · Repair owner
Open · Blocker · Major · Minor · Fixed
```

Do not show schema IDs, internal provenance, evidence graph identifiers, semantic keys, repair-unit IDs, diagnostic routing, or cache state.

### Level 2 — issue signal

Every visible bug begins with:

```text
[SEVERITY] BUG-ID — Short title
Issue: concrete gameplay failure
Action: supported repair action, when recorded
```

This is the minimum useful repair handoff.

Rules:

- one title = one primary failure;
- title is short, concrete, and scannable;
- Issue states the player/game failure, not the investigation history;
- Action comes only from canonical Suggested Fix;
- never invent an Action when Suggested Fix is absent;
- severity is always visible;
- fixed bugs are hidden by default.

### Level 3 — evidence

Standard preview adds:

```text
Expected
Observed
Reproduce
```

Fact precedes interpretation.

### Level 4 — technical context

Full preview may additionally show:

```text
Technical
Relevant Code
Must Preserve
```

Technical context is secondary. It must never bury the Issue or Action.

## Modes

### summary

Use for status checks, multi-map scans, or large reports.

Show:

- report signal;
- Severity + ID + Title;
- Issue;
- Action when available.

### standard — default

Use for normal ChatGPT report presentation.

Show summary plus:

- Expected;
- Observed;
- Reproduction when available.

Do not show Technical, Relevant Code, or Must Preserve unless needed.

### full

Use only when the user asks for full detail, root-cause context, or repair implementation context.

Show all supported preview fields.

## Ordering

Visible bugs are deterministic:

```text
Blocker → Major → Minor → Bug ID
```

Open bugs are the default scope. Fixed bugs appear only when explicitly requested or when no open bugs remain and historical context is requested.

## Wording dependency

Preview does not rewrite canonical bug copy.

All new-report wording rules and density limits are owned by `COPY.md` and enforced by `copy-quality.ts`. Presentation code may normalize whitespace for display, but must not paraphrase or repair report facts.

## Ownership

- Bug Report V2: source of truth.
- `projectBugReportPreview()`: structured projection.
- `renderBugReportPreviewMarkdown()`: compact text projection.
- ChatGPT/CLI/UI may consume the projection.
- Preview output is never persisted as a second report format.
