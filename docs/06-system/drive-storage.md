# Google Drive Storage

Google Drive is the storage location for map binaries, source-development material, older map versions, and supporting map documents.

It is not an M-Bedrock database, report system, cache, or control plane.

## Authority

```text
Google Drive
  map binaries + source-development storage

workspace/active/<project-id>
  active working state + optional exact Drive pointers

workspace/reports/
  canonical Bug Report V2 handoff

GitHub
  engine + rules + schemas + storage guidance
```

## Root layout

The Drive root stays map-centric:

```text
<Category> - <Map Name>/
<Category> - <Map Name>/
...
```

Do not add M-Bedrock system folders to the Drive root.

Preferred category spelling is consistent within the collection, for example:

```text
Build
Challenge
Find The Button
Minigame
PvP
Skills
```

## Single-map layout

Keep the structure shallow:

```text
<Map Folder>/
├── <Map Name> vX.Y.Z.mcworld
├── Raw Dev/        optional
├── Old Version/    optional
└── Docs/           optional
```

Rules:

- keep one obvious current world in the map root;
- use `Raw Dev/` only for development source/material;
- use `Old Version/` only for superseded world builds;
- use `Docs/` only for map-related guides, scoring formulas, design/client references, or technical documents;
- do not create optional folders when there is no content for them.

## Multi-level or multi-artifact projects

```text
<Project Folder>/
├── Level 1/
│   ├── <current>.mcworld
│   ├── Raw Dev/        optional
│   ├── Old Version/    optional
│   └── Docs/           optional
├── Level 2/
│   └── ...
└── Docs/               optional shared project docs
```

Do not flatten independent levels into one artifact and do not merge unrelated maps merely because their names are similar.

## Naming

Current world:

```text
<Map Name> vMAJOR.MINOR.PATCH.mcworld
```

Avoid status words such as `final`, `final2`, `latest`, `new`, `fixed`, or `backup`.

The current version is identified by location in the map/level root. Superseded versions belong in `Old Version/`.

Preserve original client/source document names unless they are genuinely ambiguous.

## Version lifecycle

```text
current v1.1.1
→ new v1.1.2 arrives
→ move v1.1.1 to Old Version/
→ place v1.1.2 in the map root
```

Do not delete historical worlds unless explicitly requested.

## Raw Dev

Typical contents may include Behavior Packs, Resource Packs, scripts, .mcstructure files, raw pack archives, source assets, and development logs that belong to the map.

Do not use `Raw Dev/` for reports, caches, AI context, extracted analysis state, or temporary ChatGPT files.

## Exact lookup

First access may discover a map by browsing the configured root. Later work should reuse exact IDs when available:

```text
Drive root
→ map folder ID
→ current world file ID + fingerprint
```

Optional local pointers may also remember existing `Raw Dev` and `Old Version` folder IDs.

Search by title is discovery only, not artifact identity.

## What must stay out of Drive

Do not automatically store Bug Report V2 JSON, semantic graphs, analysis caches, AI context, sync receipts, registry metadata, internal runtime state, repository metadata, or temporary extraction.

These belong to GitHub/workspace according to their existing owners.

## ChatGPT rule

ChatGPT may read, upload, replace, move, rename, or organize Drive content only when that operation directly serves the user's map/source storage request.

Do not create Drive-side organizational systems merely to support M-Bedrock internals.
