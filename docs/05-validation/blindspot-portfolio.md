# Blindspot Portfolio and Operator Effectiveness

Mutation campaigns now feed a portfolio-level detector-improvement view.

## Operator effectiveness

Each operator is summarized across campaigns/maps:

```text
operator
domain
total
killed
survived
invalid
killRate
survivalRate
mapsSeen
```

This makes repeated detector weakness visible even when any one map has few mutants.

## Blindspot aggregation

Survived mutation tasks are deduplicated by:

```text
domain + operator
```

The aggregate retains:

- occurrence count;
- affected maps;
- contributing campaigns;
- highest priority;
- suggested strategies;
- reasons/evidence.

A blindspot that survives on multiple unrelated maps is therefore stronger evidence than a one-off survivor.

## Adaptive search budget

The engine emits `increase`, `maintain`, or `decrease` recommendations per operator.

### Increase

Typical reasons:

- high survival rate;
- same blindspot repeats across campaigns/maps.

### Decrease

Allowed only when:

- kill rate is consistently high;
- enough valid observations exist;
- no active blindspot remains.

Decrease means reduce redundant mutation volume, not remove the operator. Sentinel coverage should remain.

### Maintain

Used when evidence is sparse or mixed.

The generated weight is a bounded search-allocation signal, not a quality score.

## History snapshot

`ReliabilitySearchHistorySnapshot` packages:

- campaign count;
- effectiveness report;
- aggregated blindspots;
- search-budget recommendations.

This is intended to become durable campaign history later without making history files part of semantic source authority.
