# Native Chunk Correlation

Artifact inspection now correlates absolute structure-load destinations with chunk coordinates observed in the native LevelDB keyspace.

## Static side

Absolute `/structure load` block coordinates are converted to chunk coordinates using floor division by 16.

Relative/local structure loads are not assigned a static chunk coordinate.

## Native side

The LevelDB metadata lane retains a bounded set of observed chunk signals:

- chunk X/Z;
- dimension ID;
- recognized chunk-data kinds present for that chunk.

The retained list is capped at 1024 chunk signals and reports truncation separately.

## Correlation semantics

A structure destination is matched by X/Z across all observed dimensions.

Dimension is deliberately not inferred from a function command because command execution dimension depends on runtime context.

Therefore correlation means:

> Native world storage contains evidence for this chunk coordinate in one or more dimensions.

It does not mean:

> This exact structure load occurred there or the chunk was ticking when gameplay failed.
