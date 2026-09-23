# Minecraft Bedrock / Education Knowledge Base

This directory contains repo-owned, machine-readable domain knowledge.

It is separate from:

- analyzers: interpret project content;
- compatibility: evaluate target compatibility;
- reliability: plan proof/search/retest;
- repair: mutate a working copy.

Knowledge answers a different question:

> What documented or observed Minecraft behavior is relevant to interpreting this content?

## Authority order

1. official Microsoft/Mojang documentation;
2. official samples/templates;
3. curated community research;
4. observed project/runtime behavior.

Lower tiers may add evidence but must not silently override stronger authority.

## Initial catalogs

- `core-bedrock.json`: commands, selectors, scoreboard, entities, events, AI/navigation.
- `education.json`: Education-specific profile knowledge.

This is deliberately a seed, not a claim of complete Minecraft coverage.


## Fact classification

Knowledge now separates provenance-sensitive classes:

- `engine-fact`: documented or observed Minecraft behavior;
- `derived-rule`: a bounded reasoning rule derived from evidence;
- `project-policy`: MIVUBI operational design that must not be presented as a Minecraft engine guarantee.

Project-policy facts require an explicit `project-policy` source. This prevents values such as the arena coverage radius or retry policy from silently becoming engine facts.
