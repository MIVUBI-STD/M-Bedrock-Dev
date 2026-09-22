# Multi-map Impact Planning

One Minecraft update can now be evaluated against a portfolio of map fingerprints.

## Input

```text
MinecraftUpdateDelta
+ Regression Catalog
+ Coverage Catalog
+ N Map Compatibility Fingerprints
```

## Output

```text
PortfolioRetestSummary
├── updateVersion
├── totalMaps
├── affectedMaps
├── unaffectedMaps
└── groups
    ├── P0
    ├── P1
    ├── P2
    └── P3
```

Each map keeps its own full RetestPlan including reasons, affected domains and suggested lanes.

## Why fingerprints

Portfolio planning should not reopen every .mcworld when a valid fingerprint for the exact artifact SHA already exists.

If the artifact changes, the cached fingerprint is stale and must be regenerated.

## Interpretation

P0 does not mean a map is broken. It means the combination of update overlap, historical regressions, runtime-sensitive surfaces and coverage gaps makes it the highest retest priority.

P3 does not mean safe; it means no stronger retest signal is currently known.
