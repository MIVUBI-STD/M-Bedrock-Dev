# M-Bedrock UI Information Architecture and User Flow

Status: design reference only  
Date: 2026-09-28  
Target: future Svelte review UI

This document defines the intended human interaction model for M-Bedrock before UI implementation. It is not a new semantic authority. Product truth remains in the existing analysis, diagnostic, repair, validation, preservation, and review-projection owners.

## Product UX objective

M-Bedrock should hide system complexity and expose only the decision a user needs to make next.

Primary user questions:

1. What needs attention?
2. Why does it need attention?
3. How certain is M-Bedrock?
4. What is the safest next action?

The UI must not require users to understand Semantic IR, causal-proof internals, decision ledgers, fingerprints, experiment envelopes, diagnostic registries, or repair-provider mechanics before they can work.

## UX success criteria

Default workflow:

```text
Open M-Bedrock
→ choose/open map
→ see Review
→ open highest-priority item
→ understand next action
```

Target interaction budget:

- open an existing map: <= 2 intentional actions;
- reach the highest-priority issue after map load: <= 1 action;
- understand issue state + next action: no navigation required after issue selection;
- reach technical provenance: <= 1 disclosure action;
- return to the issue list without losing list/filter/scroll state: 1 action;
- find prior analysis/repair/validation event: <= 2 actions.

The product should optimize task completion, not navigation depth or feature discoverability.

## Reference interaction grammar

### Linear — list discipline

Adopt:

- list-first work surface;
- filters that refine the current view instead of creating a new mental model;
- URL-shareable filter state where appropriate;
- keyboard navigation for frequent users;
- contextual actions rather than permanent toolbars full of buttons.

Do not copy project-management concepts that do not belong to M-Bedrock.

### Sentry — issue explanation

Adopt:

- issue summary first;
- impact/classification visible near the title;
- evidence and root-cause explanation below;
- technical metadata secondary;
- issue actions located in the issue context.

### VS Code Problems — minimal problem access

Adopt:

- compact problem count;
- list of actionable problems;
- direct navigation to exact source/context;
- simple text/type filtering;
- detailed diagnostics remain available without dominating the initial view.

### GitHub Desktop — simple object + history model

Adopt:

- one selected object at a time;
- list on one side, detail on the other;
- history is a separate simple mode;
- technical complexity is not exposed as navigation hierarchy.

## Explicit lessons from the old LazyBuilder UI

The old launcher has two simultaneous navigation models:

```text
Global:
Servers / Activity / Client / Settings

Selected server:
Overview / Worlds / Plugins / Settings
```

This forces users to learn application scope versus object scope before doing work.

M-Bedrock must not reproduce:

- duplicated settings levels;
- global navigation plus selected-object navigation at the same time;
- large dashboard pages with unrelated operational concerns;
- a permanent Activity page mixing progress, recovery, history, warnings, and technical state;
- infrastructure terminology as primary UI language;
- one page per backend subsystem;
- charts that compete with actionable work.

## Core mental model

The user should understand only:

```text
Maps
→ one selected map
→ Review
→ one selected item
→ next safe action
```

History is the secondary timeline.

Everything else is contextual detail.

## Primary information architecture

### App level

```text
Map Library
└── Selected Map
    ├── Review
    └── History
```

Secondary surfaces are accessed through contextual menus:

```text
•••
├── Map information
├── Validation runs
├── Raw analysis
├── Export
└── Settings
```

No permanent sidebar is required for V1.

## Screen 1 — Map Library

Purpose: choose work, not inspect system status.

### Default layout

```text
M-Bedrock

[ Open map ]

Recent

Blitz Build
Updated 12 min ago
2 need attention

Defense V2
Updated yesterday
No current proof

Beach Bedwars
Updated 2 days ago
Verified
```

### Always visible

- product name;
- Open Map action;
- recent maps;
- one compact current state per map.

### Hidden unless needed

- fingerprint;
- package information;
- full target runtime profile;
- diagnostics count breakdown;
- analyzer revision;
- file inventory.

### Empty state

```text
No maps yet

Open a Minecraft world to inspect its gameplay,
issues, and validation state.

[ Open map ]
```

Do not show tutorials, feature grids, or setup checklists on first use.

## Screen 2 — Review

Review is the selected map home.

### Header

```text
← Maps

Blitz Build v1.0.2
Bedrock · 1.26.32

Review   History                       Analyze
                                         •••
```

Rules:

- map name is the dominant identifier;
- target profile is secondary;
- Analyze is the single primary page action;
- avoid secondary page-level buttons unless the selected item requires them.

