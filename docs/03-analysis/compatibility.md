# Compatibility Analysis

Compatibility is a first-class semantic concern rather than scattered version checks.

## Separation

```text
manifest/content analyzer
→ extracts compatibility facts

packages/compatibility
→ evaluates edition/version/capability logic

rules/
→ owns evidence-backed capability data

diagnostics
→ explains mismatches/risks
```

A parser should not silently decide that a feature is valid merely because it recognizes the syntax.

## Edition

Current normalized edition values:

```text
bedrock
education
```

Unknown edition should remain unknown at artifact/project classification boundaries until evidence resolves it; compatibility queries require an explicit target edition.

## Tracks

```text
stable
preview
beta
experimental
education-only
unknown
```

Script API beta dependencies are not treated as stable. Microsoft documents that beta API versions use the `-beta` suffix, do not carry the same backwards-compatibility expectations as stable APIs, and require the Beta APIs experiment.

## Manifest role

`min_engine_version` is normalized as a target constraint/fact. Microsoft documents it as the minimum game version required by behavior/resource packs and notes it influences compatibility semantics including commands in MCFunctions.

Manifest format, engine version, Script API dependency version, experiments, and edition must remain separate facts rather than being compressed into one guessed compatibility level.

## Rule growth

Do not build a giant manually-maintained historical matrix up front.

Add capability rules when:

1. an analyzer/validator needs a concrete decision;
2. current authoritative evidence exists;
3. edition/version/track applicability can be stated explicitly;
4. a regression test protects the decision.
