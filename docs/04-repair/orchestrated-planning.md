# Orchestrated Repair Planning

Integrated inspection may expose repair candidates, but inspection never applies them.

## Output states

Each candidate has one status:

- planned — a complete PatchTransaction exists;
- unsupported — diagnostic exists but the current repair engine cannot safely transform it;
- unavailable — planning needs evidence not present in this inspection context, such as the artifact fingerprint.

## Fingerprint boundary

Artifact inspection has a source fingerprint and may emit complete transactions.

Directory-only inspection has no artifact fingerprint by default, so it reports otherwise-repairable findings as unavailable rather than inventing a fingerprint.

## Execute wrapper safety

A spatial effect nested inside execute ... run is not currently auto-repaired.

Replacing the whole source line with only the nested fill/setblock would discard execution context such as selectors, positioning, conditions, dimension, or rotation. Until command-level splicing preserves that wrapper exactly, nested spatial effects remain diagnostic-only.

## Separation

```text
inspect / diagnose
→ repair candidate
→ PatchTransaction (when eligible)
→ STOP

explicit apply workflow
→ verify current fingerprint
→ verify exact command line
→ mutate working copy
→ validate
```

No inspect API implicitly mutates content.
