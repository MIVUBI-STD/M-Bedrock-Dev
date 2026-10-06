# Tooling

Repository-owned developer/build/verification control plane.

```text
tooling/
├─ repository/           repository structure, dependency, ownership and API verification
├─ windows-toolchain/    normal Windows developer routing behind DEV.cmd
├─ bug-report-documents/ report document rendering/build support
└─ bug-report-ui/        Vite/GitHub persistence support for the report UI
```

`DEV.cmd` is the sole root developer entrypoint.

Tooling may invoke canonical owners but must not duplicate Bedrock semantics. `ownership.json` records the canonical tooling partition.
