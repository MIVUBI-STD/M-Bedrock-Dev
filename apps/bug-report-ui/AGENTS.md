# Bug Report UI Rules

Applies to `apps/bug-report-ui/`.

The UI is a projection/client of canonical Bug Report V2, not a second report system. Canonical persisted state lives in `workspace/projects/<project-id>/report/` and its semantics live in `engine/packages/bug-report/`.

## Canonical references

- wording quality: `../../engine/packages/bug-report/COPY.md`
- presentation hierarchy: `../../engine/packages/bug-report/PREVIEW.md`
- semantic contract: `../../engine/packages/bug-report/README.md`

## UI rules

- Reuse shared bug-report projection helpers when a signal already exists there.
- Do not duplicate severity counts, ordering rules, or preview semantics locally.
- Keep Issue, Bug Trigger (In-Game), and supported Solution visible before secondary metadata or technical detail.
- Category and Found By are secondary.
- Exclude fixed bugs from the primary audit surface.
- Default primary view is Blocker + Major; Minor is explicit detail-on-demand.
- Bug Trigger (In-Game) must be player-facing and code-free.
- Schema-valid compatibility reports may be read, but readiness or copy-quality gaps must be surfaced. Imported files remain read/export-only and never become canonical through the UI.
- Omit empty sections.
- Do not expose diagnostic internals.
- Do not persist independent bug status, history, or identity in UI-owned storage.
- Do not treat imported legacy files as canonical; they remain review/migration input until promoted through the engine contract.
- Do not add project-management surfaces such as boards, comments, assignment, approval, or activity feeds.

If a UI requirement conflicts with canonical report semantics, preserve the canonical report and change only the projection.
