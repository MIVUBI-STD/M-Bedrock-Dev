# Package Proof

Package proof is distinct from Minecraft runtime proof.

The executable package test uses a synthetic mcworld-shaped archive to verify the engine pipeline:

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

The synthetic fixture is intentionally not claimed to be a Minecraft-loadable world. A later acceptance step must use a minimized real Bedrock world and, separately, Minecraft runtime validation.
