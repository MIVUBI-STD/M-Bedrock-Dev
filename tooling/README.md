# Tooling

Repository-owned developer/build/verification control plane.

```text
windows-toolchain/  normal Windows developer routing
repository/         repository-structure/policy checks
```

`DEV.cmd` is the sole root developer entrypoint.

Tooling may invoke canonical owners but must not duplicate Bedrock semantic logic.
