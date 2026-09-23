# Pack, Dependency, Version, and Experiment Compatibility Runtime

## Core problem

A map can break after a Minecraft update even when gameplay code did not change.

Possible change surfaces:

```text
Minecraft engine version
manifest format
min_engine_version
behavior/resource pack graph
script module versions
stable vs beta APIs
world experiments
edition differences
JSON schema behavior
command/function compatibility
```

## Effective runtime profile

Every analysis should resolve:

```text
edition
Minecraft version
manifest format
pack UUID/version graph
module UUID/version graph
min_engine_version
@minecraft/server version
other script dependencies
capabilities
enabled experiments
```

Unknown values remain unknown; do not silently assume latest stable.

## Compatibility triage after update

```text
last-known-good profile
        vs
current failing profile
↓
diff engine/module/experiments/manifest
↓
classify compatibility risk
↓
then inspect gameplay logic
```

This avoids rewriting map logic to compensate for a platform-level regression.

## Script API version discipline

Do not validate a symbol only against current documentation. Validate it against the module version declared by the pack.

Major-version changes are treated as compatibility boundaries; beta versions are unstable and require the corresponding experiment state.

## Pack dependency graph

Validate:

- unique pack/header UUIDs
- unique module UUIDs
- required BP/RP pairing
- dependency UUIDs exist
- dependency versions match intended packs
- script modules exist at declared versions
- script entrypoints/modules are coherent

## Experiment discipline

Experiments are part of runtime identity.

```text
same files
+ different experiment profile
=
different effective runtime
```

Do not assume experiment names or availability remain constant across retail and Preview.

## Bedrock vs Education

Edition-sensitive knowledge must be explicit. Compatibility analyzer should report when evidence is Bedrock-only, Education-specific, or shared.

## Supported runtime matrix

Recommended release artifact:

```text
Minecraft version
edition
@minecraft/server version
manifest format
min_engine_version
required experiments
status
known issues
```

## Analyzer diagnostics

- COMPAT_RUNTIME_PROFILE_INCOMPLETE
- COMPAT_PACK_UUID_DUPLICATE
- COMPAT_MODULE_UUID_DUPLICATE
- COMPAT_DEPENDENCY_MISSING
- COMPAT_DEPENDENCY_VERSION_MISMATCH
- COMPAT_SCRIPT_MODULE_VERSION_UNSUPPORTED
- COMPAT_SCRIPT_SYMBOL_VERSION_MISMATCH
- COMPAT_MIN_ENGINE_SEMANTICS_DRIFT
- COMPAT_BETA_API_EXPERIMENT_MISSING
- COMPAT_EXPERIMENT_PROFILE_CHANGED
- COMPAT_PREVIEW_FEATURE_ON_RETAIL_TARGET
- COMPAT_EDITION_ASSUMPTION_UNSCOPED
- COMPAT_UPDATE_ASSUMPTIONS_STALE
- COMPAT_LAST_KNOWN_GOOD_DIFF_MISSING
- COMPAT_SUPPORTED_RUNTIME_MATRIX_MISSING

## Review questions

1. What exact Minecraft version is running?
2. What edition is targeted?
3. What is each pack and module version?
4. What min_engine_version is declared?
5. Which script module versions are requested?
6. Are beta APIs used?
7. Are required experiments enabled?
8. Did any profile field change since last-known-good?
9. Are BP/RP dependency versions aligned?
10. Is this runtime actually in the project's supported matrix?