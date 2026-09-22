# Repository Foundation Audit

Reference baselines:

- M-LazyDesigner / Local
- M-LazyBuilder-Plugin / Local

This document records which mature repository patterns are adopted into M-Bedrock-Dev and how they are adapted to its domain.

## Adopted 1:1 engineering patterns

| Mature pattern | M-Bedrock-Dev adaptation |
|---|---|
| Local working authority / main stable authority | same branch model |
| Root AGENTS routing | Bedrock execution contexts + task classes |
| Dedicated GITHUB_RULES | exact-ref, GitHub-first, atomic delivery, failure/STOP policy |
| Stable CONTEXT owner | Bedrock product/architecture facts only |
| Single docs router | seven Bedrock-specific documentation domains |
| Development discipline | evidence-first, first-wrong-owner, minimum complete change |
| Implementation map | exact package/analyzer/tooling owners |
| Skill routing | five bounded Bedrock specialists |
| Single root developer entry | DEV.cmd → PowerShell router |
| Toolchain policy manifest | toolchain.json |
| Current proof vs continuation split | current-validation.md vs next-action.md |
| Experimental lane | Experimental/ is non-production authority |
| Thin interfaces | CLI/future MCP/desktop cannot own Bedrock semantics |
| Source/runtime proof separation | STATIC / PACKAGE / LOCAL GAME / LIVE GAME |
| Selective context loading | context-efficiency.md |
| Categorized logical commits | same commit discipline |
| Security trust-boundary policy | archive/script/NBT/LevelDB/filesystem focus |
| Targeted + integrated verification lanes | repository policy lane + integrated Verify |

## Deliberately not copied

The following are not copied merely for symmetry:

- Blockbench-specific Gateway/Control architecture;
- Paper/Fabric managers;
- Tauri desktop implementation;
- Maven/Gradle/Rust requirements;
- release signing/updater infrastructure;
- MCP runtime/gateway;
- multiple release/distribution workflows;
- local Minecraft acceptance runbooks before local acceptance is actually requested.

These remain deferred until a concrete M-Bedrock-Dev responsibility exists.

## High-end equivalence

Equivalence means matching the mature repositories in:

```text
ownership clarity
execution routing
toolchain authority
documentation hierarchy
security boundaries
developer ergonomics
proof discipline
context efficiency
maintenance discipline
STOP behavior
```

It does not mean copying unrelated implementation complexity.

## Current structural gaps after this alignment

Remaining gaps are domain capability gaps, not repository-foundation gaps:

- compatibility profile implementation;
- specialized NBT/mcstructure parsing;
- LevelDB/world database adapter;
- richer Script API analysis;
- complete Bedrock command grammar;
- future MCP/desktop interfaces if later justified.

Those should be developed one domain at a time under the operating model above.