### Default structure

Use a two-pane list/detail layout on desktop.

```text
┌──────────────────────┬─────────────────────────────────────┐
│ Needs attention      │ Selected item                       │
│                      │                                     │
│ ● Outside plot       │ Player can build outside the plot   │
│ ● Cleanup proof      │ Critical · Confirmed                │
│ ● Reconnect          │                                     │
│                      │ What happened                       │
│ Other                │ ...                                 │
│ ✓ Designed behavior  │                                     │
│ ✓ Verified           │ Why                                 │
│                      │ ...                                 │
│                      │                                     │
│                      │ Evidence                            │
│                      │ LIVE GAME VERIFIED                  │
│                      │                                     │
│                      │ Next action                         │
│                      │ [ Review repair ]                   │
└──────────────────────┴─────────────────────────────────────┘
```

On narrow layouts, list and detail become drill-in screens while preserving selection and scroll state.

## Review list sections

Only show sections that contain items.

Recommended order:

```text
Needs attention
Verified / understood
```

Do not expose backend categories as top-level sections.

Within Needs attention, use the deterministic review priority already owned by the backend:

1. blocking stale proof;
2. confirmed defects;
3. critical diagnostics;
4. evidence required;
5. probable defects;
6. repair follow-up.

The UI must not recompute this ordering.

## Review row anatomy

Each row should normally contain only:

```text
status marker
human title
one short state line
optional compact proof/state badge
```

Example:

```text
● Player can affect blocks outside the plot
  Confirmed defect · LIVE GAME VERIFIED
```

Do not show by default:

- diagnostic code;
- source path;
- evidence IDs;
- graph node IDs;
- fingerprint;
- incident ID;
- causal candidate count.

## Issue detail information hierarchy

Every issue detail must answer four questions in this order.

### 1. What happened

Human-readable behavior.

Example:

```text
Player can place water outside the build plot.
```

### 2. Why M-Bedrock thinks this matters

Explain the contradiction or reason.

Example:

```text
Runtime evidence contradicts the authored rule that
build interactions are limited to the active plot.
```

### 3. How certain is it

Use canonical states.

Example:

```text
Confirmed defect
LIVE GAME VERIFIED
```

Do not invent percentages.

### 4. What should the user do next

One primary next action.

Examples:

- Review repair
- Collect runtime evidence
- Clarify intended behavior
- Re-run validation
- Re-analyze map

There may be secondary actions, but only one primary CTA.

## Progressive disclosure

### Level 1 — default

Always visible:

- title;
- classification;
- severity when material;
- What happened;
- Why;
- proof level;
- next action.

### Level 2 — expanded

```text
Evidence
Affected area
Related findings
Root-cause explanation
Validation
Repair state
```

### Level 3 — Technical details

Collapsed by default:

```text
Diagnostic code
Diagnostic definition
Source refs
Graph nodes
Evidence IDs
Incident ID
Candidate IDs
Decision basis
Fingerprints
Experiment revision
Contract revision
Raw finding data
```

Technical detail must never be required to understand the issue.

## Public terminology

Prefer:

| Internal concept | User-facing wording |
|---|---|
| DiagnosticFinding | Finding |
| confirmed-defect | Confirmed defect |
| probable-defect | Probable defect |
| designed-behavior | Designed behavior |
| ambiguous-intent | Intended behavior unclear |
| insufficient-evidence | More evidence needed |
| runtime-proof-required | Runtime test required |
| Decision invalidated | Proof is outdated |
| Validation stale | Test result is outdated |
| Evidence recovery | Evidence needs to be collected again |
| CausalIncident | Related issue / root cause context |
| RootCauseCandidate | Possible cause |
| GameplayIntentInvariant | Expected behavior |
| DecisionBasisRevision | Technical proof basis |

Avoid exposing raw identifiers as primary copy.

## Bad terminology

Do not use as primary headings:

- CROSS_SCOPE_STATE_RISK;
- semantic IR;
- causal proof envelope;
- decision basis;
- runtimeExperimentContractRevision;
- invariant registry;
- repair provider;
- graph fingerprint.

These may appear inside Technical details.

## Status and color policy

Color must reinforce state, not create the hierarchy.

Recommended semantic set:

- critical / blocking: red accent;
- warning / evidence needed: amber accent;
- current/verified: green or neutral positive;
- informational/designed behavior: neutral;
- selected item: accent/brand.

Do not assign a unique color to every backend category.

Never rely on color alone.

## Filters

Default toolbar:

```text
Search                         Filter
```

Opening Filter may show:

- State
- Severity
- Proof
- Type

