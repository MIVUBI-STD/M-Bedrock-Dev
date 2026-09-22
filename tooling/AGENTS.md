# Tooling Agent Rules

Applies to repository-owned developer/build/verification tooling.

## Boundary

Tooling orchestrates source owners; it does not own Bedrock semantics.

## Rules

- `DEV.cmd` is the sole root developer command surface.
- `tooling/windows-toolchain/dev.ps1` owns normal Windows command routing.
- Repository verification belongs in `tooling/repository/`.
- Do not create a second task runner.
- Do not embed parser/repair logic into PowerShell or CI YAML.
- Tooling output directories must remain generated/ignored.
- Toolchain policy comes from `toolchain.json`.
- CI remains read-only unless an explicit release/deployment requirement changes that.
