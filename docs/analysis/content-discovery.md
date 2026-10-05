# Content Discovery and First Analyzers

The first Bedrock-aware analysis pass is intentionally cheap and selective.

## Discovery

Physical files are first classified by path/extension hints:

- `manifest.json` → manifest candidate;
- `.mcfunction` → function source;
- `.mcstructure` → specialized structure artifact;
- `.js/.mjs/.ts` → script candidate;
- other JSON → generic structured content candidate.

A manifest path identifies a pack candidate root, but semantic pack type is derived from manifest module declarations.

## Manifest analysis

Manifest analysis preserves `raw` input and exposes a normalized view of:

- format version;
- header UUID/version;
- display metadata;
- minimum engine version;
- module declarations;
- dependencies;
- education metadata flag.

Module types are normalized conservatively. Unknown future module values remain `unknown` rather than being coerced.

## Function analysis

The first `.mcfunction` analyzer intentionally extracts only relationships that support high-value debugging:

- `function` calls;
- `structure load` references;
- scoreboard reads/writes;
- tag add/remove operations.

Every extracted reference retains line-level `SourceRef` evidence.

This parser is not a complete Minecraft command grammar. Unsupported commands remain preserved as command text and can be expanded by evidence-driven analyzers later.

## Structure identifiers

For Add-On structures stored as:

```text
structures/<namespace>/<path>.mcstructure
```

the normalized command identifier is:

```text
<namespace>:<path>
```

This follows Bedrock's pack convention where the namespace is the folder containing the structure under `structures/`. Root-level structure files are retained as unnamespaced candidates rather than assigned an invented namespace.

## Reference resolution

Reference resolution emits one of:

```text
resolved
unresolved
ambiguous
```

It never silently guesses between multiple identifier candidates.
