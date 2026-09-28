# M-Bedrock Review UI Wireframe and Layout Contract

Status: design reference only  
Date: 2026-09-28  
Target: future Svelte implementation

This contract translates the approved simple review-first information architecture into concrete layout rules. It is intentionally narrow: no visual branding system, no app shell framework, no component library decision, and no new product semantics.

## 1. Core layout principle

Desktop uses one selected map with a two-pane review surface.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ App header                                                           │
├──────────────────────────────────────────────────────────────────────┤
│ Map header                                                           │
├──────────────────────┬───────────────────────────────────────────────┤
│ Review list          │ Selected review item                          │
│                      │                                               │
│                      │                                               │
└──────────────────────┴───────────────────────────────────────────────┘
```

There is no permanent global sidebar in V1.

## 2. App header

Purpose:

- return to Map Library;
- identify app;
- keep product-level navigation extremely small.

Recommended desktop structure:

```text
M-Bedrock                                             •••
```

When a map is open, the primary back/navigation belongs in the Map header rather than expanding the global header.

Height target:

- 44–52 px;
- visually quiet;
- no large branding lockup;
- no status dashboards.

## 3. Map header

Recommended:

```text
← Maps   Blitz Build v1.0.2
         Bedrock · 1.26.32

         Review   History                      Analyze   •••
```

### Rules

- map name is the dominant label;
- version/runtime is secondary;
- Review and History are the only visible primary destinations;
- Analyze is the only persistent primary action;
- `•••` contains secondary/advanced surfaces.

### Height

Preferred total:

- 76–92 px desktop;
- may collapse to 64–72 px on compact width.

Avoid oversized hero headers.

## 4. Main desktop split

Preferred width proportions:

```text
Review list    34–40%
Detail         60–66%
```

Default target:

```text
360–420 px list pane
remaining width detail pane
```

Constraints:

- minimum list width: ~320 px;
- maximum list width: ~460 px;
- detail minimum comfortable width: ~560 px;
- divider may be resizable later, but not required in V1.

Do not persist pane width until users demonstrate a real need.

## 5. Review list pane

### Header

```text
Review
4 need attention

Search...                         Filter
```

The count is descriptive, not a KPI card.

### Vertical order

```text
Needs attention
  rows...

Verified / understood
  rows...
```

Only render non-empty sections.

### Sticky behavior

Recommended:

- list pane header stays visible;
- Search/Filter stays visible while list scrolls;
- section headings may be sticky only if long lists prove need.

Do not make every section sticky by default.

## 6. Review list row anatomy

Target row height:

- normal: 58–72 px;
- maximum default: 88 px;
- compact rows should remain readable.

Structure:

```text
●  Player can affect blocks outside the plot
   Confirmed defect · LIVE GAME VERIFIED
```

Optional right-side metadata:

```text
Critical
```

but only when it materially helps prioritization.

### Row fields

Always:

- state marker/icon;
- human title;
- one secondary state line.

Optional:

- severity;
- proof badge;
- stale marker.

Never in normal row:

- diagnostic ID;
- source file path;
- incident ID;
- evidence count unless it helps user decision;
- graph node count;
- timestamp unless History mode.

### Row interaction

- entire row clickable;
- selected row visually clear;
- keyboard focus distinct from selection;
- no nested action buttons inside rows in V1.

Avoid row-level `•••` until a repeated need exists.

## 7. Selected item detail pane

Default content width inside detail:

- preferred readable text column: 640–760 px;
- pane may be wider, but prose should not stretch full width.

Recommended horizontal padding:

- 28–36 px desktop;
- 20–24 px compact desktop/tablet;
- 16 px small screen.

## 8. Detail header

```text
Player can affect blocks outside the build plot

Critical   Confirmed defect   LIVE GAME VERIFIED
```

Rules:

- title can wrap to two lines;
- classification badge more important than diagnostic code;
- maximum default badge count: 3;
- if more metadata exists, move it lower.

Primary action should appear near the first actionable section, not necessarily in a global top-right toolbar.

## 9. Detail section contract

Order is fixed unless a future usability study proves otherwise.

### Section A — What happened

Short.

Preferred:

- 1–3 sentences;
- no raw logs;
- no implementation jargon.

### Section B — Why

Explain:

- violated expected behavior;
- design match;
- evidence limitation;
- compatibility difference.

Should answer why current classification exists.

### Section C — Evidence / certainty

Example:

```text
Evidence
LIVE GAME VERIFIED

3 supporting observations
```

Do not show confidence percentage.

### Section D — Next action

One primary CTA.

Example:

```text
Next action
[ Review repair ]

This change has not been applied yet.
```

Secondary action may appear as a text/button beside or below only when necessary.

### Section E — Contextual modules

Only modules relevant to current item appear:

- Validation;
- Repair;
- Possible cause;
- Affected area;
- Evidence collection.

Do not reserve empty card slots.

### Section F — Technical details

Collapsed.

```text
Technical details ▸
```

Inside:

- source;
- diagnostic definition;
- IDs;
- fingerprints;
- decision basis;
- raw evidence references.

## 10. Section visual treatment

Prefer simple sections:

```text
Heading
content