Do not show advanced filters by default.

Advanced filters can live under:

```text
More filters
```

Possible advanced fields:

- diagnostic code;
- source path;
- runtime target;
- evidence channel;
- analysis revision.

Filter state should preserve list selection where possible.

## Search behavior

Search should match human-visible content first:

- title;
- explanation;
- file/source name;
- diagnostic code as fallback.

Do not force users to know IDs.

## Keyboard interaction

Useful but non-required.

Recommended:

- Up/Down or J/K: move selection;
- Enter: open/focus selected item;
- Esc: return from detail / close disclosure;
- F or /: focus filter/search;
- Cmd/Ctrl K: command menu later, only if enough actions justify it.

Mouse-only operation must remain complete.

## Selected item state

Selection is UI state, not domain truth.

Preserve:

- selected issue;
- list scroll position;
- active filter;
- search query;
- open technical disclosure where reasonable.

Re-analysis should not throw the user back to the top unless the selected item no longer exists.

If an item disappears after re-analysis:

```text
This item is no longer present in the latest analysis.

[ Back to review ]
```

## Action model

Actions belong to context.

Bad:

```text
global toolbar:
Analyze
Validate
Repair
Probe
Export
Compare
Refresh
```

Good:

Map header:
```text
Analyze
```

Issue detail:
```text
Review repair
```

Evidence-needed issue:
```text
Prepare runtime test
```

Stale validation:
```text
Re-run validation
```

## Confirmation policy

Do not confirm read-only operations.

No confirmation for:

- analyze;
- filter;
- open detail;
- export;
- inspect technical details.

Confirmation may be required for:

- artifact mutation;
- discarding a working repair;
- deleting user-retained history if ever supported.

Confirmation text must say what changes and whether it is reversible.

## Loading states

Never replace the entire app with an indefinite spinner after a map is already open.

### Initial map load

```text
Analyzing Blitz Build…

Reading gameplay and map structure
```

If meaningful phases are available, show at most one current phase.

Do not expose low-level pipeline steps.

### Re-analysis

Keep previous result visible with a lightweight state:

```text
Analyzing latest map…
```

Disable only actions that would conflict with the operation.

## Error states

Error copy must answer:

1. what failed;
2. whether existing data is still safe/current;
3. what can be done next.

Example:

```text
Analysis could not finish

The previous review is still available, but it does not
include the latest map changes.

[ Try again ]
Technical details ▸
```

Do not dump stack traces or runtime error codes into the default message.

## Unknown / ambiguity states

Unknown is not an error.

Example:

```text
Intended behavior is unclear

M-Bedrock found conflicting evidence about whether reconnect
should resume the current round or reset it.

[ Clarify behavior ]
```

This state should visually differ from a confirmed defect.

## Stale proof state

Use plain language.

Bad:

```text
runtimeExperimentContractRevision invalidated
```

Good:

```text
This test result is outdated

The Minecraft runtime target changed after this test was run.

[ Re-run validation ]
```

Raw reason remains available under Technical details.

## Validation presentation

Validation is contextual by default.

Inside issue detail:

```text
Validation

✓ Static checks
✓ Package validation
○ Multiplayer runtime test required
```

A separate Validation Runs screen may exist under `•••` for advanced/history use.

Do not make Validation a primary navigation tab in V1.

## Repair presentation

Repair should be presented as a controlled progression:

```text
No repair
Repair available
Repair planned
Repair applied
Needs validation
Verified
```

These are presentation summaries derived from canonical repair/proof state, not a new persisted workflow.

Do not imply `Repair applied = Fixed`.

## History

History should be a simple chronological timeline.

```text
Today

22:41  Analysis completed
       4 items need attention

22:22  Validation run
       8 passed · 1 failed

21:58  Repair applied
       Arena cleanup

Yesterday
...
```

Click an event to see details.

Do not combine:

- current operations;
- recovery center;
- warnings;
- all telemetry;
- historical events

into one Activity screen.

If long-running operations later become necessary, show a compact operation indicator in the header and a contextual progress surface.

## Map information

Secondary surface only.

May contain:

- artifact fingerprint;
- file/package summary;
- target edition/version;
- detected packs;
- analysis revision;
- compatibility profile.

This should not compete with Review.

## Raw analysis

Developer/advanced surface only.

Possible content:

- JSON review projection;
- full inspect output;
- diagnostic definitions;
- Semantic IR;
- graph exploration.

The user should never need Raw analysis for ordinary QA work.

## Settings

Avoid a large settings product in V1.

Only add settings after a repeated user preference exists.

