# Source Mutation Detection

Source mutants are now evaluated through the same analyzers used by normal M-Bedrock-Dev inspection.

## Ownership

`packages/reliability-search` generates mutations.

`packages/orchestrator` composes real analyzers to determine whether those mutations are detected.

This avoids making the search package a second parser/analyzer owner.

## Current real detector mappings

### selector-broaden / tag-filter-omit

```text
mutated command
→ command parser
→ state accesses
→ selector scope
→ new broad write?
→ killed
```

### structure/function/objective redirect

```text
mutated command
→ function/reference parser
→ compare against known identifiers
→ new unresolved identifier?
→ killed
```

### coordinate-shift

```text
mutated command inside repeated command fixture
→ topology analysis
→ new linear outlier?
→ killed
```

A coordinate mutation in an isolated command may survive because there is no repeated-layout evidence. That is a meaningful blindspot rather than a forced kill.

## Campaign output

`runCommandMutationCampaign()` returns:

- number of source commands;
- number of generated mutants;
- mutation score report;
- unique survived operator classes.

The survived operator list is intended to feed a blindspot backlog.

## Evidence boundary

Mutation detection compares the mutant with its baseline.

Pre-existing broad writes, unresolved references or topology outliers do not automatically kill a mutant unless the mutation introduces new evidence.
