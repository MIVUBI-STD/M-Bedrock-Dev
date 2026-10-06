---
id: document.analysis.world-db
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

# World Database Analysis

Initial world-database analysis is intentionally conservative.

The first analyzer classifies key representation only:

printable ASCII full key → ascii-named
otherwise → binary
empty → empty

It does not infer chunk, actor, player, or dynamic-property semantics from byte patterns yet.

That semantic work requires dedicated decoders and evidence-backed key layouts.

## Why conservative

Bedrock world DB keys include both named and binary records. A false semantic classification can lead directly to destructive repair if downstream code trusts it.

Unknown binary keys are preserved as bytes and are not eligible for semantic mutation until a dedicated decoder proves the layout.

## Native LevelDB evidence

Artifact inspection may open a dedicated temporary LevelDB snapshot and perform a bounded metadata scan.

The evidence lane records:
- scan status and truncation;
- actor and actor-digest record families;
- recognized chunk-data record families;
- observed dimensions;
- bounded chunk-coordinate signals.

Recognized key families may include actor records, block entities, pending/random ticks, finalized state, subchunks, biome state, generation seed, conversion data, and supported version records.

### Keyspace safety

Key-family recognition does not authorize arbitrary value decoding.

Chunk coordinates and dimension IDs are decoded only when the key shape matches a supported documented layout. Unknown binary keys and values remain opaque.

Native inspection failure is not a gameplay failure by itself; it lowers the available evidence ceiling.

## Native world differential

Two compatible native summaries may be compared across map versions, Minecraft updates, or before/after repair snapshots.

The differential may identify added, removed, or changed actor/chunk/native signals.

A changed count or chunk signal is structural evidence only and is not automatically a gameplay defect.

If either native scan failed or is not comparable, the differential must preserve that limitation explicitly.

## Consumer boundary

World DB evidence may support topology, structure, entity, persistence, or chunk reasoning, but those consumers retain their own proof requirements.

Native storage presence does not prove a command executed, a chunk was ticking, an entity was active, or a gameplay invariant held.