divider

Heading
content
```

Avoid wrapping every section in a separate card.

Use cards only when the content is independently actionable, for example:

- stale proof warning;
- runtime evidence task;
- repair preview.

## 11. Priority summary

At top of Review list or above list:

```text
4 need attention
1 blocking proof · 1 confirmed · 2 need evidence
```

Do not create 4 separate KPI cards.

Compact summary only.

## 12. Blocking proof presentation

Prominent but concise:

```text
Test result is outdated

The map changed after this test was run.

[ Re-run validation ]
```

Do not mix stale proof with defect severity.

## 13. Unknown / unclear intent presentation

Use neutral-warning treatment, not red defect styling.

```text
Intended behavior is unclear

Conflicting evidence was found about reconnect behavior.

[ Clarify behavior ]
```

This must not resemble a confirmed defect.

## 14. Designed behavior presentation

Low-noise positive/neutral state.

```text
Designed behavior

The observed behavior matches the authored rule.
```

Do not over-celebrate with large green success cards.

## 15. Validation module

Inside issue detail:

```text
Validation

✓ Static checks
✓ Package validation
○ Multiplayer test required

[ Prepare runtime test ]
```

Rules:

- show only validation relevant to selected item;
- proof level is visible;
- stale result replaces pass display with outdated state;
- technical run IDs remain hidden.

## 16. Repair module

```text
Repair

Available
Change session cleanup ordering
Affected scope: Arena session lifecycle

[ Review repair ]
```

After application:

```text
Repair applied
Needs validation

[ Validate ]
```

Never present an applied repair as verified.

## 17. Evidence collection module

```text
Runtime test required

M-Bedrock needs multiplayer runtime evidence before this
can be classified as a confirmed defect.

[ Prepare test ]
```

After evidence ingestion:

- remain on same item;
- refresh classification;
- show changed state subtly.

## 18. History layout

Single-column timeline/list.

Recommended width:

- 720–900 px;
- centered or aligned with main content.

Row:

```text
22:41   Analysis completed
        4 items need attention
```

Selected event may open a detail side panel or inline detail below.

V1 recommendation:

- detail pane on desktop;
- drill-in on small screen.

## 19. Filter popover

Compact, anchored to Filter.

```text
Filter

State
[ Confirmed ] [ Need evidence ] [ Outdated ]

Severity
[ Critical ] [ Medium ] [ Minor ]

Proof
[ Live ] [ Local ] [ Package ] [ Static ]

Type
[ Defect ] [ Diagnostic ] [ Validation ]
```

Avoid nested filter builders in V1.

Footer:

```text
Clear                      Done
```

Changes may apply immediately; Done closes.

## 20. Search

Search input width:

- 180–260 px desktop;
- full width on narrow screens.

Placeholder:

```text
Search review
```

Avoid technical placeholders such as:

```text
Search diagnostics, nodes, predicates...
```

## 21. Empty review state

When map has no actionable issue:

```text
No current issues need attention

M-Bedrock did not find a current confirmed or probable
problem that requires action.

View understood behavior
```

Do not say “Everything is perfect” unless proof supports that claim.

## 22. No runtime proof state

```text
More runtime evidence is needed

Static analysis found a possible issue, but Minecraft runtime
behavior must be observed before M-Bedrock can confirm it.

[ Prepare runtime test ]
```

## 23. Analyze operation state

### First analysis

Center within selected map shell:

```text
Analyzing Blitz Build

Reading gameplay and map structure…
```

Avoid fake progress percentages unless backend provides meaningful progress.

### Re-analysis

Keep current content mounted.

Header:

```text
Analyzing latest map…
```

Primary Analyze button becomes disabled/loading.

Do not blank the Review pane.

## 24. Error placement

Error should appear in the context that failed.

Analysis error:

- top of Review pane or detail area;
- previous review remains visible when safe.

Evidence ingestion error:

- inside Evidence module.

Repair error:

- inside Repair module.

Avoid global error banners for local failures.

## 25. Responsive breakpoints

These are layout behavior targets, not hard framework tokens.

### >= 1100 px

Two-pane desktop.

```text
list 360–420 px
detail remaining
```

### 760–1099 px

Two-pane when possible:

- list 300–340 px;
- tighter detail padding.

If readable detail falls below ~500 px, switch to drill-in.

### < 760 px

Single-pane drill-in.

Review list:

```text
← Maps
Blitz Build
Review   History

Search [Filter]

rows...
```

Selecting item:

```text
← Review

