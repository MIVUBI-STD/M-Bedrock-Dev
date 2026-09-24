# Windows Toolchain

This directory owns the repository-level Windows developer command routing.

`DEV.cmd` is the sole root entrypoint and delegates to `dev.ps1`.

The router must remain thin: semantic product behavior belongs in packages/analyzers/adapters, not PowerShell.

Supported policy is owned by `../../toolchain.json`.


`DEV.cmd doctor` provides a lightweight environment diagnostic for toolchain, branch, dependency-lock, dependency-install, and workspace readiness.
