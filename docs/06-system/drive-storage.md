# Google Drive Storage

Google Drive is the human-facing storage location for map binaries, active map documents, development material, previous builds, and advanced technical references.

It is not an M-Bedrock database, cache, registry, sync layer, or semantic authority.

## Authority

```text
Google Drive
  map/storage surface used by humans and ChatGPT

workspace/active/<project-id>
  active engine working state

workspace/reports/
  canonical Bug Report V2 JSON handoff

GitHub
  engine + rules + schemas + storage guidance
```

## Root collection

The Drive root stays map-centric:

```text
<Category> - <Map Name>/
<Category> - <Map Name>/
...
```

Do not add M-Bedrock system folders to the Drive root.

Use consistent category spelling: Build, Challenge, Find The Button, Minigame, PvP, Skills.

## Canonical single-map layout

```text
<Map Folder>/
├── <Map Name> vX.Y.Z.mcworld
├── <Map Name> - Guide              [Google Doc, when available]
├── <Map Name> - Changelog          [Google Doc]
├── <Map Name> - Bug Report.pdf     [generated latest report, when available]
├── Development/                    [optional]
│   ├── Base Map/                   [optional]
│   ├── Development Builds/         [optional]
│   ├── Previous Versions/          [optional]
│   └── Source Files/               [optional]
└── Technical Docs/                 [optional]
```

Do not create empty optional folders.

## Root file roles

### Current world

`<Map Name> vMAJOR.MINOR.PATCH.mcworld` is the current production/test world. Keep one obvious current world in the map root.

### Guide

The active Guide is a native Google Doc in the map root because it is frequently consulted and edited.

Use `<Map Name> - Guide`.

Do not keep both an active Google Doc and duplicate DOCX Guide in the root after conversion has been verified.

### Changelog

The Changelog is one native Google Doc in the root.

Use `<Map Name> - Changelog`.

It owns human-readable version history and may record Added, Changed, Fixed, and Removed entries when those facts are known. Do not create one Changelog file per version.

### Bug Report

The Drive Bug Report is a generated PDF projection of canonical Bug Report V2 JSON.

Use `<Map Name> - Bug Report.pdf`.

Only the latest completed report belongs in the map root. Do not create a Drive-side Bug Reports history folder. Historical status is summarized in the Changelog; canonical bug state/history remains in Git/workspace.

## Development

`Development/` groups non-current map development material. Create only subfolders that have content.

### Base Map

Use only for a clearly identified clean/raw starting map.

### Development Builds

Use for intermediate or development-log `.mcworld` snapshots that are not released/current versions.

### Previous Versions

Use for superseded released/tested world versions.

### Source Files

Use for raw packs, source ZIPs, scripts, source assets, exported packs, and development logs that are not standalone technical documents.

## Technical Docs

`Technical Docs/` contains advanced/supporting material that is not part of the everyday active root, including DAIGON/game-design source documents, scoring formulas, technical specifications, building previews, legacy QA references, client references, and technical reviews.

Preserve source document names unless a rename is necessary to remove genuine ambiguity.

## Multi-level / multi-artifact projects

Do not flatten independent levels.

Shared active documents may remain at project root, while each level keeps its own current world and only the development hierarchy it actually needs.

```text
<Project Folder>/
├── <Project Name> - Guide           [optional shared Google Doc]
├── <Project Name> - Changelog       [Google Doc]
├── <Project Name> - Bug Report.pdf  [optional latest generated report]
├── Development/                     [optional shared development]
├── Technical Docs/                  [optional shared technical docs]
├── Level 1/
│   ├── <current>.mcworld
│   └── Development/                 [only when level-specific history exists]
└── Level 2/
    └── ...
```

## Naming rules

Current world:

```text
<Map Name> vMAJOR.MINOR.PATCH.mcworld
```

Avoid status words such as `final`, `final2`, `latest`, `new`, `fixed`, or `backup`.

Current status is determined by location in the map/level root. Previous released versions belong under `Development/Previous Versions/`.

## Version lifecycle

```text
current v1.1.1
→ v1.1.2 becomes the new current build
→ move v1.1.1 to Development/Previous Versions/
→ place v1.1.2 in the root
→ update the single Changelog Google Doc
→ regenerate/replace Bug Report.pdf only after a completed audit
```

Do not delete historical worlds unless explicitly requested.

## Exact lookup

Initial access may discover a map by browsing the configured root. Later work should reuse exact map/world IDs when available.

```text
Drive root
→ map folder ID
→ current world file ID + fingerprint
```

Search by title is discovery only, not artifact identity.

## Keep out of Drive

Do not automatically store semantic graphs, analysis caches, AI context, sync receipts, registry metadata, internal runtime state, repository metadata, temporary extraction, or canonical Bug Report V2 JSON in Drive.

## ChatGPT operating rule

ChatGPT may organize Drive content only to serve the user's map/source storage workflow and this layout.

Prefer the shallowest valid structure, preserve existing useful content, avoid duplicate active documents, and never create empty folders merely for symmetry.
