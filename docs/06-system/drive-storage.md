# Google Drive Storage

Google Drive is the human-facing storage location for map binaries, active map documents, development source, version history, and technical references.

## Canonical map layout

```text
<Map Folder>/
├── <Map Name> vX.Y.Z.mcworld
├── <Map Name> - Guide
├── <Map Name> - Changelog
├── <Map Name> - Bug Report.pdf
├── Development/
│   ├── Source/
│   └── Versions/
└── Technical Docs/
```

Create optional folders only when they contain real content.

## Root

The map root contains active/current material.

### Current world

```text
<Map Name> vMAJOR.MINOR.PATCH.mcworld
```

Location in the root means current. Do not add status words such as `latest`, `final`, `new`, `fixed`, or `backup`.

### Guide

Use one active native Google Doc:

```text
<Map Name> - Guide
```

### Changelog

Use one living native Google Doc:

```text
<Map Name> - Changelog
```

It records real version and change history. Do not create one changelog file per version.

### Bug Report

The latest completed human-facing report may live in the root:

```text
<Map Name> - Bug Report.pdf
```

This PDF is a derived published snapshot only. Canonical Bug Report V2 JSON remains in `workspace/reports/` and is the only persisted bug-state authority.

Do not:

- maintain a second canonical JSON in Drive;
- edit a Drive PDF/spreadsheet and treat it as current bug state;
- backfill missing reports for older map versions merely for completeness.

Legacy QA spreadsheets/PDFs are reference/import material only. Current-version recording takes priority.

## Development

Development has only two concepts:

```text
Development/
├── Source/
└── Versions/
```

### Source

`Source/` contains original/raw development material, for example:

- raw or unversioned map;
- raw world export;
- Behavior Pack / Resource Pack source;
- scripts;
- source ZIPs;
- structures and source assets.

A raw map may use:

```text
<Map Name> - Raw Map.mcworld
```

A raw map is not part of numbered version history.

### Versions

`Versions/` contains retained internal test builds and previous stable versions.

There are only two version states.

#### Test

Internal/non-release builds use the `Test` suffix.

When the internal version number is known:

```text
<Map Name> v0.8.0 Test.mcworld
<Map Name> v0.9.0 Test.mcworld
<Map Name> v0.9.5 Test.mcworld
```

If a legacy internal build has no trustworthy version number, keep the known date or identifier and mark it as Test instead of inventing a version:

```text
<Map Name> Test (2026-07-09).mcworld
```

#### Stable

Stable/released versions use plain semantic versions:

```text
<Map Name> v1.0.0.mcworld
<Map Name> v1.0.1.mcworld
<Map Name> v1.0.2.mcworld
```

`v1.0.0` is normally the first stable version. Do not append `Base Version`, `Stable`, or another status label to a normal stable filename.

The latest stable version stays in the map root. Older stable versions stay in `Development/Versions/`.

## Lifecycle

```text
Source / Raw Map
→ v0.x.x Test
→ v1.0.0
→ v1.0.1
→ v1.0.2
→ ...
→ current stable in root
```

Example:

```text
Development/
├── Source/
│   ├── Example Map - Raw Map.mcworld
│   └── raw-packs.zip
└── Versions/
    ├── Example Map v0.8.0 Test.mcworld
    ├── Example Map v0.9.0 Test.mcworld
    ├── Example Map v1.0.0.mcworld
    └── Example Map v1.0.1.mcworld

Example Map v1.1.0.mcworld   ← current in root
```


## Audit target rule

Bug audit is **single-version and closed-scope by default**.

```text
explicitly selected map file
or, when none is explicitly selected,
the single current .mcworld in that map root
→ audit target
```

Rules:

