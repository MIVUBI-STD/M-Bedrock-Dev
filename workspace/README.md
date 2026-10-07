# Workspace

Workspace is map-centric. Open one project folder to find its current repository state.

## Root

```text
workspace/
├── README.md
├── drive-root.json
└── projects/
```

- `README.md` owns the workspace navigation contract.
- `drive-root.json` is the single global Google Drive root binding.
- `projects/` contains every game/map project.
- Do not add global report ledgers, publication folders, or project registries. Global indexes are derived from `projects/**/project.json`.

## Single-level project

Use the shallow form when the project has one independently versioned map:

```text
projects/<project-id>/
├── project.json
├── report/
│   ├── bug-report.json
│   └── developer-notes.json   # only when notes exist
├── output/
│   ├── bug-tracker.html
│   └── bug-tracker.json
└── archive/                    # only when retained older versions exist
    └── vX.Y.Z/
        ├── report/             # only historical canonical material that actually exists
        └── output/             # retained historical derived output
```

## Multi-level project

When one game has multiple independently versioned levels, keep one project identity and separate level scopes:

```text
projects/<project-id>/
├── project.json
└── levels/
    ├── level-1/
    │   ├── report/
    │   │   ├── bug-report.json
    │   │   └── developer-notes.json   # only when needed
    │   └── output/
    │       ├── bug-tracker.html
    │       └── bug-tracker.json
    └── level-2/
        ├── report/
        ├── output/
        └── archive/            # version history belongs to this level
```

Do not create `levels/` for a single-level project. Do not flatten independent levels into separate top-level projects.

## Ownership

`project.json`
: Project/game identity and exact Google Drive artifact binding. It is the repository bridge to Drive.

`report/bug-report.json`
: Canonical approved Bug Report V2 state for that map/level.

`report/developer-notes.json`
: Canonical DEV_NOTE state for that map/level. It remains separate from Bug Report V2.

`output/bug-tracker.html`
: Derived human-facing report. Optimize for reading and retest workflow.

`output/bug-tracker.json`
: Derived complete structured projection for developers, tooling, and AI. It is not a second canonical report.

HTML and JSON output are generated from the same validated projection and must contain the same canonical IDs.

## Versioning and archive

`project.json` owns the current version and exact Drive binding. Current `report/` and `output/` always describe that current version.

When an older version must remain in the repository, move its retained report/output material under:

```text
archive/v<version>/
```

For multi-level projects, archive lives inside the matching level. Never create a project-global archive that mixes independently versioned levels.

Archive rules:

- archive is historical/read-only context, never current authority;
- use exact semantic version directory names such as `v1.0.1`;
- do not use `old`, `backup`, `latest`, `final`, or dates as version aliases when a trusted semantic version exists;
- do not backfill missing historical reports or JSON;
- do not create empty archive directories;
- Git history remains the full revision history; archive exists only for historical artifacts intentionally retained for direct navigation;
- current generator never writes into archive.

## Optional project data

Create additional folders only when real content requires them. Do not pre-create empty architecture.

A project being actively modified may use `map/` for project-local source/working material. Evidence may live under `report/evidence/` when it is useful to the report workflow. These locations never replace the selected current .mcworld as gameplay authority.

## Drive relationship

Google Drive remains the human-facing map/source/version store defined by `docs/system/drive-storage.md`.

GitHub and Drive do not mirror folder-for-folder. They synchronize identity:

```text
project.json
↕
Drive map/level folder
↕
current world file ID + version + fingerprint
```

A mismatched file ID, version, or fingerprint is a synchronization error; do not silently accept it.

## Invariants

- One game = one project folder.
- One independently versioned level = one level scope.
- One fact = one canonical owner.
- Current selected .mcworld remains gameplay authority.
- BUG, DESIGN_MISMATCH, DEV_NOTE, and NEED_VALIDATION semantics do not change because of physical storage.
- Current report/output version must match the current project or level binding.
- Older retained versions belong only under the matching `archive/vX.Y.Z/`.
- Output is derived and never read back as canonical report state.
- Git history is revision history; do not add duplicate history ledgers.
- Optional folders exist only when they contain useful data.
- Prefer the shallowest valid structure.
