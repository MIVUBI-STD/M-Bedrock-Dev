# Bug Report UI Rules

Applies to `apps/bug-report-ui/`.

The UI is a projection of canonical Bug Report V2, not a second report system.

## Canonical references

- wording quality: `../../engine/packages/bug-report/COPY.md`
- presentation hierarchy: `../../engine/packages/bug-report/PREVIEW.md`
- semantic contract: `../../engine/packages/bug-report/README.md`

## UI rules

- Reuse shared bug-report projection helpers when a signal already exists there.
- Do not duplicate severity counts, ordering rules, or preview semantics locally.
- Keep Issue, Bug Trigger (In-Game), and supported Solution visible before secondary metadata.
- Category and Found By are secondary.
- Hide fixed bugs by default when open bugs exist.
- Bug Trigger (In-Game) must be player-facing and code-free.
- Omit empty sections.
- Do not expose diagnostic internals.
- Do not add project-management surfaces such as boards, comments, assignment, approval, or activity feeds.

If a UI requirement conflicts with canonical report semantics, preserve the canonical report and change only the projection.
