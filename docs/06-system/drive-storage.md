# Google Drive Storage

Google Drive is the human-facing storage location for map binaries, active map documents, development material, version history, and advanced technical references.

It is not an M-Bedrock database, cache, registry, sync layer, or semantic authority.

## Canonical map layout

```text
<Map Folder>/
├── <Map Name> vX.Y.Z.mcworld
├── <Map Name> - Guide              [Google Doc, when available]
├── <Map Name> - Changelog          [Google Doc]
├── <Map Name> - Bug Report.pdf     [latest completed report, when available]
├── Development/                    [optional]
│   ├── Source/                     [optional]
│   └── Versions/                   [optional]
└── Technical Docs/                 [optional]
```

Do not create empty optional folders.

## Root roles

### Current world

Keep one obvious current world in the map root:

```text
<Map Name> vMAJOR.MINOR.PATCH.mcworld
```

The root location means current. Do not add words such as `latest`, `final`, `new`, `fixed`, or `backup`.

### Guide

The active Guide is a native Google Doc in the root:

```text
<Map Name> - Guide
```

### Changelog

Keep one living native Google Doc:

```text
<Map Name> - Changelog
```

It records version history and known Added / Changed / Fixed / Removed facts. Do not create a changelog file per version.

### Bug Report

The latest generated human-facing report may live in the root:

```text
<Map Name> - Bug Report.pdf
```

Canonical Bug Report V2 JSON remains in Git/workspace.

## Development

`Development/` has only two concepts.

### Source

`Development/Source/` contains the original/raw development material.

This may include:

- the raw/unversioned map;
- raw world exports;
- Behavior Pack / Resource Pack source;
- scripts;
- raw pack ZIPs;
- structures or other source assets.

When a raw map exists, name it clearly:

```text
<Map Name> - Raw Map.mcworld
```

A raw map is not a versioned build.

### Versions

`Development/Versions/` contains every retained world build that has entered the versioning lifecycle but is not the current root build.

Pre-release development builds use an explicit development suffix:

```text
<Map Name> v1.0.0-dev.1.mcworld
<Map Name> v1.0.0-dev.2.mcworld
```

These are Development Builds: snapshots before the corresponding official version is accepted.

The first official version is the Base Version:

```text
<Map Name> v1.0.0 (Base Version).mcworld
```

Later official versions use normal semantic-version naming:

```text
<Map Name> v1.0.1.mcworld
<Map Name> v1.0.2.mcworld
...
```

Do not create separate folders named:

- `Base Map`;
- `Development Builds`;
- `Previous Versions`;
- `Source Files`;
- `Raw Dev`;
- `Old Version`.

## Lifecycle

```text
Raw Map / source material
→ v1.0.0-dev.1
→ v1.0.0-dev.2
→ v1.0.0 (Base Version)
→ v1.0.1
→ v1.0.2
→ ...
→ current version in root
```

When a new current version is accepted:

```text
current v1.1.1
→ v1.1.2 becomes current
→ move v1.1.1 to Development/Versions/
→ place v1.1.2 in root
→ update the single Changelog
→ regenerate Bug Report.pdf only after a completed audit
```

## Technical Docs

`Technical Docs/` is optional and contains advanced/supporting documents such as DAIGON/game-design references, scoring formulas, technical specifications, building previews, legacy QA references, client references, or technical reviews.

Do not use `Technical Docs/` for map binaries or source packs.

## Multi-level projects

Do not flatten independent levels. Shared active documents may stay at project root. Each level may have its own current world and, only when needed, its own `Development/Source` and `Development/Versions`.

## Drive root

The configured Drive root stays map-centric:

```text
<Category> - <Map Name>/
<Category> - <Map Name>/
...
```

Do not add M-Bedrock system folders to the Drive root.

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

## Operating rule

Prefer the shallowest valid structure.

```text
Source
= where the map came from

Versions
= how the map evolved

Root
= what is current
```