Player can affect blocks...
...
[ Review repair ]
```

Back restores list scroll/filter/selection.

## 26. Small-screen action policy

- primary CTA may be sticky at bottom only if issue detail is long;
- do not create bottom navigation;
- Review/History remain top tabs;
- Technical details should remain collapsed.

## 27. Visual density

Use spacing to express hierarchy, not boxes.

Suggested rhythm:

- page section gap: 24–32 px;
- subsection gap: 14–20 px;
- row vertical padding: 12–16 px;
- metadata gap: 6–8 px.

Avoid excessive 24+ px padding inside every component.

## 28. Typography hierarchy

Suggested relative hierarchy:

- map/page title: 20–24 px;
- issue title: 22–28 px;
- section heading: 13–15 px, semibold;
- body: 13–15 px;
- metadata: 11–12 px;
- technical monospace: 11–12 px.

Do not use tiny 8–9 px interface copy except rare nonessential metadata.

This specifically avoids the old UI tendency toward overly small dense labels.

## 29. Icon policy

Use familiar simple icons only:

- back;
- search;
- filter;
- more;
- warning;
- check;
- history;
- disclosure chevron.

Do not create a bespoke icon for every diagnostic type.

Icons never replace necessary text labels for primary actions.

## 30. Badge policy

Allowed default badge meanings:

- classification;
- severity;
- proof.

Maximum 3 visible badges in detail header.

Rows should generally show 0–2.

Do not convert every metadata field into a pill.

## 31. Primary CTA policy

Each selected issue should resolve to exactly one default CTA derived from backend priority/action state.

Examples:

| State | Primary CTA |
|---|---|
| stale proof | Re-run validation |
| confirmed defect + repair available | Review repair |
| runtime proof required | Prepare runtime test |
| ambiguous intent | Clarify behavior |
| probable defect | Investigate |
| repair applied / unverified | Validate |
| no action required | none |

The UI must not choose a different CTA from canonical review action semantics.

## 32. Secondary actions

Use low-emphasis controls:

- Copy details;
- Open source;
- Export item;
- View validation runs.

Prefer `•••` or small text buttons.

Do not let secondary actions compete with primary CTA.

## 33. Map-level ••• menu

Candidate V1:

```text
Map information
Validation runs
Raw analysis
Export review
Settings
```

Possible later:

- Compare version;
- Open source folder;
- Developer tools.

Do not add until backed by workflow need.

## 34. State preservation rules

When switching Review ↔ History:

- retain selected review item;
- retain review scroll;
- retain filters/search.

When opening Technical details:

- do not reset detail scroll unexpectedly.

After Analyze:

- preserve selection if item identity survives;
- if item classification changes, update in place;
- if item disappears, explain and return gracefully.

## 35. Animation policy

Subtle only:

- 120–180 ms pane/selection transitions;
- no animated charts;
- no decorative loading loops;
- no spring physics for ordinary lists.

Analysis progress may use a subtle indeterminate indicator.

## 36. Skeleton policy

Prefer text/status loading over many skeleton cards.

Use skeletons only for:

- list rows during initial load;
- issue detail when selection resolves independently.

Do not show a full dashboard skeleton.

## 37. Familiarity test

A user familiar with GitHub Desktop, Linear, VS Code, or Sentry should be able to infer:

- click a row to inspect;
- Review is current work;
- History is chronological past;
- Filter narrows the list;
- `•••` contains secondary options;
- badges summarize state;
- Technical details contains machine-oriented data.

If a control requires explaining M-Bedrock architecture, the design failed.

## 38. Component hierarchy for Svelte

Proposed structure:

```text
App
├── MapLibraryPage
└── MapWorkspace
    ├── MapHeader
    ├── ReviewView
    │   ├── ReviewToolbar
    │   │   ├── SearchField
    │   │   └── FilterPopover
    │   ├── ReviewSplitPane
    │   │   ├── ReviewList
    │   │   │   ├── ReviewSection
    │   │   │   └── ReviewListItem
    │   │   └── ReviewDetail
    │   │       ├── ReviewDetailHeader
    │   │       ├── ExplanationSection
    │   │       ├── ProofSection
    │   │       ├── NextActionSection
    │   │       ├── ValidationModule
    │   │       ├── RepairModule
    │   │       ├── EvidenceModule
    │   │       └── TechnicalDetails
    │   └── ReviewEmptyState
    └── HistoryView
        ├── HistoryTimeline
        └── HistoryEventDetail
```

Do not create a component merely because a file could exist. Split only where behavior/state ownership justifies it.

## 39. UI state ownership

Recommended local presentation state:

```text
selectedReviewItemId
searchQuery
filters
reviewScrollPosition
activePrimaryView: review | history
technicalDetailsOpen
selectedHistoryEventId
```

Operation state may come from backend/bridge.

Never store semantic classification as mutable UI state.

## 40. V1 wireframe acceptance checklist

Before implementing the final Svelte surface:

- no permanent sidebar;
- only Review and History are primary destinations;
- one primary CTA per selected item;
- Review opens by default;
- list/detail desktop layout works at 1100 px;
- drill-in mobile layout works under 760 px;
- technical data is collapsed;
- stale proof has human explanation;
- ambiguous intent is not styled like confirmed defect;
- planned/applied repair is not styled as verified;
- filter is hidden until requested;
- empty/loading/error states are defined;
- selection/filter/scroll survive navigation;
- no charts or KPI card grid;
- no UI-owned diagnostic/priority logic.

## 41. Wireframe principle

```text
One map.
One review list.
One selected issue.
One next action.
```

Anything that does not support this path should be secondary or deferred.