Candidate settings:

- appearance;
- default target runtime when not detectable;
- developer details visibility.

Do not add configuration for things the engine can infer safely.

## Responsive behavior

Desktop:
- two-pane list/detail.

Tablet:
- narrower list + detail or drill-in depending width.

Small screen:
- list screen → detail screen;
- sticky back action;
- one primary CTA;
- filters in sheet/popover.

Do not compress desktop information density until text becomes unreadable.

## Accessibility

Required:

- keyboard-accessible list and disclosure controls;
- semantic headings;
- visible focus states;
- status not encoded by color only;
- sufficiently large action targets;
- accessible labels for icon-only controls;
- live region only for meaningful operation completion/errors, not every analysis update.

## Density rules

Default UI should feel compact but not technical.

Recommended hierarchy:

- 1 dominant title per surface;
- 1 primary action per surface;
- maximum 2–3 badges on a row;
- maximum 1 line secondary metadata in list rows;
- detailed metadata moves to detail/technical disclosure.

Avoid grids of KPI cards.

## Dashboard policy

There is no dashboard in V1.

Do not build:

- pie charts;
- severity donut;
- findings by category chart;
- analyzer coverage graph;
- proof percentage gauge.

Only add an aggregate visualization when a demonstrated user decision requires it.

## First-run flow

```text
Open app
→ Open map
→ analysis
→ Review
```

No onboarding wizard unless a real prerequisite exists.

If target runtime cannot be inferred and it materially affects analysis:

```text
Which Minecraft target should this map be checked against?

Bedrock
Education

[ Continue ]
```

Ask only when required.

## Re-analysis flow

```text
Analyze
→ keep current review visible
→ run inspection
→ reconcile item identities
→ update list
→ preserve selection if item survives
```

If prior proof becomes stale, show the reason in context.

## Evidence collection flow

```text
Issue detail
→ Runtime test required
→ Prepare test
→ concise test instructions / generated probe artifact
→ ingest result
→ refresh same issue
```

The user should return to the same issue, not a separate QA module.

## Repair flow

```text
Confirmed issue
→ Review repair
→ show intended change + affected scope + preservation obligations
→ Apply repair
→ validation automatically becomes next action
→ same issue detail shows Needs validation
```

Do not force users through a separate Repair application section.

## History flow

```text
Review
→ History
→ select event
→ inspect event details
→ back
```

History must not change current Review state.

## Navigation anti-patterns

Reject:

- nested permanent sidebars;
- more than two primary tabs;
- duplicated Settings scopes;
- per-subsystem pages;
- landing dashboard before useful work;
- action toolbars unrelated to selection;
- status cards for every backend package;
- nav entries named after architecture components.

## V1 component model

Recommended conceptual components:

```text
AppShell
MapLibrary
MapHeader
ReviewList
ReviewListItem
ReviewDetail
ReviewPrioritySummary
ClassificationBadge
ProofBadge
NextAction
EvidenceSummary
ValidationSummary
RepairSummary
TechnicalDetails
HistoryTimeline
HistoryEventDetail
FilterPopover
SearchField
EmptyState
ErrorState
LoadingState
```

Avoid generic `Card` composition for every piece of information.

Rows, sections, and simple separators should carry most of the interface.

## Data contract boundary

The UI consumes `EngineeringReviewProjection`.

It may additionally receive operation state for currently-running commands.

It must not:

- derive defect classification;
- recompute priority order;
- infer severity;
- decide stale/current proof;
- perform causal grouping;
- authorize repair;
- promote proof levels.

## Acceptance checklist before Svelte implementation

The UI design is ready to implement only if these can be answered without ambiguity:

- What is the first screen?
- What is the selected map home?
- What are the maximum two primary navigation destinations?
- What is the single primary action on each surface?
- Which data belongs in default issue detail?
- Which data is hidden in Technical details?
- How is stale proof explained?
- How is unknown intent distinguished from a bug?
- How does the user return without losing context?
- What happens after Analyze?
- What happens after Apply repair?
- What happens when validation is stale?
- What is explicitly excluded from V1?

## V1 exclusions

Explicitly defer:

- dashboard analytics;
- collaborative comments;
- cloud accounts/auth;
- database-backed issue CRUD;
- multi-user assignment;
- custom workflow builder;
- command palette unless action count proves need;
- customizable dashboards;
- arbitrary saved views;
- notification center;
- plugin marketplace;
- desktop-native shell;
- graph explorer in default UI.

## Design principle

```text
Show the decision, not the machinery.
```

Backend sophistication should reduce user complexity, not surface it.
