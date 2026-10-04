# Bug Tracker Golden UI Contract

## Status

This file is the visual and interaction authority for the consolidated tester-facing Bug Tracker workspace.

Do not redesign this surface during report generation. New report data must be projected into the same DOM hierarchy, spacing, colors, controls, and interaction states.

## Reproduction rule

A new Bug Tracker document must preserve this contract exactly. Data changes; UI structure does not.

Canonical projection:

```text
Bug Report data
+ project/map source binding
+ tester workspace state
→ Golden Bug Tracker renderer
→ standalone HTML workspace
→ Export JSON / Export HTML Snapshot
```

The renderer must never infer a second visual system from report content.

## Golden visual hierarchy

```text
Bug Tracker Report
→ 2 × 2 summary
→ severity strip
→ Jump to Game (two-column grid on normal mobile width)
→ Map header (navy, collapsed by default)
→ Level/source card
→ Bugs
→ Design Mismatches
→ Issue cards
→ Expanded issue detail
→ Tester Notes
→ Evidence Attachments
→ Mark Fixed
```

### Header

- Title: `Bug Tracker Report`.
- No repository/project eyebrow above the title.
- Summary is a 2 × 2 grid.
- Jump to Game uses compact bordered navigation cards.

### Map

- Every map is collapsed by default.
- Map header uses the established navy surface.
- Closed action: `Expand Map ↓`.
- Open action: `Collapse Map ↑`.
- Opening a map must not enlarge the map title, metadata, or source card.
- Jump to Game opens the selected map and scrolls to it.
- Map content remains visually attached to its map header.

### Multi-level maps

Levels are children of one map, never independent map cards.

Each level has:
- a clear `LEVEL N` badge;
- version;
- its own source binding;
- its own Bugs and Design Mismatches sections;
- a strong neutral separator before the next level.

Do not use a second navy map header for a level.

### Source card — mandatory

Every level/map source card must show, in this order:

1. version;
2. `SOURCE`;
3. two equal bordered buttons:
   - `Drive Folder ↗`
   - `World File ↗`
4. exact world filename;
5. compact issue counts when available.

Drive Folder and World File are mandatory source bindings. Do not downgrade them to plain text links.

### Issue card — collapsed

Golden state:
- white card;
- thin neutral border;
- compact padding;
- issue number;
- severity pill;
- verification status at top-right;
- title;
- issue ID;
- `View Details ↓`.

Do not scale issue cards up on mobile.

### Issue card — expanded

Expanded content must remain ONE continuous rounded issue card.

Do not create a visually detached detail panel.

Expanded state:
- soft blue background/tint;
- stronger blue border;
- same card geometry;
- `Collapse Details ↑` in the same action position;
- no `OPEN` badge;
- no floating minus control;
- no detached blue rail;
- no oversized toolbar.

Detail order:

```text
Issue
How to Reproduce
Observed / Evidence
Expected
Resolution
Tester Notes
Evidence Attachments
Mark Fixed
```

### State colors

```text
white       = idle / collapsed
soft blue   = currently expanded / active
amber       = Needs Verify
soft green  = tester marked Fixed
```

A fixed card is green as one continuous unit. Expanded + Fixed stays green; it must not revert to blue.

### Verification naming

Use only:
- `VERIFIED`
- `NEEDS VERIFY`
- `✓ FIXED`

Severity:
- `BLOCKER`
- `MAJOR`
- `MINOR`

Issue type:
- `BUG`
- `DESIGN MISMATCH`

No internal audit terminology, prompt text, reasoning traces, or orchestration vocabulary may appear in the visible UI.

## Tester workspace

Per issue:
- Tester Notes;
- evidence images;
- paste from clipboard;
- drag and drop;
- browse;
- image preview;
- optional caption;
- remove attachment;
- Mark Fixed.

Workspace state is separate from canonical issue facts.

## Export / import

The workspace must support:
- Export JSON;
- Export HTML Snapshot;
- Import JSON;
- Reset Tester Data.

Export JSON contains the complete report package plus tester state.

Export HTML Snapshot contains the same report content and current tester state in one standalone file.

## Data authority

HTML and JSON must have the same unique issue IDs and counts.

Generation fails when:
- duplicate issue ID exists;
- map/level source binding is missing;
- Drive Folder is missing;
- World File is missing;
- issue type is invalid;
- severity is invalid;
- HTML and JSON issue counts differ.

## Prompt-leak gate

Visible UI must fail generation if it contains internal prompt/instruction/reasoning language. UI copy is tester-facing only.

## Empty-template rule

The golden template stored in the repository contains no project/map/issue data and no tester state. It is a reusable presentation contract, not a sample report.

Do not commit screenshots, notes, fixed state, or report-specific issue content into the golden template.
