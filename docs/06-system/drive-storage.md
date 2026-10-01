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

Canonical Bug Report V2 JSON remains in Git/workspace.

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
