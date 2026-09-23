# Script API Usage Inventory

Script API compatibility knowledge is expanded from observed map usage rather than from a broad generated API inventory.

## Per-map inspection

Every `inspect` result includes `scriptApiUsage`.

The inventory records:

- total and unique Script API symbols;
- event and method symbol kinds;
- occurrence count;
- source files;
- `known` versus `unclassified` knowledge state;
- registered rule, stability, and introduction version when known;
- direct versus bounded receiver-inference counts for methods;
- inferred receiver classes.

An unclassified symbol is evidence of missing knowledge, not evidence of a map defect.

## Portfolio inventory

Use the dedicated CLI over one or more real map artifacts:

```bash
npm run cli -- script-usage map-a.mcworld map-b.mcworld map-c.mcworld
```

The portfolio report aggregates symbols across artifacts and records:

- total occurrences;
- number of maps containing each symbol;
- source-file coverage;
- current compatibility-knowledge state;
- `promotionCandidates` for symbols observed in maps but not yet represented by a compatibility rule.

Promotion candidates are ordered by map coverage before raw occurrence count. A method repeated many times in one map therefore does not automatically outrank a method observed across many independent maps.

## Promotion contract

A promotion candidate does not become a compatibility rule automatically.

Before promotion:

1. confirm the receiver/symbol classification;
2. establish official version/stability provenance;
3. add the smallest evidence-backed compatibility rule;
4. add regression coverage;
5. keep the symbol unclassified if historical evidence is insufficient.

This preserves the evidence-first rule used by the rest of M-Bedrock-Dev.

## Current boundary

Portfolio inventory is implemented and repository-verified.

Production-map diagnosis quality is still a separate proof lane. A representative set of real MIVUBI/client maps must be passed through `script-usage` before the resulting promotion candidate distribution can be treated as production evidence.
