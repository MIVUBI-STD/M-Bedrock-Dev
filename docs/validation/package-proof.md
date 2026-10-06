---
id: document.validation.package-proof
class: DOCUMENT
domain: validation
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Package Proof

Package proof is distinct from Minecraft runtime proof.

## Level A — deterministic transport proof

The executable synthetic package test verifies:

```text
directory tree
→ deterministic ZIP package
→ artifact fingerprint
→ ZIP inventory
→ safe extraction
→ filesystem inventory
→ pack/function/structure discovery
→ graph/reference diagnostics
```

A separate determinism test packages the same source tree twice and requires identical SHA-256 output.

Synthetic transport proof remains fast and deterministic, but it is not claimed to prove that an artifact is Minecraft-loadable.

## Level B — real-artifact no-op roundtrip proof

For a real `.mcworld` or ZIP artifact:

```text
real artifact
→ safe extraction
→ path + size + SHA-256 inventory
→ deterministic no-op package
→ safe re-extraction
→ path + size + SHA-256 inventory
→ exact extracted-content comparison
```

Run:

```text
npm run cli -- package-roundtrip <map.mcworld>
```

The command fails when a file disappears, appears unexpectedly, changes size, or changes content hash.

This proves package transport preservation only. It does not claim that Minecraft can load the world or that gameplay remains correct.

## Level C — Minecraft runtime acceptance

Minecraft-loadability and gameplay behavior require local/live Minecraft validation.

Runtime-required areas such as chunk residency, entity AI, persistence/reconnect, and cross-version behavior must not be promoted from package proof alone.