1. Read and analyze only the selected current map version for gameplay behavior.
2. Do not read every file in `Development/Versions/` to reconstruct how the mechanic evolved.
3. Do not use `Development/Source/`, previous versions, old Bug Reports, Technical Docs, other maps, or external references as authority for current gameplay.
4. Historical/source material is archive/reference only unless the user explicitly asks to compare versions or inspect history.
5. A behavior that existed in an older version is not evidence that the selected current version should still behave that way.
6. Client-requested changes in newer versions override older behavior by virtue of the selected current artifact being the audit target.
7. If more than one root `.mcworld` could be current, do not guess. Resolve the exact target first.

For audit purposes:

```text
Selected current .mcworld
→ source of Expected Behavior
→ source of Actual Behavior

Everything else
→ archive only
```

Expected Behavior is reconstructed only from explicit gameplay signals inside that same artifact. If the artifact does not contain enough intent evidence, keep the mechanic unknown. Do not cross-pollinate mechanics between maps or versions.

## New-current-version procedure

When a new stable version becomes current:

```text
1. Move the previous current .mcworld from root to Development/Versions/.
2. Place the new stable .mcworld in root.
3. Keep its filename as <Map Name> vX.Y.Z.mcworld.
4. Update the single Changelog Google Doc.
5. Replace Bug Report.pdf only after a completed audit.
```

Do not delete retained stable history unless explicitly requested.

## Deprecated naming

Do not create these Drive folders or naming concepts:

- `Raw Dev/`
- `Base Map/`
- `Development Builds/`
- `Previous Versions/`
- `Source Files/`
- `Old Version/`
- Alpha/Beta/Release folder trees.

Safely classifiable existing content should be consolidated into `Source/` or `Versions/`.

## Technical Docs

`Technical Docs/` is optional and contains advanced/supporting documents such as game-design references, scoring formulas, technical specifications, building previews, legacy QA references, client references, and technical reviews.

Do not use `Technical Docs/` for map binaries or source packs.

## Multi-level projects

Do not flatten independent levels. Shared active documents may stay at project root. Each level may have its own current world and, only when needed:

```text
Development/
├── Source/
└── Versions/
```

## Project publication gate

M-Bedrock publishes to Drive only from an approved `ProjectApprovalSnapshot`.

Canonical flow:

```text
working project
→ derive readiness
→ user approves
→ immutable ProjectApprovalSnapshot
→ approved
→ ProjectDrivePublishPlan
→ resolve destinationRole through DriveProjectBinding
→ upload approved deliverables only
→ verify file ID/fingerprint
→ ProjectDrivePublishReceipt
→ derive publication completeness
→ drive-published when complete
```

Rules:

1. `ready-for-approval`, `PARTIAL`, and `COMPLETE` are not persisted project states.
2. Per-project Drive folder ownership lives only in `DriveProjectBinding`.
3. Approved deliverables carry semantic `destinationRole`, not arbitrary folder IDs.
4. Files outside the approved snapshot are rejected.
5. Publication completion is derived by comparing approved snapshot deliverables with verified receipt files.
6. Material artifact/report/deliverable changes invalidate active approval/publication proofs.
7. Work Session, project registry, Audit Obligations, semantic evidence, caches, and control-plane state stay outside Drive.

Drive is approved human-facing storage, not the engine/project-state database.
## Drive root

The configured Drive root stays map-centric:

```text
<Category> - <Map Name>/
<Category> - <Map Name>/
...
```

Do not add M-Bedrock system folders to the Drive root.

## Reproduction rules

When organizing a map from scratch:

```text
1. Put the current stable world in the map root.
2. Put raw/unversioned material in Development/Source/.
3. Put internal builds in Development/Versions/ and mark them Test.
4. Put previous stable builds in Development/Versions/ with plain semantic versions.
5. Keep Guide, Changelog, and latest Bug Report in the root when available.
6. Put advanced supporting documents in Technical Docs/.
7. Do not create empty folders.
8. Do not invent missing version numbers.
```

## Operating rule

Prefer the shallowest valid structure:

```text
Source   = where the map came from
Versions = how the map evolved
Root     = what is current
```
